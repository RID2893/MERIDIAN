/**
 * MERIDIAN - Weather Backend Service
 * Handles EARTH-2 model inference and weather data management
 *
 * Architecture:
 * 1. Primary: NVIDIA EARTH-2 via earth2studio (Python sidecar) or REST API
 * 2. Fallback: OpenWeather API for real-time conditions
 * 3. Mock: Synthetic weather data for development
 *
 * The EARTH-2 models are Python-based, so this service either:
 * - Calls a Python FastAPI sidecar running earth2studio
 * - Uses pre-computed forecasts from a scheduled pipeline
 * - Falls back to mock data in development
 */

import { log } from "./index";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WeatherConditions {
  temperature: number;
  dewPoint: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  windLayers: { altitude: number; speed: number; direction: number; gustSpeed: number }[];
  visibility: number;
  precipitation: number;
  precipitationType: string;
  turbulence: string;
  icing: string;
  thunderstorm: boolean;
  ceiling: number;
  cloudCover: number;
  densityAltitude: number;
  lightning: boolean;
  windshear: boolean;
}

interface WeatherForecast {
  timestamp: string;
  conditions: WeatherConditions;
  confidence: number;
  source: string;
  leadTimeHours: number;
  location: { latitude: number; longitude: number };
}

interface Earth2Config {
  /** URL of the Python earth2studio sidecar service */
  earth2StudioUrl: string;
  /** OpenWeather API key (fallback) */
  openWeatherApiKey: string;
  /** Whether to use mock data */
  useMock: boolean;
}

// ============================================================================
// EARTH-2 SERVICE
// ============================================================================

export class Earth2Service {
  private config: Earth2Config;
  private cache: Map<string, { data: any; expiresAt: number }>;

  constructor(config?: Partial<Earth2Config>) {
    this.config = {
      earth2StudioUrl: process.env.EARTH2_STUDIO_URL || 'http://localhost:8100',
      openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '',
      useMock: process.env.WEATHER_MODE === 'mock' || !process.env.EARTH2_STUDIO_URL,
      ...config
    };
    this.cache = new Map();

    log(`Weather service initialized (mode: ${this.config.useMock ? 'mock' : 'earth2'})`, 'weather');
  }

  /**
   * Get current weather conditions
   */
  async getCurrentWeather(lat: number, lon: number): Promise<WeatherConditions> {
    const cacheKey = `current_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let conditions: WeatherConditions;

    if (this.config.useMock) {
      conditions = this.generateMockConditions(lat, lon);
    } else {
      try {
        // Try EARTH-2 data assimilation first
        conditions = await this.fetchEarth2Current(lat, lon);
      } catch {
        try {
          // Fallback to OpenWeather
          conditions = await this.fetchOpenWeather(lat, lon);
        } catch {
          // Final fallback to mock
          conditions = this.generateMockConditions(lat, lon);
        }
      }
    }

    this.setCache(cacheKey, conditions, 5 * 60 * 1000); // 5 min TTL
    return conditions;
  }

  /**
   * Get 15-day medium range forecast (EARTH-2 Medium Range / Atlas)
   */
  async getMediumRangeForecast(
    lat: number,
    lon: number,
    days: number = 15
  ): Promise<WeatherForecast[]> {
    const cacheKey = `forecast_${lat.toFixed(3)}_${lon.toFixed(3)}_${days}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let forecasts: WeatherForecast[];

    if (this.config.useMock) {
      forecasts = this.generateMockForecast(lat, lon, days);
    } else {
      try {
        forecasts = await this.fetchEarth2Forecast(lat, lon, days);
      } catch {
        forecasts = this.generateMockForecast(lat, lon, days);
      }
    }

    this.setCache(cacheKey, forecasts, 30 * 60 * 1000); // 30 min TTL
    return forecasts;
  }

  /**
   * Get 0-6 hour nowcast (EARTH-2 StormScope)
   */
  async getNowcast(lat: number, lon: number): Promise<WeatherForecast[]> {
    const cacheKey = `nowcast_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let nowcasts: WeatherForecast[];

    if (this.config.useMock) {
      nowcasts = this.generateMockNowcast(lat, lon);
    } else {
      try {
        nowcasts = await this.fetchEarth2Nowcast(lat, lon);
      } catch {
        nowcasts = this.generateMockNowcast(lat, lon);
      }
    }

    this.setCache(cacheKey, nowcasts, 10 * 60 * 1000); // 10 min TTL
    return nowcasts;
  }

  // ============================================================================
  // EARTH-2 API CALLS (Python sidecar)
  // ============================================================================

  /**
   * Fetch current conditions from EARTH-2 Global Data Assimilation (HealDA)
   */
  private async fetchEarth2Current(lat: number, lon: number): Promise<WeatherConditions> {
    const response = await fetch(
      `${this.config.earth2StudioUrl}/api/current?lat=${lat}&lon=${lon}`
    );
    if (!response.ok) throw new Error(`EARTH-2 current: ${response.status}`);
    return response.json();
  }

  /**
   * Fetch medium range forecast from EARTH-2 (Atlas architecture)
   * 15-day forecast across 70+ weather variables
   */
  private async fetchEarth2Forecast(
    lat: number,
    lon: number,
    days: number
  ): Promise<WeatherForecast[]> {
    const response = await fetch(
      `${this.config.earth2StudioUrl}/api/forecast?lat=${lat}&lon=${lon}&days=${days}`
    );
    if (!response.ok) throw new Error(`EARTH-2 forecast: ${response.status}`);
    return response.json();
  }

  /**
   * Fetch nowcast from EARTH-2 StormScope
   * Country-scale, km-resolution, 0-6 hour predictions
   */
  private async fetchEarth2Nowcast(lat: number, lon: number): Promise<WeatherForecast[]> {
    const response = await fetch(
      `${this.config.earth2StudioUrl}/api/nowcast?lat=${lat}&lon=${lon}`
    );
    if (!response.ok) throw new Error(`EARTH-2 nowcast: ${response.status}`);
    return response.json();
  }

  // ============================================================================
  // OPENWEATHER FALLBACK
  // ============================================================================

  private async fetchOpenWeather(lat: number, lon: number): Promise<WeatherConditions> {
    if (!this.config.openWeatherApiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.config.openWeatherApiKey}&units=metric`
    );
    if (!response.ok) throw new Error(`OpenWeather: ${response.status}`);

