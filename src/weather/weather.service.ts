import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WeatherInfo {
  temperatureC: number;
  precipitationMm: number;
  windSpeedKmh: number;
  weatherCode: number;
  description: string;
  isBadWeather: boolean;
}

/** WMO weather codes: 51+ covers drizzle, rain, snow and thunderstorms. */
const BAD_WEATHER_CODE_THRESHOLD = 51;
const BAD_WEATHER_PRECIPITATION_MM = 0.5;
const BAD_WEATHER_WIND_KMH = 40;

const WEATHER_CODE_DESCRIPTIONS: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  56: 'Llovizna helada',
  57: 'Llovizna helada intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  66: 'Lluvia helada',
  67: 'Lluvia helada intensa',
  71: 'Nevada ligera',
  73: 'Nevada moderada',
  75: 'Nevada intensa',
  77: 'Granizo',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos violentos',
  85: 'Chubascos de nieve ligeros',
  86: 'Chubascos de nieve intensos',
  95: 'Tormenta eléctrica',
  96: 'Tormenta eléctrica con granizo',
  99: 'Tormenta eléctrica con granizo intenso',
};

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

@Injectable()
export class WeatherService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeatherForCity(slug: string): Promise<WeatherInfo> {
    const city = await this.prisma.city.findUnique({ where: { slug } });
    if (!city) {
      throw new NotFoundException(`City "${slug}" not found`);
    }
    if (city.latitude == null || city.longitude == null) {
      throw new NotFoundException(`City "${slug}" has no coordinates configured`);
    }
    return this.getWeatherForCoords(city.latitude, city.longitude);
  }

  async getWeatherForCoords(latitude: number, longitude: number): Promise<WeatherInfo> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set('current', 'temperature_2m,precipitation,weather_code,wind_speed_10m');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo request failed with status ${response.status}`);
    }
    const data = (await response.json()) as OpenMeteoResponse;
    const { temperature_2m, precipitation, weather_code, wind_speed_10m } = data.current;

    const isBadWeather =
      weather_code >= BAD_WEATHER_CODE_THRESHOLD ||
      precipitation > BAD_WEATHER_PRECIPITATION_MM ||
      wind_speed_10m > BAD_WEATHER_WIND_KMH;

    return {
      temperatureC: temperature_2m,
      precipitationMm: precipitation,
      windSpeedKmh: wind_speed_10m,
      weatherCode: weather_code,
      description: WEATHER_CODE_DESCRIPTIONS[weather_code] ?? 'Condición desconocida',
      isBadWeather,
    };
  }
}
