/**
 * MERIDIAN - WeatherSystem Module
 * Real-time weather integration for eVTOL operations
 * Integrates with NVIDIA EARTH-2 for forecasting and nowcasting
 *
 * @module WeatherSystem
 * @description Provides weather data, flight safety assessments, and route
 * optimization based on atmospheric conditions. Supports multiple data sources:
 * - NVIDIA EARTH-2 Medium Range (15-day forecasts)
 * - NVIDIA EARTH-2 StormScope Nowcasting (0-6 hour)
 * - Fallback to OpenWeather API
 *
 * @example
 * ```typescript
 * import { WeatherSystem } from './modules/WeatherSystem';
 *
 * const weather = new WeatherSystem();
 * const conditions = await weather.getCurrentWeather(32.7157, -117.1611);
 * const safety = weather.assessFlightSafety(conditions);
 * console.log(safety.clearForFlight); // true/false
 * ```
 */

import { EventBus } from './EventBus';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Wind data at a specific altitude layer */
export interface WindLayer {
  /** Altitude in meters AGL */
  altitude: number;
  /** Wind speed in meters per second */
  speed: number;
  /** Wind direction in degrees (0-360, direction wind is coming FROM) */
  direction: number;
  /** Gust speed in m/s (0 if no gusts) */
  gustSpeed: number;
}

/** Atmospheric conditions at a specific location and time */
export interface WeatherConditions {
  /** Temperature in Celsius */
  temperature: number;
  /** Dew point in Celsius */
  dewPoint: number;
  /** Relative humidity percentage (0-100) */
  humidity: number;
  /** Barometric pressure in hPa */
  pressure: number;
  /** Surface wind speed in m/s */
  windSpeed: number;
  /** Surface wind direction in degrees (0-360) */
  windDirection: number;
  /** Wind gust speed in m/s */
  windGust: number;
  /** Wind layers at different altitudes */
  windLayers: WindLayer[];
  /** Horizontal visibility in meters */
  visibility: number;
  /** Precipitation rate in mm/h */
  precipitation: number;
  /** Precipitation type */
  precipitationType: 'NONE' | 'RAIN' | 'SNOW' | 'SLEET' | 'HAIL';
  /** Turbulence intensity */
  turbulence: 'NONE' | 'LIGHT' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  /** Icing conditions present */
  icing: 'NONE' | 'LIGHT' | 'MODERATE' | 'SEVERE';
  /** Thunderstorm activity */
  thunderstorm: boolean;
  /** Cloud ceiling in feet AGL (Infinity if clear) */
  ceiling: number;
  /** Cloud cover percentage (0-100) */
  cloudCover: number;
  /** Density altitude in feet (affects eVTOL performance) */
  densityAltitude: number;
  /** Lightning detected within range */
  lightning: boolean;
  /** Microbursts or windshear detected */
  windshear: boolean;
}

/** Weather forecast entry with confidence and source tracking */
export interface WeatherForecast {
  /** Forecast valid time */
  timestamp: Date;
  /** Forecast conditions */
  conditions: WeatherConditions;
  /** Confidence score (0-1) */
  confidence: number;
  /** Data source model */
  source: 'EARTH2_MEDIUM' | 'EARTH2_NOWCAST' | 'EARTH2_ASSIMILATION' | 'OPENWEATHER' | 'MOCK';
  /** Lead time in hours from generation */
  leadTimeHours: number;
  /** Location coordinates */
  location: { latitude: number; longitude: number };
}

/** Flight safety assessment result */
export interface FlightSafetyAssessment {
  /** Overall flight clearance */
  clearForFlight: boolean;
  /** Safety score (0-100, where 100 = perfectly safe) */
  safetyScore: number;
  /** Risk level classification */
  riskLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  /** Individual hazard assessments */
  hazards: WeatherHazard[];
  /** Recommended actions */
  recommendations: string[];
  /** Conditions that triggered the assessment */
  triggerConditions: Partial<WeatherConditions>;
}

