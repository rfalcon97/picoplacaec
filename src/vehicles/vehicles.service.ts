import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

const VEHICLE_INCLUDE = { city: true };

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string) {
    return this.prisma.vehicle.findMany({
      where: { userId },
      include: VEHICLE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOneForUser(userId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id }, include: VEHICLE_INCLUDE });
    if (!vehicle || vehicle.userId !== userId) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  async create(userId: string, dto: CreateVehicleDto) {
    const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
    if (!city) {
      throw new NotFoundException('City not found');
    }
    return this.prisma.vehicle.create({
      data: {
        userId,
        nickname: dto.nickname,
        plateDigit: dto.plateDigit,
        cityId: dto.cityId,
        reminderTime: dto.reminderTime,
      },
      include: VEHICLE_INCLUDE,
    });
  }

  async update(userId: string, id: string, dto: UpdateVehicleDto) {
    await this.findOneForUser(userId, id);
    if (dto.cityId) {
      const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
      if (!city) {
        throw new NotFoundException('City not found');
      }
    }
    return this.prisma.vehicle.update({ where: { id }, data: dto, include: VEHICLE_INCLUDE });
  }

  async remove(userId: string, id: string) {
    await this.findOneForUser(userId, id);
    await this.prisma.vehicle.delete({ where: { id } });
  }
}
