/**
 * MERIDIAN - PredictionEngine Module
 * ML-based prediction system for eVTOL traffic management
 * Integrates with WeatherSystem, SafetySystem, and DemandGenerator
 *
 * @module PredictionEngine
 * @description Provides traffic congestion, delay, conflict risk, and demand
 * predictions by combining historical patterns, real-time weather data, and
 * current traffic state. Uses weighted scoring models that can be enhanced
 * with ML model inference when GPU infrastructure is available.
 *
 * @example
 * ```typescript
 * import { PredictionEngine } from './modules/PredictionEngine';
 * import { WeatherSystem } from './modules/WeatherSystem';
 *
 * const weather = new WeatherSystem();
 * const predictions = new PredictionEngine(weather);
 *
 * const congestion = predictions.predictCongestion('SanDiego', 2);
 * console.log(congestion.probability); // 0.72
 * ```
 */

import { EventBus } from './EventBus';
import type { WeatherSystem, WeatherConditions, FlightSafetyAssessment } from './WeatherSystem';
import type { Aircraft } from './SafetySystem';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Prediction result with confidence and contributing factors */
export interface Prediction {
  /** Unique prediction ID */
  id: string;
  /** Prediction type */
  type: 'DELAY' | 'CONGESTION' | 'CONFLICT_RISK' | 'DEMAND' | 'WEATHER_IMPACT';
  /** Probability of event occurring (0-1) */
  probability: number;
  /** Predicted value (context-dependent: minutes for delay, aircraft count for demand, etc.) */
  predictedValue: number;
  /** Prediction timeframe */
  timeframe: { start: Date; end: Date };
  /** Confidence score (0-1) */
  confidence: number;
  /** Factors contributing to prediction */
  factors: PredictionFactor[];
  /** Location context (sector, city, or coordinates) */
  location: string;
  /** Generation timestamp */
  generatedAt: Date;
  /** Model version used */
  modelVersion: string;
}

/** Factor contributing to a prediction */
export interface PredictionFactor {
  /** Factor name */
  name: string;
  /** Factor weight in the model (0-1) */
  weight: number;
  /** Current factor value */
  value: number;
  /** Normalized contribution to prediction (0-1) */
  contribution: number;
  /** Human-readable description */
  description: string;
}

/** Congestion level classification */
export interface CongestionPrediction extends Prediction {
  type: 'CONGESTION';
  /** Expected aircraft density (aircraft per km²) */
  density: number;
  /** Congestion level classification */
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  /** Estimated throughput reduction percentage */
  throughputReduction: number;
  /** Recommended gate capacity adjustment */
  gateCapacityAdjustment: number;
}

/** Delay prediction with breakdown */
export interface DelayPrediction extends Prediction {
  type: 'DELAY';
  /** Expected delay in minutes */
  expectedDelayMinutes: number;
  /** Delay breakdown by cause */
  delayBreakdown: {
    weather: number;       // minutes
    congestion: number;    // minutes
    gateAvailability: number;  // minutes
    airspaceRestriction: number;  // minutes
  };
  /** Probability of exceeding 15-min delay */
  probOver15Min: number;
  /** Probability of exceeding 30-min delay */
  probOver30Min: number;
}

/** Conflict risk prediction for aircraft groups */
export interface ConflictRiskPrediction extends Prediction {
  type: 'CONFLICT_RISK';
  /** Number of predicted conflicts in timeframe */
  expectedConflicts: number;
  /** Risk areas (sector names or coordinates) */
  hotspots: ConflictHotspot[];
  /** Weather contribution to risk */
  weatherRiskFactor: number;
  /** Traffic contribution to risk */
  trafficRiskFactor: number;
}

/** Area with elevated conflict risk */
export interface ConflictHotspot {
  /** Sector or area identifier */
  sector: string;
  /** Center coordinates */
  center: { latitude: number; longitude: number };
  /** Risk score (0-1) */
  riskScore: number;
  /** Primary risk factor */
  primaryFactor: 'DENSITY' | 'WEATHER' | 'CONVERGENCE' | 'ALTITUDE_CONFLICT';
  /** Recommended mitigation */
  mitigation: string;
}

