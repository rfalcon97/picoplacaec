import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { UpsertDayRuleDto } from './dto/upsert-day-rule.dto';
import { CreateDateExceptionDto } from './dto/create-date-exception.dto';

const CITY_INCLUDE = {
  dayRules: true,
  dateExceptions: { orderBy: { date: 'asc' as const } },
};

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.city.findMany({
      where: { active: true },
      include: CITY_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  findAllForAdmin() {
    return this.prisma.city.findMany({ include: CITY_INCLUDE, orderBy: { name: 'asc' } });
  }

  async findBySlug(slug: string) {
    const city = await this.prisma.city.findUnique({ where: { slug }, include: CITY_INCLUDE });
    if (!city) {
      throw new NotFoundException(`City "${slug}" not found`);
    }
    return city;
  }

  async findById(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id }, include: CITY_INCLUDE });
    if (!city) {
      throw new NotFoundException('City not found');
    }
    return city;
  }

  async create(dto: CreateCityDto) {
    const existing = await this.prisma.city.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`City slug "${dto.slug}" already exists`);
    }
    return this.prisma.city.create({ data: dto, include: CITY_INCLUDE });
  }

  async update(id: string, dto: UpdateCityDto) {
    await this.findById(id);
    return this.prisma.city.update({ where: { id }, data: dto, include: CITY_INCLUDE });
  }

  async upsertDayRule(cityId: string, dto: UpsertDayRuleDto) {
    await this.findById(cityId);
    return this.prisma.dayRule.upsert({
      where: { cityId_weekday: { cityId, weekday: dto.weekday } },
      create: { cityId, weekday: dto.weekday, digits: dto.digits },
      update: { digits: dto.digits },
    });
  }

  async createDateException(cityId: string, dto: CreateDateExceptionDto) {
    await this.findById(cityId);
    const date = new Date(dto.date);
    return this.prisma.dateException.upsert({
      where: { cityId_date: { cityId, date } },
      create: { cityId, date, reason: dto.reason, restrictionActive: dto.restrictionActive ?? false },
      update: { reason: dto.reason, restrictionActive: dto.restrictionActive ?? false },
    });
  }

  async removeDateException(cityId: string, exceptionId: string) {
    const exception = await this.prisma.dateException.findUnique({ where: { id: exceptionId } });
    if (!exception || exception.cityId !== cityId) {
      throw new NotFoundException('Date exception not found for this city');
    }
    await this.prisma.dateException.delete({ where: { id: exceptionId } });
  }
}