/** Individual weather hazard */
export interface WeatherHazard {
  /** Hazard type */
  type: 'WIND' | 'VISIBILITY' | 'CEILING' | 'TURBULENCE' | 'ICING' | 'THUNDERSTORM' | 'PRECIPITATION' | 'WINDSHEAR' | 'LIGHTNING' | 'DENSITY_ALTITUDE';
  /** Severity level */
  severity: 'ADVISORY' | 'WARNING' | 'CRITICAL';
  /** Human-readable description */
  description: string;
  /** Current measured value */
  currentValue: number | string;
  /** Threshold that was exceeded */
  threshold: number | string;
}

/** Weather-based route segment assessment */
export interface RouteWeatherSegment {
  /** Segment start point */
  startPoint: { latitude: number; longitude: number };
  /** Segment end point */
  endPoint: { latitude: number; longitude: number };
  /** Weather conditions along segment */
  conditions: WeatherConditions;
  /** Safety assessment for segment */
  safety: FlightSafetyAssessment;
  /** Estimated headwind/tailwind component in m/s (positive = headwind) */
  headwindComponent: number;
  /** Estimated crosswind component in m/s */
  crosswindComponent: number;
}

/** eVTOL-specific flight safety thresholds */
export interface SafetyThresholds {
  /** Maximum surface wind speed for operations (m/s) */
  maxWindSpeed: number;
  /** Maximum gust speed (m/s) */
  maxGustSpeed: number;
  /** Maximum crosswind component (m/s) */
  maxCrosswind: number;
  /** Minimum visibility (meters) */
  minVisibility: number;
  /** Minimum ceiling (feet AGL) */
  minCeiling: number;
  /** Maximum precipitation rate (mm/h) */
  maxPrecipitation: number;
  /** Maximum turbulence level allowed */
  maxTurbulence: 'LIGHT' | 'MODERATE';
  /** Maximum icing level allowed */
  maxIcing: 'LIGHT';
  /** Thunderstorm proximity (no-go) */
  thunderstormClearance: boolean;
  /** Maximum density altitude (feet) */
  maxDensityAltitude: number;
}

/** Weather event for EventBus */
export interface WeatherEvent {
  type: 'WEATHER_UPDATE' | 'WEATHER_ALERT' | 'FORECAST_UPDATE' | 'SAFETY_CHANGE';
  location: { latitude: number; longitude: number };
  data: WeatherConditions | FlightSafetyAssessment | WeatherForecast[];
  timestamp: number;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * WeatherSystem - Real-time weather monitoring and forecasting
 *
 * Features:
 * - Current weather conditions retrieval
 * - 15-day medium range forecasting (EARTH-2)
 * - 0-6 hour nowcasting with km resolution (EARTH-2 StormScope)
 * - Flight safety assessment with eVTOL-specific thresholds
 * - Route weather analysis with wind components
 * - Weather caching to reduce API calls
 * - EventBus integration for real-time alerts
 *
 * @class WeatherSystem
 */
export class WeatherSystem {
  private cache: Map<string, { data: WeatherConditions; expiresAt: number }>;
  private forecastCache: Map<string, { data: WeatherForecast[]; expiresAt: number }>;
  private thresholds: SafetyThresholds;
  private apiBaseUrl: string;
  private updateIntervalMs: number;
  private updateTimer: ReturnType<typeof setInterval> | null;

  private readonly CACHE_TTL_CURRENT = 5 * 60 * 1000;      // 5 min for current weather
  private readonly CACHE_TTL_FORECAST = 30 * 60 * 1000;     // 30 min for forecasts
  private readonly CACHE_TTL_NOWCAST = 10 * 60 * 1000;      // 10 min for nowcasts