/** Demand forecast with hourly breakdown */
export interface DemandPrediction extends Prediction {
  type: 'DEMAND';
  /** Hourly demand forecast */
  hourlyDemand: { hour: number; flights: number; confidence: number }[];
  /** Weather-adjusted demand (may be lower than base demand) */
  weatherAdjustedDemand: number;
  /** Base demand before weather adjustment */
  baseDemand: number;
}

/** Historical data point for model training */
export interface HistoricalDataPoint {
  timestamp: Date;
  hour: number;
  dayOfWeek: number;
  aircraftCount: number;
  conflictCount: number;
  averageDelay: number;
  weatherConditions: Partial<WeatherConditions>;
  demandLevel: number;
}

/** Prediction model performance metrics */
export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  maeDelay: number;         // Mean Absolute Error for delay predictions
  maeCongestion: number;    // MAE for congestion predictions
  totalPredictions: number;
  correctPredictions: number;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * PredictionEngine - ML-based traffic prediction system
 *
 * Features:
 * - Congestion prediction with weather integration
 * - Delay forecasting with multi-factor analysis
 * - Conflict risk assessment combining weather + traffic density
 * - Demand forecasting with weather impact adjustment
 * - Historical pattern learning (running averages)
 * - Self-evaluating accuracy tracking
 *
 * @class PredictionEngine
 */
export class PredictionEngine {
  private weatherSystem: WeatherSystem | null;
  private historicalData: HistoricalDataPoint[];
  private predictionHistory: Map<string, { prediction: Prediction; actual?: number }>;
  private modelMetrics: ModelMetrics;

  private readonly MAX_HISTORY = 10000;
  private readonly MODEL_VERSION = '1.0.0-heuristic';
  private predictionCounter = 0;

  // Weight configuration for multi-factor models
  private readonly CONGESTION_WEIGHTS = {
    timeOfDay: 0.30,
    dayOfWeek: 0.15,
    currentDensity: 0.25,
    weatherImpact: 0.20,
    historicalPattern: 0.10
  };

  private readonly DELAY_WEIGHTS = {
    weatherSeverity: 0.35,
    congestionLevel: 0.25,
    gateUtilization: 0.20,
    timeOfDay: 0.10,
    historicalDelay: 0.10
  };

  private readonly CONFLICT_WEIGHTS = {
    aircraftDensity: 0.30,
    weatherVisibility: 0.20,
    weatherTurbulence: 0.15,
    convergencePatterns: 0.20,
    historicalConflicts: 0.15
  };

  /**
   * Creates PredictionEngine instance
   *
   * @param {WeatherSystem | null} weatherSystem - Weather system for real-time data
   */
  constructor(weatherSystem: WeatherSystem | null = null) {
    this.weatherSystem = weatherSystem;
    this.historicalData = [];
    this.predictionHistory = new Map();
    this.modelMetrics = {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      maeDelay: 0,
      maeCongestion: 0,
      totalPredictions: 0,
      correctPredictions: 0
    };
  }

  // ============================================================================
  // CONGESTION PREDICTION
  // ============================================================================

