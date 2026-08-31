import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
}

const COUNTRY_CODE = 'EC';

/**
 * Syncs Ecuador's national holidays from Nager.Date (https://date.nager.at), a free
 * public holiday API with no API key required. Cities decide individually whether
 * they respect these (City.suspendsOnNationalHolidays) — see StatusService.
 */
@Injectable()
export class HolidaysService implements OnModuleInit {
  private readonly logger = new Logger(HolidaysService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const currentYear = new Date().getUTCFullYear();
    try {
      await this.syncYear(currentYear);
    } catch (error) {
      this.logger.warn(`Holiday sync on startup failed: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async syncUpcomingYears(): Promise<void> {
    const currentYear = new Date().getUTCFullYear();
    for (const year of [currentYear, currentYear + 1]) {
      try {
        await this.syncYear(year);
      } catch (error) {
        this.logger.warn(`Holiday sync failed for ${year}: ${(error as Error).message}`);
      }
    }
  }

  async syncYear(year: number): Promise<number> {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${COUNTRY_CODE}`);
    if (!response.ok) {
      throw new Error(`Nager.Date API returned HTTP ${response.status}`);
    }
    const holidays = (await response.json()) as NagerHoliday[];

    for (const holiday of holidays) {
      const date = new Date(holiday.date);
      await this.prisma.nationalHoliday.upsert({
        where: { date },
        update: { name: holiday.localName, year },
        create: { date, name: holiday.localName, year },
      });
    }

    this.logger.log(`Synced ${holidays.length} feriados nacionales para ${year}`);
    return holidays.length;
  }

  findAll() {
    return this.prisma.nationalHoliday.findMany({ orderBy: { date: 'asc' } });
  }
}