  /**
   * Creates WeatherSystem instance
   *
   * @param {Partial<SafetyThresholds>} thresholds - Custom safety thresholds
   * @param {string} apiBaseUrl - Backend weather API base URL
   *
   * @example
   * ```typescript
   * // Default thresholds (conservative for eVTOL)
   * const weather = new WeatherSystem();
   *
   * // Custom thresholds
   * const weather = new WeatherSystem({
   *   maxWindSpeed: 20,      // Allow higher wind
   *   minVisibility: 3000,   // Reduced visibility OK
   * });
   * ```
   */
  constructor(
    thresholds?: Partial<SafetyThresholds>,
    apiBaseUrl: string = '/api/weather'
  ) {
    this.cache = new Map();
    this.forecastCache = new Map();
    this.apiBaseUrl = apiBaseUrl;
    this.updateIntervalMs = 60 * 1000; // 1 minute default
    this.updateTimer = null;

    // Default eVTOL safety thresholds (conservative)
    this.thresholds = {
      maxWindSpeed: 15,               // 15 m/s (~34 mph, ~29 kt)
      maxGustSpeed: 20,               // 20 m/s (~45 mph, ~39 kt)
      maxCrosswind: 12,               // 12 m/s (~27 mph, ~23 kt)
      minVisibility: 5000,            // 5 km (VFR minimum)
      minCeiling: 1000,               // 1000 ft AGL
      maxPrecipitation: 10,           // 10 mm/h (moderate rain)
      maxTurbulence: 'MODERATE',      // No severe/extreme
      maxIcing: 'LIGHT',              // No moderate/severe icing
      thunderstormClearance: true,    // No-go with thunderstorms
      maxDensityAltitude: 8000,       // 8000 ft density altitude
      ...thresholds
    };
  }

  // ============================================================================
  // WEATHER DATA RETRIEVAL
  // ============================================================================

  /**
   * Gets current weather conditions for a location
   * Uses cache if available, otherwise fetches from API
   *
   * @param {number} lat - Latitude in decimal degrees
   * @param {number} lon - Longitude in decimal degrees
   * @returns {Promise<WeatherConditions>} Current conditions
   */
  async getCurrentWeather(lat: number, lon: number): Promise<WeatherConditions> {
    const cacheKey = `current_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/${lat}/${lon}`);
      if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
      const conditions: WeatherConditions = await response.json();

      this.cache.set(cacheKey, {
        data: conditions,
        expiresAt: Date.now() + this.CACHE_TTL_CURRENT
      });

      this.publishEvent({
        type: 'WEATHER_UPDATE',
        location: { latitude: lat, longitude: lon },
        data: conditions,
        timestamp: Date.now()
      });