  /**
   * Predicts congestion level for a sector/city
   *
   * @param {string} sector - Sector or city name
   * @param {number} hoursAhead - How many hours ahead to predict (0-24)
   * @param {number} currentAircraftCount - Current aircraft in sector
   * @param {WeatherConditions} currentWeather - Current weather (optional)
   * @returns {CongestionPrediction} Congestion prediction
   */
  predictCongestion(
    sector: string,
    hoursAhead: number = 1,
    currentAircraftCount: number = 0,
    currentWeather?: WeatherConditions
  ): CongestionPrediction {
    const now = new Date();
    const targetHour = (now.getHours() + hoursAhead) % 24;
    const targetDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // Convert to 0=Mon

    // Factor 1: Time of day demand pattern
    const hourlyDemandFactor = this.getHourlyDemandFactor(targetHour);

    // Factor 2: Day of week pattern
    const dayFactor = this.getDayOfWeekFactor(targetDay);

    // Factor 3: Current density trend
    const densityFactor = Math.min(1.0, currentAircraftCount / 300); // Normalize to 300 max

    // Factor 4: Weather impact
    let weatherFactor = 0;
    if (currentWeather && this.weatherSystem) {
      const impact = this.weatherSystem.calculateOperationalImpact(currentWeather);
      // Reduced capacity = higher congestion for same demand
      weatherFactor = 1 - impact;
    }

    // Factor 5: Historical average for this time slot
    const historicalFactor = this.getHistoricalCongestion(targetHour, targetDay);

    // Weighted combination
    const probability =
      this.CONGESTION_WEIGHTS.timeOfDay * hourlyDemandFactor +
      this.CONGESTION_WEIGHTS.dayOfWeek * dayFactor +
      this.CONGESTION_WEIGHTS.currentDensity * densityFactor +
      this.CONGESTION_WEIGHTS.weatherImpact * weatherFactor +
      this.CONGESTION_WEIGHTS.historicalPattern * historicalFactor;

    const clampedProbability = Math.max(0, Math.min(1, probability));

    // Classify congestion level
    let level: CongestionPrediction['level'];
    if (clampedProbability < 0.25) level = 'LOW';
    else if (clampedProbability < 0.50) level = 'MODERATE';
    else if (clampedProbability < 0.75) level = 'HIGH';
    else level = 'SEVERE';

    // Calculate throughput reduction
    const throughputReduction = Math.round(clampedProbability * 40); // Max 40% reduction

    // Calculate density
    const density = currentAircraftCount / 20; // aircraft per km² (rough)

    const factors: PredictionFactor[] = [
      { name: 'timeOfDay', weight: this.CONGESTION_WEIGHTS.timeOfDay, value: hourlyDemandFactor, contribution: hourlyDemandFactor * this.CONGESTION_WEIGHTS.timeOfDay, description: `Hour ${targetHour} demand factor: ${hourlyDemandFactor.toFixed(2)}` },
      { name: 'dayOfWeek', weight: this.CONGESTION_WEIGHTS.dayOfWeek, value: dayFactor, contribution: dayFactor * this.CONGESTION_WEIGHTS.dayOfWeek, description: `Day ${targetDay} factor: ${dayFactor.toFixed(2)}` },
      { name: 'currentDensity', weight: this.CONGESTION_WEIGHTS.currentDensity, value: densityFactor, contribution: densityFactor * this.CONGESTION_WEIGHTS.currentDensity, description: `${currentAircraftCount} aircraft (${(densityFactor * 100).toFixed(0)}% capacity)` },
      { name: 'weatherImpact', weight: this.CONGESTION_WEIGHTS.weatherImpact, value: weatherFactor, contribution: weatherFactor * this.CONGESTION_WEIGHTS.weatherImpact, description: `Weather reduces capacity by ${(weatherFactor * 100).toFixed(0)}%` },
      { name: 'historicalPattern', weight: this.CONGESTION_WEIGHTS.historicalPattern, value: historicalFactor, contribution: historicalFactor * this.CONGESTION_WEIGHTS.historicalPattern, description: `Historical congestion: ${(historicalFactor * 100).toFixed(0)}%` }
    ];

    const prediction: CongestionPrediction = {
      id: this.generatePredictionId('CONGESTION'),
      type: 'CONGESTION',
      probability: clampedProbability,
      predictedValue: throughputReduction,
      timeframe: {
        start: now,
        end: new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)
      },
      confidence: this.calculateConfidence(hoursAhead, factors),
      factors,
      location: sector,
      generatedAt: now,
      modelVersion: this.MODEL_VERSION,
      density,
      level,
      throughputReduction,
      gateCapacityAdjustment: level === 'SEVERE' ? -30 : level === 'HIGH' ? -15 : 0
    };

