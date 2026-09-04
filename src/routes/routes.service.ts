import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherInfo, WeatherService } from '../weather/weather.service';
import { PlanRouteDto } from './dto/plan-route.dto';

export interface PlaceSuggestion {
  label: string;
  lat: number;
  lon: number;
}

export interface RouteOption {
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  /** [latitude, longitude] pairs, in traversal order. */
  geometry: [number, number][];
}

export interface RoutePlan {
  weather: WeatherInfo;
  routes: RouteOption[];
}

/** Ecuador-only, and OSM/Nominatim usage policy requires a real contact in the User-Agent. */
const NOMINATIM_USER_AGENT = 'PicoPlacaEC/1.0 (cjaramillo@29deoctubre.fin.ec)';

/** When the weather is bad, ask ORS for this many alternative routes on top of the main one. */
const ALTERNATIVE_ROUTE_TARGET_COUNT = 2;

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface OrsFeature {
  properties: { summary: { distance: number; duration: number } };
  geometry: { coordinates: [number, number][] };
}

interface OrsResponse {
  features: OrsFeature[];
}

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly config: ConfigService,
  ) {}

  async searchPlaces(query: string): Promise<PlaceSuggestion[]> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'ec');

    const response = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
    if (!response.ok) {
      throw new BadGatewayException('No se pudo buscar el lugar');
    }
    const results = (await response.json()) as NominatimResult[];
    return results.map((r) => ({ label: r.display_name, lat: Number(r.lat), lon: Number(r.lon) }));
  }

  async planRoute(dto: PlanRouteDto): Promise<RoutePlan> {
    const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
    if (!city) {
      throw new NotFoundException('City not found');
    }

    const weather = await this.weatherService.getWeatherForCity(city.slug);
    const orsResponse = await this.requestOrsRoute(dto, weather.isBadWeather);

    const routes: RouteOption[] = orsResponse.features.map((feature, index) => ({
      label: index === 0 ? 'Principal' : `Alterna ${index}`,
      distanceMeters: feature.properties.summary.distance,
      durationSeconds: feature.properties.summary.duration,
      geometry: feature.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    }));

    return { weather, routes };
  }

  private async requestOrsRoute(dto: PlanRouteDto, wantAlternatives: boolean): Promise<OrsResponse> {
    const apiKey = this.config.get<string>('ORS_API_KEY');
    if (!apiKey) {
      throw new Error('ORS_API_KEY is not configured');
    }

    const body: Record<string, unknown> = {
      coordinates: [
        [dto.originLng, dto.originLat],
        [dto.destLng, dto.destLat],
      ],
    };
    if (wantAlternatives) {
      body.alternative_routes = { target_count: ALTERNATIVE_ROUTE_TARGET_COUNT, weight_factor: 1.4 };
    }

    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new BadGatewayException('No se pudo calcular la ruta');
    }
    return (await response.json()) as OrsResponse;
  }
}