    const data = await response.json();

    // Transform OpenWeather response to our format
    return {
      temperature: data.main.temp,
      dewPoint: data.main.temp - ((100 - data.main.humidity) / 5),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg || 0,
      windGust: data.wind.gust || data.wind.speed,
      windLayers: [],
      visibility: data.visibility || 10000,
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      precipitationType: data.rain ? 'RAIN' : data.snow ? 'SNOW' : 'NONE',
      turbulence: data.wind.speed > 15 ? 'MODERATE' : data.wind.speed > 10 ? 'LIGHT' : 'NONE',
      icing: data.main.temp < 0 && data.main.humidity > 80 ? 'LIGHT' : 'NONE',
      thunderstorm: data.weather?.some((w: any) => w.id >= 200 && w.id < 300) || false,
      ceiling: data.clouds?.all > 80 ? 2000 : data.clouds?.all > 50 ? 5000 : Infinity,
      cloudCover: data.clouds?.all || 0,
      densityAltitude: this.calculateDensityAltitude(data.main.temp, data.main.pressure, 0),
      lightning: data.weather?.some((w: any) => w.id >= 210 && w.id <= 221) || false,
      windshear: false
    };
  }

  // ============================================================================
  // MOCK DATA GENERATION
  // ============================================================================

  private generateMockConditions(lat: number, lon: number): WeatherConditions {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 20;
    const baseTemp = 25 - Math.abs(lat - 32) * 0.5 + (isNight ? -5 : 3);

    return {
      temperature: baseTemp + (Math.random() - 0.5) * 4,
      dewPoint: baseTemp - 8 + (Math.random() - 0.5) * 3,
      humidity: 55 + (Math.random() - 0.5) * 30,
      pressure: 1013 + (Math.random() - 0.5) * 10,
      windSpeed: 3 + Math.random() * 8,
      windDirection: Math.random() * 360,
      windGust: 5 + Math.random() * 10,
      windLayers: [
        { altitude: 100, speed: 4 + Math.random() * 5, direction: Math.random() * 360, gustSpeed: 0 },
        { altitude: 300, speed: 6 + Math.random() * 8, direction: Math.random() * 360, gustSpeed: 2 },
        { altitude: 500, speed: 8 + Math.random() * 12, direction: Math.random() * 360, gustSpeed: 3 },
      ],
      visibility: 10000 + Math.random() * 20000,
      precipitation: Math.random() < 0.8 ? 0 : Math.random() * 5,
      precipitationType: Math.random() < 0.8 ? 'NONE' : 'RAIN',
      turbulence: Math.random() < 0.7 ? 'NONE' : 'LIGHT',
      icing: 'NONE',
      thunderstorm: false,
      ceiling: 5000 + Math.random() * 20000,
      cloudCover: Math.random() * 60,
      densityAltitude: 2000 + (baseTemp - 15) * 120,
      lightning: false,
      windshear: false
    };
  }

  private generateMockForecast(lat: number, lon: number, days: number): WeatherForecast[] {
    const forecasts: WeatherForecast[] = [];
    const now = new Date();

    for (let d = 0; d < days; d++) {
      for (let h = 0; h < 4; h++) {
        const forecastDate = new Date(now);
        forecastDate.setDate(forecastDate.getDate() + d);
        forecastDate.setHours(h * 6, 0, 0, 0);

        forecasts.push({
          timestamp: forecastDate.toISOString(),
          conditions: this.generateMockConditions(lat, lon),
          confidence: Math.max(0.3, 1 - d * 0.04),
          source: 'MOCK',
          leadTimeHours: d * 24 + h * 6,
          location: { latitude: lat, longitude: lon }
        });
      }
    }

    return forecasts;
  }

  private generateMockNowcast(lat: number, lon: number): WeatherForecast[] {
    const nowcasts: WeatherForecast[] = [];
    const now = new Date();

    for (let m = 0; m <= 360; m += 15) {
      const forecastDate = new Date(now.getTime() + m * 60 * 1000);

      nowcasts.push({
        timestamp: forecastDate.toISOString(),
        conditions: this.generateMockConditions(lat, lon),
        confidence: Math.max(0.6, 1 - (m / 360) * 0.35),
        source: 'MOCK',
        leadTimeHours: m / 60,
        location: { latitude: lat, longitude: lon }
      });
    }

    return nowcasts;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private calculateDensityAltitude(tempC: number, pressureHpa: number, elevationFt: number): number {
    const standardTemp = 15 - (elevationFt * 0.002);
    const tempDeviation = tempC - standardTemp;
    const pressureAltitude = (1013.25 - pressureHpa) * 30 + elevationFt;
    return pressureAltitude + (120 * tempDeviation);
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });

    // Evict old entries periodically
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (v.expiresAt < now) this.cache.delete(k);
      }
    }
  }

  /** Get service health status */
  getStatus(): { mode: string; cacheSize: number; earth2Available: boolean } {
    return {
      mode: this.config.useMock ? 'mock' : 'earth2',
      cacheSize: this.cache.size,
      earth2Available: !this.config.useMock
    };
  }
}
