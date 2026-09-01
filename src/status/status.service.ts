import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Weekday } from '../../generated/prisma/client';

const ECUADOR_UTC_OFFSET_HOURS = 5;
const NEXT_RESTRICTION_SEARCH_DAYS = 14;

const WEEKDAY_BY_INDEX: Weekday[] = [
  Weekday.SUNDAY,
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
];

export interface DayStatus {
  date: string;
  restricted: boolean;
  allDay: boolean;
  timeStart: string | null;
  timeEnd: string | null;
  reason: string;
}

interface CityWithRules {
  id: string;
  slug: string;
  name: string;
  allDay: boolean;
  timeStart: string | null;
  timeEnd: string | null;
  suspendsOnNationalHolidays: boolean;
  dayRules: { weekday: Weekday; digits: number[] }[];
  dateExceptions: { date: Date; restrictionActive: boolean; reason: string }[];
}

function toDateOnlyUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** "Today" in Ecuador civil time (fixed UTC-5, no DST), independent of server timezone. */
function ecuadorToday(): Date {
  const shifted = new Date(Date.now() - ECUADOR_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  return toDateOnlyUTC(shifted);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class StatusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A DateException always wins over the weekday DayRule and over national holidays.
   * restrictionActive=false means the restriction is suspended that date (the common
   * case: a local holiday or municipal suspension). restrictionActive=true means the
   * normal weekday rule still applies despite it otherwise looking like an exception day.
   */
  private evaluateDate(city: CityWithRules, plateDigit: number, date: Date, holidays: Set<string>): DayStatus {
    const dateKey = formatDate(date);
    const exception = city.dateExceptions.find((e) => formatDate(toDateOnlyUTC(e.date)) === dateKey);

    if (exception && !exception.restrictionActive) {
      return { date: dateKey, restricted: false, allDay: false, timeStart: null, timeEnd: null, reason: `Excepción: ${exception.reason}` };
    }

    if (!exception && city.suspendsOnNationalHolidays && holidays.has(dateKey)) {
      return { date: dateKey, restricted: false, allDay: false, timeStart: null, timeEnd: null, reason: 'Feriado nacional' };
    }

    const weekday = WEEKDAY_BY_INDEX[date.getUTCDay()];
    const dayRule = city.dayRules.find((r) => r.weekday === weekday);
    const restricted = Boolean(dayRule && dayRule.digits.includes(plateDigit));

    return {
      date: dateKey,
      restricted,
      allDay: restricted && city.allDay,
      timeStart: restricted && !city.allDay ? city.timeStart : null,
      timeEnd: restricted && !city.allDay ? city.timeEnd : null,
      reason: restricted ? 'Restricción por horario habitual' : 'Sin restricción',
    };
  }

  private async holidaysInRange(start: Date, end: Date): Promise<Set<string>> {
    const holidays = await this.prisma.nationalHoliday.findMany({ where: { date: { gte: start, lte: end } } });
    return new Set(holidays.map((h) => formatDate(toDateOnlyUTC(h.date))));
  }

  private async buildStatus(city: CityWithRules, plateDigit: number) {
    const today = ecuadorToday();
    const horizonEnd = addDays(today, NEXT_RESTRICTION_SEARCH_DAYS);
    const holidays = await this.holidaysInRange(today, horizonEnd);

    const todayStatus = this.evaluateDate(city, plateDigit, today, holidays);

    let nextRestrictedDate: string | null = todayStatus.restricted ? todayStatus.date : null;
    if (!nextRestrictedDate) {
      for (let i = 1; i <= NEXT_RESTRICTION_SEARCH_DAYS; i++) {
        const candidateStatus = this.evaluateDate(city, plateDigit, addDays(today, i), holidays);
        if (candidateStatus.restricted) {
          nextRestrictedDate = candidateStatus.date;
          break;
        }
      }
    }

    return { today: todayStatus, nextRestrictedDate, city: { id: city.id, slug: city.slug, name: city.name } };
  }

  async statusForCityAndDigit(citySlug: string, plateDigit: number) {
    if (!Number.isInteger(plateDigit) || plateDigit < 0 || plateDigit > 9) {
      throw new BadRequestException('digit must be an integer between 0 and 9');
    }
    const city = await this.prisma.city.findUnique({
      where: { slug: citySlug },
      include: { dayRules: true, dateExceptions: true },
    });
    if (!city) {
      throw new NotFoundException(`City "${citySlug}" not found`);
    }
    return this.buildStatus(city, plateDigit);
  }

  async statusForVehicle(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { city: { include: { dayRules: true, dateExceptions: true } } },
    });
    if (!vehicle || vehicle.userId !== userId) {
      throw new NotFoundException('Vehicle not found');
    }
    const status = await this.buildStatus(vehicle.city, vehicle.plateDigit);
    return {
      vehicleId: vehicle.id,
      nickname: vehicle.nickname,
      plateDigit: vehicle.plateDigit,
      reminderTime: vehicle.reminderTime,
      ...status,
    };
  }

  async statusForAllVehicles(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: { city: { include: { dayRules: true, dateExceptions: true } } },
    });
    return Promise.all(
      vehicles.map(async (vehicle) => {
        const status = await this.buildStatus(vehicle.city, vehicle.plateDigit);
        return {
          vehicleId: vehicle.id,
          nickname: vehicle.nickname,
          plateDigit: vehicle.plateDigit,
          reminderTime: vehicle.reminderTime,
          ...status,
        };
      }),
    );
  }
}