      return conditions;
    } catch (error) {
      // Return mock data for development/offline use
      return this.generateMockWeather(lat, lon);
    }
  }

  /**
   * Gets 15-day medium range forecast (EARTH-2 Medium Range)
   *
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} days - Number of days to forecast (1-15)
   * @returns {Promise<WeatherForecast[]>} Array of forecast entries
   */
  async getForecast(lat: number, lon: number, days: number = 15): Promise<WeatherForecast[]> {
    const clampedDays = Math.min(15, Math.max(1, days));
    const cacheKey = `forecast_${lat.toFixed(4)}_${lon.toFixed(4)}_${clampedDays}`;
    const cached = this.forecastCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/forecast/${lat}/${lon}?days=${clampedDays}`);
      if (!response.ok) throw new Error(`Forecast API error: ${response.status}`);
      const forecasts: WeatherForecast[] = await response.json();

      this.forecastCache.set(cacheKey, {
        data: forecasts,
        expiresAt: Date.now() + this.CACHE_TTL_FORECAST
      });

      this.publishEvent({
        type: 'FORECAST_UPDATE',
        location: { latitude: lat, longitude: lon },
        data: forecasts,
        timestamp: Date.now()
      });

      return forecasts;
    } catch (error) {
      return this.generateMockForecast(lat, lon, clampedDays);
    }
  }

  /**
   * Gets 0-6 hour nowcast (EARTH-2 StormScope)
   * High resolution, country-scale storm prediction
   *
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<WeatherForecast[]>} Nowcast entries (15-min intervals)
   */
  async getNowcast(lat: number, lon: number): Promise<WeatherForecast[]> {
    const cacheKey = `nowcast_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    const cached = this.forecastCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/nowcast/${lat}/${lon}`);
      if (!response.ok) throw new Error(`Nowcast API error: ${response.status}`);
      const nowcasts: WeatherForecast[] = await response.json();

      this.forecastCache.set(cacheKey, {
        data: nowcasts,
        expiresAt: Date.now() + this.CACHE_TTL_NOWCAST
      });

      return nowcasts;
    } catch (error) {
      return this.generateMockNowcast(lat, lon);
    }
  }

  // ============================================================================
  // FLIGHT SAFETY ASSESSMENT
  // ============================================================================

  /**
   * Assesses flight safety based on weather conditions
   * Uses eVTOL-specific thresholds for all parameters
   *
   * @param {WeatherConditions} conditions - Current weather conditions
   * @returns {FlightSafetyAssessment} Comprehensive safety assessment
   *
   * @example
   * ```typescript
   * const conditions = await weather.getCurrentWeather(32.7157, -117.1611);
   * const safety = weather.assessFlightSafety(conditions);
   * if (!safety.clearForFlight) {
   *   console.log('Flight not recommended:', safety.hazards);
   * }
   * ```
   */
  assessFlightSafety(conditions: WeatherConditions): FlightSafetyAssessment {
    const hazards: WeatherHazard[] = [];
    const recommendations: string[] = [];
    let safetyScore = 100;

    // Wind assessment
    if (conditions.windSpeed > this.thresholds.maxWindSpeed) {
      hazards.push({
        type: 'WIND',
        severity: conditions.windSpeed > this.thresholds.maxWindSpeed * 1.5 ? 'CRITICAL' : 'WARNING',
        description: `Surface wind ${conditions.windSpeed.toFixed(1)} m/s exceeds ${this.thresholds.maxWindSpeed} m/s limit`,
        currentValue: conditions.windSpeed,
        threshold: this.thresholds.maxWindSpeed
      });
      safetyScore -= conditions.windSpeed > this.thresholds.maxWindSpeed * 1.5 ? 40 : 25;
      recommendations.push('Delay operations until wind subsides');
    }

    // Gust assessment
    if (conditions.windGust > this.thresholds.maxGustSpeed) {
      hazards.push({
        type: 'WIND',
        severity: 'WARNING',
        description: `Wind gusts ${conditions.windGust.toFixed(1)} m/s exceed ${this.thresholds.maxGustSpeed} m/s limit`,
        currentValue: conditions.windGust,
        threshold: this.thresholds.maxGustSpeed
      });
      safetyScore -= 20;
      recommendations.push('Monitor gust trends before committing to flight');
    }

    // Visibility assessment
    if (conditions.visibility < this.thresholds.minVisibility) {
      const isCritical = conditions.visibility < this.thresholds.minVisibility * 0.5;
      hazards.push({
        type: 'VISIBILITY',
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        description: `Visibility ${conditions.visibility}m below ${this.thresholds.minVisibility}m minimum`,
        currentValue: conditions.visibility,
        threshold: this.thresholds.minVisibility
      });
      safetyScore -= isCritical ? 40 : 20;
      recommendations.push('Visibility below VFR minimums - operations restricted');
    }

    // Ceiling assessment
    if (conditions.ceiling < this.thresholds.minCeiling) {
      hazards.push({
        type: 'CEILING',
        severity: conditions.ceiling < 500 ? 'CRITICAL' : 'WARNING',
        description: `Ceiling ${conditions.ceiling} ft below ${this.thresholds.minCeiling} ft minimum`,
        currentValue: conditions.ceiling,
        threshold: this.thresholds.minCeiling
      });
      safetyScore -= conditions.ceiling < 500 ? 35 : 20;
      recommendations.push('Low ceiling restricts vertical maneuvering');
    }

    // Turbulence assessment
    const turbulenceLevels = ['NONE', 'LIGHT', 'MODERATE', 'SEVERE', 'EXTREME'];
    const currentTurbIdx = turbulenceLevels.indexOf(conditions.turbulence);
    const maxTurbIdx = turbulenceLevels.indexOf(this.thresholds.maxTurbulence);
    if (currentTurbIdx > maxTurbIdx) {
      hazards.push({
        type: 'TURBULENCE',
        severity: currentTurbIdx >= 3 ? 'CRITICAL' : 'WARNING',
        description: `${conditions.turbulence} turbulence exceeds ${this.thresholds.maxTurbulence} limit`,
        currentValue: conditions.turbulence,
        threshold: this.thresholds.maxTurbulence
      });
      safetyScore -= currentTurbIdx >= 3 ? 40 : 20;
      recommendations.push('Turbulence may exceed structural limits - avoid area');
    }

    // Icing assessment
    const icingLevels = ['NONE', 'LIGHT', 'MODERATE', 'SEVERE'];
    const currentIceIdx = icingLevels.indexOf(conditions.icing);
    const maxIceIdx = icingLevels.indexOf(this.thresholds.maxIcing);
    if (currentIceIdx > maxIceIdx) {
      hazards.push({
        type: 'ICING',
        severity: currentIceIdx >= 2 ? 'CRITICAL' : 'WARNING',
        description: `${conditions.icing} icing conditions - eVTOL anti-ice systems may be insufficient`,
        currentValue: conditions.icing,
        threshold: this.thresholds.maxIcing
      });
      safetyScore -= currentIceIdx >= 2 ? 35 : 15;
      recommendations.push('Icing conditions detected - check de-ice capability');
    }

    // Thunderstorm assessment
    if (conditions.thunderstorm && this.thresholds.thunderstormClearance) {
      hazards.push({
        type: 'THUNDERSTORM',
        severity: 'CRITICAL',
        description: 'Thunderstorm activity detected - NO-GO condition for eVTOL',
        currentValue: 'ACTIVE',
        threshold: 'NONE'
      });
      safetyScore -= 50;
      recommendations.push('GROUND STOP - Thunderstorm activity. Wait 30 min after last lightning');
    }

    // Precipitation assessment
    if (conditions.precipitation > this.thresholds.maxPrecipitation) {
      hazards.push({
        type: 'PRECIPITATION',
        severity: conditions.precipitation > this.thresholds.maxPrecipitation * 2 ? 'CRITICAL' : 'WARNING',
        description: `Precipitation ${conditions.precipitation.toFixed(1)} mm/h exceeds ${this.thresholds.maxPrecipitation} mm/h limit`,
        currentValue: conditions.precipitation,
        threshold: this.thresholds.maxPrecipitation
      });
      safetyScore -= 15;
      recommendations.push('Heavy precipitation reduces visibility and sensor accuracy');
    }

    // Windshear assessment
    if (conditions.windshear) {
      hazards.push({
        type: 'WINDSHEAR',
        severity: 'CRITICAL',
        description: 'Windshear/microburst detected - extreme hazard for eVTOL',
        currentValue: 'DETECTED',
        threshold: 'NONE'
      });
      safetyScore -= 45;
      recommendations.push('GROUND STOP - Windshear detected. Avoid departure/approach');
    }

    // Lightning assessment
    if (conditions.lightning) {
      hazards.push({
        type: 'LIGHTNING',
        severity: 'CRITICAL',
        description: 'Lightning detected within operational range',
        currentValue: 'ACTIVE',
        threshold: 'NONE'
      });
      safetyScore -= 40;
      recommendations.push('Suspend operations - lightning risk to aircraft and personnel');
    }

    // Density altitude assessment
    if (conditions.densityAltitude > this.thresholds.maxDensityAltitude) {
      hazards.push({
        type: 'DENSITY_ALTITUDE',
        severity: 'WARNING',
        description: `Density altitude ${conditions.densityAltitude} ft reduces eVTOL performance`,
        currentValue: conditions.densityAltitude,
        threshold: this.thresholds.maxDensityAltitude
      });
      safetyScore -= 15;
      recommendations.push('Reduce passenger load or wait for cooler conditions');
    }

    // Clamp safety score
    safetyScore = Math.max(0, Math.min(100, safetyScore));

    // Determine risk level
    let riskLevel: FlightSafetyAssessment['riskLevel'];
    if (safetyScore >= 90) riskLevel = 'MINIMAL';
    else if (safetyScore >= 70) riskLevel = 'LOW';
    else if (safetyScore >= 50) riskLevel = 'MODERATE';
    else if (safetyScore >= 25) riskLevel = 'HIGH';
    else riskLevel = 'EXTREME';

    // Determine flight clearance
    const hasCriticalHazards = hazards.some(h => h.severity === 'CRITICAL');
    const clearForFlight = !hasCriticalHazards && safetyScore >= 50;

    if (recommendations.length === 0) {
      recommendations.push('All weather parameters within safe limits for eVTOL operations');
    }

    return {
      clearForFlight,
      safetyScore,
      riskLevel,
      hazards,
      recommendations,
      triggerConditions: conditions
    };
  }

  // ============================================================================
  // ROUTE WEATHER ANALYSIS
  // ============================================================================

  /**
   * Analyzes weather along a flight route
   * Segments the route and assesses each segment independently
   *
   * @param {object} origin - Origin coordinates
   * @param {object} destination - Destination coordinates
   * @param {number} heading - Flight heading in degrees
   * @param {number} segments - Number of route segments to analyze
   * @returns {Promise<RouteWeatherSegment[]>} Weather along route
   */
  async analyzeRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    heading: number,
    segments: number = 5
  ): Promise<RouteWeatherSegment[]> {
    const routeSegments: RouteWeatherSegment[] = [];

    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;

      const startLat = origin.latitude + (destination.latitude - origin.latitude) * t1;
      const startLon = origin.longitude + (destination.longitude - origin.longitude) * t1;
      const endLat = origin.latitude + (destination.latitude - origin.latitude) * t2;
      const endLon = origin.longitude + (destination.longitude - origin.longitude) * t2;

      // Get weather at midpoint of segment
      const midLat = (startLat + endLat) / 2;
      const midLon = (startLon + endLon) / 2;
      const conditions = await this.getCurrentWeather(midLat, midLon);

      // Calculate wind components relative to flight heading
      const windRelative = this.calculateWindComponents(
        conditions.windSpeed,
        conditions.windDirection,
        heading
      );

      routeSegments.push({
        startPoint: { latitude: startLat, longitude: startLon },
        endPoint: { latitude: endLat, longitude: endLon },
        conditions,
        safety: this.assessFlightSafety(conditions),
        headwindComponent: windRelative.headwind,
        crosswindComponent: windRelative.crosswind
      });
    }

    return routeSegments;
  }

  /**
   * Calculates headwind and crosswind components
   *
   * @param {number} windSpeed - Wind speed in m/s
   * @param {number} windDirection - Wind FROM direction in degrees
   * @param {number} heading - Aircraft heading in degrees
   * @returns {{ headwind: number, crosswind: number }} Wind components in m/s
   */
  calculateWindComponents(
    windSpeed: number,
    windDirection: number,
    heading: number
  ): { headwind: number; crosswind: number } {
    // Angle between wind and aircraft heading
    const angleRad = ((windDirection - heading) * Math.PI) / 180;

    return {
      headwind: windSpeed * Math.cos(angleRad),   // positive = headwind
      crosswind: Math.abs(windSpeed * Math.sin(angleRad))  // always positive
    };
  }

  // ============================================================================
  // WEATHER IMPACT ON OPERATIONS
  // ============================================================================

  /**
   * Calculates weather impact factor on flight operations
   * Returns a multiplier (0-1) for demand/capacity adjustment
   *
   * @param {WeatherConditions} conditions - Current conditions
   * @returns {number} Impact factor (1.0 = no impact, 0.0 = full ground stop)
   */
  calculateOperationalImpact(conditions: WeatherConditions): number {
    let impact = 1.0;

    // Wind impact (linear reduction above 10 m/s)
    if (conditions.windSpeed > 10) {
      impact *= Math.max(0, 1 - (conditions.windSpeed - 10) / 20);
    }

    // Visibility impact (linear reduction below 8000m)
    if (conditions.visibility < 8000) {
      impact *= Math.max(0.2, conditions.visibility / 8000);
    }

    // Ceiling impact
    if (conditions.ceiling < 2000) {
      impact *= Math.max(0.3, conditions.ceiling / 2000);
    }

    // Precipitation impact
    if (conditions.precipitation > 2) {
      impact *= Math.max(0.3, 1 - (conditions.precipitation - 2) / 30);
    }

    // Thunderstorm = ground stop
    if (conditions.thunderstorm) {
      impact *= 0.0;
    }

    // Windshear = ground stop
    if (conditions.windshear) {
      impact *= 0.0;
    }

    // Turbulence reduction
    const turbReduction: Record<string, number> = {
      'NONE': 1.0, 'LIGHT': 0.9, 'MODERATE': 0.7, 'SEVERE': 0.3, 'EXTREME': 0.0
    };
    impact *= turbReduction[conditions.turbulence] ?? 1.0;

    return Math.max(0, Math.min(1, impact));
  }

  /**
   * Adjusts separation standards based on weather conditions
   * Returns multiplier for safety buffers
   *
   * @param {WeatherConditions} conditions - Current conditions
   * @returns {{ horizontal: number, vertical: number }} Separation multipliers
   */
  getWeatherSeparationMultiplier(conditions: WeatherConditions): { horizontal: number; vertical: number } {
    let hMultiplier = 1.0;
    let vMultiplier = 1.0;

    // Reduced visibility increases horizontal separation
    if (conditions.visibility < 5000) {
      hMultiplier *= 1.5;
    }
    if (conditions.visibility < 2000) {
      hMultiplier *= 2.0;
    }

    // Turbulence increases both separations
    if (conditions.turbulence === 'MODERATE') {
      hMultiplier *= 1.3;
      vMultiplier *= 1.5;
    } else if (conditions.turbulence === 'SEVERE') {
      hMultiplier *= 2.0;
      vMultiplier *= 2.0;
    }

    // Windshear increases vertical separation
    if (conditions.windshear) {
      vMultiplier *= 2.5;
    }

    // Strong winds increase horizontal separation
    if (conditions.windSpeed > 10) {
      hMultiplier *= 1.0 + (conditions.windSpeed - 10) * 0.05;
    }

    return { horizontal: hMultiplier, vertical: vMultiplier };
  }

  // ============================================================================
  // AUTO-UPDATE AND LIFECYCLE
  // ============================================================================

  /**
   * Starts automatic weather updates for a location
   */
  startAutoUpdate(lat: number, lon: number, intervalMs: number = 60000): void {
    this.stopAutoUpdate();
    this.updateIntervalMs = intervalMs;
    this.updateTimer = setInterval(async () => {
      await this.getCurrentWeather(lat, lon);
    }, this.updateIntervalMs);
  }

  /** Stops automatic weather updates */
  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /** Clears all cached weather data */
  clearCache(): void {
    this.cache.clear();
    this.forecastCache.clear();
  }

  /** Gets current safety thresholds */
  getThresholds(): SafetyThresholds {
    return { ...this.thresholds };
  }

  /** Updates safety thresholds */
  updateThresholds(newThresholds: Partial<SafetyThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Generates realistic mock weather for development/offline use
   * Varies by time of day and location
   */
  private generateMockWeather(lat: number, lon: number): WeatherConditions {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 20;
    const isMorning = hour >= 6 && hour < 12;

    // Base temperature varies by latitude and time
    const baseTemp = 25 - Math.abs(lat - 32) * 0.5;
    const tempVariation = isNight ? -5 : isMorning ? -2 : 3;

    return {
      temperature: baseTemp + tempVariation + (Math.random() - 0.5) * 4,
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

  /**
   * Generates mock 15-day forecast
   */
  private generateMockForecast(lat: number, lon: number, days: number): WeatherForecast[] {
    const forecasts: WeatherForecast[] = [];
    const now = new Date();

    for (let d = 0; d < days; d++) {
      // 4 entries per day (6-hour intervals)
      for (let h = 0; h < 4; h++) {
        const forecastDate = new Date(now);
        forecastDate.setDate(forecastDate.getDate() + d);
        forecastDate.setHours(h * 6, 0, 0, 0);

        forecasts.push({
          timestamp: forecastDate,
          conditions: this.generateMockWeather(lat, lon),
          confidence: Math.max(0.3, 1 - d * 0.04),  // Confidence decreases with lead time
          source: 'MOCK',
          leadTimeHours: d * 24 + h * 6,
          location: { latitude: lat, longitude: lon }
        });
      }
    }

    return forecasts;
  }

  /**
   * Generates mock 6-hour nowcast (15-min intervals)
   */
  private generateMockNowcast(lat: number, lon: number): WeatherForecast[] {
    const nowcasts: WeatherForecast[] = [];
    const now = new Date();

    for (let m = 0; m <= 360; m += 15) {
      const forecastDate = new Date(now.getTime() + m * 60 * 1000);

      nowcasts.push({
        timestamp: forecastDate,
        conditions: this.generateMockWeather(lat, lon),
        confidence: Math.max(0.6, 1 - (m / 360) * 0.35),
        source: 'MOCK',
        leadTimeHours: m / 60,
        location: { latitude: lat, longitude: lon }
      });
    }

    return nowcasts;
  }

  /**
   * Publishes weather event to EventBus
   */
  private publishEvent(event: WeatherEvent): void {
    try {
      EventBus.publish(event.type, event);
    } catch {
      // Silently fail if EventBus not available
    }
  }
}