    this.recordPrediction(prediction);
    return prediction;
  }

  // ============================================================================
  // DELAY PREDICTION
  // ============================================================================

  /**
   * Predicts expected delay for a flight
   *
   * @param {string} origin - Origin city/vertiport
   * @param {string} destination - Destination city/vertiport
   * @param {number} departureHour - Planned departure hour (0-23)
   * @param {WeatherConditions} weather - Current weather conditions
   * @param {number} gateUtilization - Gate utilization percentage (0-100)
   * @returns {DelayPrediction} Delay prediction
   */
  predictDelay(
    origin: string,
    destination: string,
    departureHour: number,
    weather?: WeatherConditions,
    gateUtilization: number = 50
  ): DelayPrediction {
    const now = new Date();

    // Weather severity factor
    let weatherSeverity = 0;
    let weatherDelayMin = 0;
    if (weather && this.weatherSystem) {
      const safety = this.weatherSystem.assessFlightSafety(weather);
      weatherSeverity = 1 - (safety.safetyScore / 100);
      // Ground stop adds 30+ min, warnings add 5-15 min
      if (!safety.clearForFlight) weatherDelayMin = 30 + Math.random() * 30;
      else if (safety.hazards.length > 0) weatherDelayMin = safety.hazards.length * 5;
    }

    // Congestion factor
    const congestionFactor = this.getHourlyDemandFactor(departureHour);
    const congestionDelayMin = congestionFactor > 0.7 ? (congestionFactor - 0.7) * 30 : 0;

    // Gate utilization factor
    const gateUtilFactor = gateUtilization / 100;
    const gateDelayMin = gateUtilFactor > 0.8 ? (gateUtilFactor - 0.8) * 50 : 0;

    // Time of day factor
    const timeFactor = this.getHourlyDemandFactor(departureHour);

    // Historical delay for this route
    const historicalDelay = this.getHistoricalDelay(origin, destination, departureHour);

    // Total expected delay
    const totalDelay = weatherDelayMin + congestionDelayMin + gateDelayMin + historicalDelay;

    // Weighted probability calculation
    const probability = Math.min(1.0,
      this.DELAY_WEIGHTS.weatherSeverity * weatherSeverity +
      this.DELAY_WEIGHTS.congestionLevel * (congestionFactor > 0.6 ? 1 : congestionFactor / 0.6) +
      this.DELAY_WEIGHTS.gateUtilization * gateUtilFactor +
      this.DELAY_WEIGHTS.timeOfDay * timeFactor +
      this.DELAY_WEIGHTS.historicalDelay * Math.min(1, historicalDelay / 20)
    );

    const factors: PredictionFactor[] = [
      { name: 'weatherSeverity', weight: this.DELAY_WEIGHTS.weatherSeverity, value: weatherSeverity, contribution: weatherSeverity * this.DELAY_WEIGHTS.weatherSeverity, description: `Weather severity: ${(weatherSeverity * 100).toFixed(0)}% - adds ${weatherDelayMin.toFixed(0)} min` },
      { name: 'congestionLevel', weight: this.DELAY_WEIGHTS.congestionLevel, value: congestionFactor, contribution: congestionFactor * this.DELAY_WEIGHTS.congestionLevel, description: `Traffic congestion factor: ${(congestionFactor * 100).toFixed(0)}%` },
      { name: 'gateUtilization', weight: this.DELAY_WEIGHTS.gateUtilization, value: gateUtilFactor, contribution: gateUtilFactor * this.DELAY_WEIGHTS.gateUtilization, description: `Gate utilization: ${gateUtilization.toFixed(0)}%` },
      { name: 'timeOfDay', weight: this.DELAY_WEIGHTS.timeOfDay, value: timeFactor, contribution: timeFactor * this.DELAY_WEIGHTS.timeOfDay, description: `Hour ${departureHour} demand: ${(timeFactor * 100).toFixed(0)}%` },
      { name: 'historicalDelay', weight: this.DELAY_WEIGHTS.historicalDelay, value: historicalDelay, contribution: Math.min(1, historicalDelay / 20) * this.DELAY_WEIGHTS.historicalDelay, description: `Historical avg delay: ${historicalDelay.toFixed(0)} min` }
    ];

    const prediction: DelayPrediction = {
      id: this.generatePredictionId('DELAY'),
      type: 'DELAY',
      probability,
      predictedValue: totalDelay,
      timeframe: {
        start: now,
        end: new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2-hour window
      },
      confidence: this.calculateConfidence(0, factors),
      factors,
      location: `${origin}-${destination}`,
      generatedAt: now,
      modelVersion: this.MODEL_VERSION,
      expectedDelayMinutes: totalDelay,
      delayBreakdown: {
        weather: weatherDelayMin,
        congestion: congestionDelayMin,
        gateAvailability: gateDelayMin,
        airspaceRestriction: 0
      },
      probOver15Min: totalDelay > 15 ? probability * 0.9 : probability * (totalDelay / 15) * 0.5,
      probOver30Min: totalDelay > 30 ? probability * 0.8 : probability * (totalDelay / 30) * 0.3
    };

    this.recordPrediction(prediction);
    return prediction;
  }

  // ============================================================================
  // CONFLICT RISK PREDICTION
  // ============================================================================

  /**
   * Predicts conflict risk for a set of aircraft
   *
   * @param {Aircraft[]} aircraft - Current aircraft positions
   * @param {WeatherConditions} weather - Current weather
   * @param {number} hoursAhead - Prediction horizon
   * @returns {ConflictRiskPrediction} Conflict risk prediction
   */
  predictConflictRisk(
    aircraft: Aircraft[],
    weather?: WeatherConditions,
    hoursAhead: number = 1
  ): ConflictRiskPrediction {
    const now = new Date();

    // Aircraft density factor
    const density = aircraft.length / 300; // Normalized to 300 capacity
    const densityFactor = Math.min(1.0, density * density); // Quadratic scaling

    // Weather visibility factor
    let visibilityFactor = 0;
    let turbulenceFactor = 0;
    let weatherRiskFactor = 0;
    if (weather) {
      visibilityFactor = weather.visibility < 5000 ? 1 - (weather.visibility / 5000) : 0;
      const turbLevels: Record<string, number> = { 'NONE': 0, 'LIGHT': 0.2, 'MODERATE': 0.5, 'SEVERE': 0.8, 'EXTREME': 1.0 };
      turbulenceFactor = turbLevels[weather.turbulence] ?? 0;
      weatherRiskFactor = (visibilityFactor + turbulenceFactor) / 2;
    }

    // Convergence patterns (analyze heading distribution)
    const convergenceFactor = this.analyzeConvergence(aircraft);

    // Historical conflicts for this density/time
    const historicalFactor = this.getHistoricalConflictRate(
      aircraft.length,
      now.getHours()
    );

    // Weighted risk calculation
    const riskProbability =
      this.CONFLICT_WEIGHTS.aircraftDensity * densityFactor +
      this.CONFLICT_WEIGHTS.weatherVisibility * visibilityFactor +
      this.CONFLICT_WEIGHTS.weatherTurbulence * turbulenceFactor +
      this.CONFLICT_WEIGHTS.convergencePatterns * convergenceFactor +
      this.CONFLICT_WEIGHTS.historicalConflicts * historicalFactor;

    const clampedRisk = Math.max(0, Math.min(1, riskProbability));

    // Expected number of conflicts
    const expectedConflicts = Math.round(clampedRisk * aircraft.length * 0.1);

    // Identify hotspots
    const hotspots = this.identifyHotspots(aircraft);

    const factors: PredictionFactor[] = [
      { name: 'aircraftDensity', weight: this.CONFLICT_WEIGHTS.aircraftDensity, value: densityFactor, contribution: densityFactor * this.CONFLICT_WEIGHTS.aircraftDensity, description: `${aircraft.length} aircraft (${(density * 100).toFixed(0)}% capacity)` },
      { name: 'weatherVisibility', weight: this.CONFLICT_WEIGHTS.weatherVisibility, value: visibilityFactor, contribution: visibilityFactor * this.CONFLICT_WEIGHTS.weatherVisibility, description: `Visibility risk: ${(visibilityFactor * 100).toFixed(0)}%` },
      { name: 'weatherTurbulence', weight: this.CONFLICT_WEIGHTS.weatherTurbulence, value: turbulenceFactor, contribution: turbulenceFactor * this.CONFLICT_WEIGHTS.weatherTurbulence, description: `Turbulence risk: ${(turbulenceFactor * 100).toFixed(0)}%` },
      { name: 'convergencePatterns', weight: this.CONFLICT_WEIGHTS.convergencePatterns, value: convergenceFactor, contribution: convergenceFactor * this.CONFLICT_WEIGHTS.convergencePatterns, description: `Convergence risk: ${(convergenceFactor * 100).toFixed(0)}%` },
      { name: 'historicalConflicts', weight: this.CONFLICT_WEIGHTS.historicalConflicts, value: historicalFactor, contribution: historicalFactor * this.CONFLICT_WEIGHTS.historicalConflicts, description: `Historical conflict rate: ${(historicalFactor * 100).toFixed(0)}%` }
    ];

    const prediction: ConflictRiskPrediction = {
      id: this.generatePredictionId('CONFLICT_RISK'),
      type: 'CONFLICT_RISK',
      probability: clampedRisk,
      predictedValue: expectedConflicts,
      timeframe: {
        start: now,
        end: new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)
      },
      confidence: this.calculateConfidence(hoursAhead, factors),
      factors,
      location: 'ALL_SECTORS',
      generatedAt: now,
      modelVersion: this.MODEL_VERSION,
      expectedConflicts,
      hotspots,
      weatherRiskFactor,
      trafficRiskFactor: densityFactor
    };

    this.recordPrediction(prediction);
    return prediction;
  }

  // ============================================================================
  // DEMAND PREDICTION
  // ============================================================================

  /**
   * Predicts demand for the next N hours with weather adjustment
   *
   * @param {number} hoursAhead - Number of hours to forecast
   * @param {number} baselinePerHour - Baseline flights per hour
   * @param {WeatherConditions} weather - Current weather for impact calculation
   * @returns {DemandPrediction} Demand prediction
   */
  predictDemand(
    hoursAhead: number = 12,
    baselinePerHour: number = 60,
    weather?: WeatherConditions
  ): DemandPrediction {
    const now = new Date();
    const hourlyDemand: DemandPrediction['hourlyDemand'] = [];
    let totalDemand = 0;

    for (let h = 0; h < hoursAhead; h++) {
      const targetHour = (now.getHours() + h) % 24;
      const hourlyFactor = this.getHourlyDemandFactor(targetHour);
      const dayFactor = this.getDayOfWeekFactor(
        now.getDay() === 0 ? 6 : now.getDay() - 1
      );

      let flights = Math.round(baselinePerHour * hourlyFactor * dayFactor);

      // Apply weather reduction
      if (weather && this.weatherSystem) {
        const impact = this.weatherSystem.calculateOperationalImpact(weather);
        flights = Math.round(flights * impact);
      }

      hourlyDemand.push({
        hour: targetHour,
        flights,
        confidence: Math.max(0.4, 1 - h * 0.04)
      });

      totalDemand += flights;
    }

    // Weather-adjusted vs base
    const baseDemand = hourlyDemand.reduce((sum, h) => {
      const hourlyFactor = this.getHourlyDemandFactor(h.hour);
      return sum + Math.round(baselinePerHour * hourlyFactor);
    }, 0);

    const prediction: DemandPrediction = {
      id: this.generatePredictionId('DEMAND'),
      type: 'DEMAND',
      probability: 0.85, // Demand predictions are generally reliable
      predictedValue: totalDemand,
      timeframe: {
        start: now,
        end: new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)
      },
      confidence: 0.85,
      factors: [],
      location: 'ALL',
      generatedAt: now,
      modelVersion: this.MODEL_VERSION,
      hourlyDemand,
      weatherAdjustedDemand: totalDemand,
      baseDemand
    };

    this.recordPrediction(prediction);
    return prediction;
  }

  // ============================================================================
  // MODEL MANAGEMENT
  // ============================================================================

  /**
   * Records actual outcome for a prediction (for accuracy tracking)
   */
  recordOutcome(predictionId: string, actualValue: number): void {
    const entry = this.predictionHistory.get(predictionId);
    if (entry) {
      entry.actual = actualValue;

      // Update model metrics
      this.updateMetrics();
    }
  }

  /**
   * Adds historical data point for pattern learning
   */
  addHistoricalData(dataPoint: HistoricalDataPoint): void {
    this.historicalData.push(dataPoint);
    if (this.historicalData.length > this.MAX_HISTORY) {
      this.historicalData.shift();
    }
  }

  /** Gets current model performance metrics */
  getModelMetrics(): ModelMetrics {
    return { ...this.modelMetrics };
  }

  /** Gets prediction by ID */
  getPrediction(id: string): Prediction | null {
    return this.predictionHistory.get(id)?.prediction ?? null;
  }

  /** Sets weather system reference */
  setWeatherSystem(weatherSystem: WeatherSystem): void {
    this.weatherSystem = weatherSystem;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Returns normalized hourly demand factor (0-1)
   * Based on TrafficProfileConfig multipliers normalized to max
   */
  private getHourlyDemandFactor(hour: number): number {
    const multipliers: Record<number, number> = {
      0: 0.05, 1: 0.04, 2: 0.03, 3: 0.02, 4: 0.01, 5: 0.02,
      6: 0.15, 7: 0.50, 8: 2.80, 9: 3.20, 10: 2.00, 11: 1.80,
      12: 1.50, 13: 1.40, 14: 1.20, 15: 1.50, 16: 2.50, 17: 4.10,
      18: 4.00, 19: 3.20, 20: 2.50, 21: 1.80, 22: 0.80, 23: 0.20
    };
    return (multipliers[hour] ?? 1.0) / 4.10; // Normalize to 0-1 (4.10 = max)
  }

  /** Returns normalized day-of-week factor (0-1) */
  private getDayOfWeekFactor(day: number): number {
    const multipliers: Record<number, number> = {
      0: 1.00, 1: 1.05, 2: 1.08, 3: 1.05, 4: 1.00, 5: 0.70, 6: 0.50
    };
    return (multipliers[day] ?? 1.0) / 1.08; // Normalize to 0-1
  }

  /** Gets historical congestion for a time slot */
  private getHistoricalCongestion(hour: number, day: number): number {
    const relevant = this.historicalData.filter(
      d => d.hour === hour && d.dayOfWeek === day
    );
    if (relevant.length === 0) return 0.5; // Default middle
    return relevant.reduce((sum, d) => sum + d.aircraftCount / 300, 0) / relevant.length;
  }

  /** Gets historical average delay for a route */
  private getHistoricalDelay(_origin: string, _destination: string, _hour: number): number {
    // With real data, filter by route and hour
    const relevant = this.historicalData.filter(d => d.hour === _hour);
    if (relevant.length === 0) return 3; // Default 3 min
    return relevant.reduce((sum, d) => sum + d.averageDelay, 0) / relevant.length;
  }

  /** Gets historical conflict rate */
  private getHistoricalConflictRate(aircraftCount: number, hour: number): number {
    const relevant = this.historicalData.filter(d => d.hour === hour);
    if (relevant.length === 0) return 0.1; // Default low
    const avgConflicts = relevant.reduce((sum, d) => sum + d.conflictCount, 0) / relevant.length;
    return Math.min(1.0, avgConflicts / (aircraftCount * 0.1));
  }

  /** Analyzes heading convergence patterns among aircraft */
  private analyzeConvergence(aircraft: Aircraft[]): number {
    if (aircraft.length < 2) return 0;

    let convergingPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < Math.min(aircraft.length, 50); i++) {
      for (let j = i + 1; j < Math.min(aircraft.length, 50); j++) {
        totalPairs++;
        const headingDiff = Math.abs(aircraft[i].heading - aircraft[j].heading);
        const normalizedDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;

        // Converging if headings point toward each other (within 60°)
        if (normalizedDiff > 120 && normalizedDiff < 240) {
          convergingPairs++;
        }
      }
    }

    return totalPairs > 0 ? convergingPairs / totalPairs : 0;
  }

  /** Identifies areas with elevated conflict risk */
  private identifyHotspots(aircraft: Aircraft[]): ConflictHotspot[] {
    if (aircraft.length < 5) return [];

    // Simple grid-based density analysis
    const gridSize = 0.01; // ~1km grid cells
    const grid: Map<string, Aircraft[]> = new Map();

    for (const ac of aircraft) {
      const key = `${Math.floor(ac.latitude / gridSize)}_${Math.floor(ac.longitude / gridSize)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(ac);
    }

    const hotspots: ConflictHotspot[] = [];
    for (const [key, acs] of grid) {
      if (acs.length >= 3) {
        const avgLat = acs.reduce((s, a) => s + a.latitude, 0) / acs.length;
        const avgLon = acs.reduce((s, a) => s + a.longitude, 0) / acs.length;
        const riskScore = Math.min(1.0, acs.length / 10);

        hotspots.push({
          sector: key,
          center: { latitude: avgLat, longitude: avgLon },
          riskScore,
          primaryFactor: 'DENSITY',
          mitigation: riskScore > 0.7
            ? 'Implement flow control - reduce inbound traffic'
            : 'Monitor closely - consider altitude stratification'
        });
      }
    }

    return hotspots.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
  }

  /** Calculates confidence based on lead time and factor quality */
  private calculateConfidence(hoursAhead: number, factors: PredictionFactor[]): number {
    // Base confidence decreases with lead time
    const timeDecay = Math.max(0.3, 1 - hoursAhead * 0.05);

    // Factor quality (how many non-zero factors)
    const activeFractions = factors.filter(f => f.value > 0.01).length / factors.length;

    return Math.min(1.0, timeDecay * (0.6 + 0.4 * activeFractions));
  }

  /** Generates unique prediction ID */
  private generatePredictionId(type: string): string {
    return `PRED_${type}_${Date.now()}_${++this.predictionCounter}`;
  }

  /** Records prediction for accuracy tracking */
  private recordPrediction(prediction: Prediction): void {
    this.predictionHistory.set(prediction.id, { prediction });

    // Limit stored predictions
    if (this.predictionHistory.size > 5000) {
      const oldestKey = this.predictionHistory.keys().next().value;
      if (oldestKey) this.predictionHistory.delete(oldestKey);
    }

    // Publish event
    try {
      EventBus.publish('PREDICTION_GENERATED', prediction);
    } catch {
      // Silently fail
    }
  }

  /** Updates model metrics based on predictions with outcomes */
  private updateMetrics(): void {
    let correct = 0;
    let totalWithOutcome = 0;
    let totalDelayError = 0;
    let delayCount = 0;

    for (const [, entry] of this.predictionHistory) {
      if (entry.actual !== undefined) {
        totalWithOutcome++;

        // Check if prediction direction was correct
        const predicted = entry.prediction.probability > 0.5;
        const actual = entry.actual > 0;
        if (predicted === actual) correct++;

        // Track delay MAE
        if (entry.prediction.type === 'DELAY') {
          totalDelayError += Math.abs(entry.prediction.predictedValue - entry.actual);
          delayCount++;
        }
      }
    }

    if (totalWithOutcome > 0) {
      this.modelMetrics.accuracy = correct / totalWithOutcome;
      this.modelMetrics.totalPredictions = totalWithOutcome;
      this.modelMetrics.correctPredictions = correct;
    }

    if (delayCount > 0) {
      this.modelMetrics.maeDelay = totalDelayError / delayCount;
    }
  }
}
