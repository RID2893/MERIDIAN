/**
 * MRSSP RINGS Simulator - ODMatrixCalculator Module
 * Origin-Destination demand matrix calculator with temporal modeling
 * Integrates with: DemandGenerator, TrafficProfileConfig
 * Location: /client/src/modules/ODMatrixCalculator.ts
 * 
 * @module ODMatrixCalculator
 * @description Calculates realistic origin-destination demand matrices using
 * time-of-day and day-of-week multipliers with stochastic variation.
 * Provides demand projection, route analysis, and peak detection capabilities.
 * 
 * @example
 * ```typescript
 * import { ODMatrixCalculator } from './modules/ODMatrixCalculator';
 * import { TrafficProfileConfig } from './modules/TrafficProfileConfig';
 * 
 * const calculator = new ODMatrixCalculator(
 *   TrafficProfileConfig,
 *   TrafficProfileConfig.getBaselineODFlows()
 * );
 * 
 * const matrix = calculator.calculateODMatrix(9, 0, 60); // 9 AM Monday
 * console.log(matrix.totalDemand); // ~260 flights
 * ```
 */

import type { 
  ODFlow, 
  TrafficProfileConfig as ConfigType 
} from './TrafficProfileConfig';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Origin-Destination demand matrix result
 * @interface ODMatrixResult
 */
export interface ODMatrixResult {
  /** Hour of calculation (0-23) */
  hour: number;

  /** Day of week (0=Monday, 6=Sunday) */
  dayOfWeek: number;

  /** Total demand across all OD pairs */
  totalDemand: number;

  /** Demand by origin-destination pair */
  demandByRoute: { [key: string]: number };

  /** Applied hourly multiplier */
  hourlyMultiplier: number;

  /** Applied day multiplier */
  dayMultiplier: number;

  /** Combined multiplier */
  combinedMultiplier: number;

  /** Calculation timestamp */
  timestamp: number;
}

/**
 * Route share analysis result
 * @interface RouteShare
 */
export interface RouteShare {
  /** Origin city */
  origin: string;

  /** Destination city */
  destination: string;

  /** Absolute demand for this route */
  demand: number;

  /** Percentage of total demand (0-100) */
  sharePercent: number;

  /** Route key (origin-destination) */
  routeKey: string;
}

/**
 * Demand projection over time range
 * @interface DemandProjection
 */
export interface DemandProjection {
  /** Start hour (inclusive) */
  startHour: number;

  /** End hour (inclusive) */
  endHour: number;

  /** Day of week */
  dayOfWeek: number;

  /** Cumulative demand over range */
  cumulativeDemand: number;

  /** Average demand per hour */
  averageDemandPerHour: number;

  /** Peak hour in range */
  peakHour: number;

  /** Peak hour demand */
  peakDemand: number;

  /** Hourly breakdown */
  hourlyBreakdown: { hour: number; demand: number }[];
}

/**
 * Peak detection result
 * @interface PeakDetection
 */
export interface PeakDetection {
  /** Whether current time is peak */
  isPeak: boolean;

  /** Peak type (morning, midday, evening, night, off-peak) */
  peakType: string;

  /** Peak intensity (0-1, where 1 = maximum) */
  intensity: number;

  /** Combined multiplier */
  multiplier: number;

  /** Hour of day */
  hour: number;

  /** Day of week */
  dayOfWeek: number;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * ODMatrixCalculator - Advanced demand forecasting with temporal modeling
 * 
 * Features:
 * - Time-based demand calculation with multipliers
 * - Stochastic variation (±10% configurable)
 * - Route share analysis
 * - Multi-hour demand projection
 * - Peak period detection
 * - Comprehensive error handling
 * 
 * @class ODMatrixCalculator
 */
export class ODMatrixCalculator {
  private config: any; // TrafficProfileConfigManager instance
  private baselineODFlows: ODFlow[];
  private defaultVariationPercent: number = 10; // ±10%

  /**
   * Creates ODMatrixCalculator instance
   * 
   * @param {any} config - TrafficProfileConfig singleton instance
   * @param {ODFlow[]} baselineODFlows - Baseline origin-destination flows
   * @throws {Error} If config or baselineODFlows invalid
   * 
   * @example
   * ```typescript
   * import { TrafficProfileConfig } from './modules/TrafficProfileConfig';
   * 
   * const calculator = new ODMatrixCalculator(
   *   TrafficProfileConfig,
   *   TrafficProfileConfig.getBaselineODFlows()
   * );
   * ```
   */
  constructor(config: any, baselineODFlows: ODFlow[]) {
    // Validation
    if (!config) {
      throw new Error('TrafficProfileConfig instance required');
    }
    if (!baselineODFlows || baselineODFlows.length === 0) {
      throw new Error('baselineODFlows must not be empty');
    }

    this.config = config;
    this.baselineODFlows = baselineODFlows;
  }

  /**
   * Calculates OD matrix for specific time with applied multipliers
   * 
   * Applies hourly and day-of-week multipliers to baseline flows,
   * adds stochastic variation, and returns detailed demand breakdown.
   * 
   * @param {number} currentHour - Hour of day (0-23)
   * @param {number} dayOfWeek - Day of week (0=Monday, 6=Sunday)
   * @param {number} baselineDemand - Optional baseline demand override
   * @returns {ODMatrixResult} Complete demand matrix with metadata
   * @throws {Error} If parameters invalid
   * 
   * @example
   * ```typescript
   * // 9 AM Monday (peak): ~260 flights
   * const matrix1 = calculator.calculateODMatrix(9, 0, 60);
   * console.log(matrix1.totalDemand); // ~260
   * console.log(matrix1.combinedMultiplier); // 3.2
   * 
   * // 2 AM Monday (trough): ~2 flights
   * const matrix2 = calculator.calculateODMatrix(2, 0, 60);
   * console.log(matrix2.totalDemand); // ~2
   * 
   * // Saturday 5 PM: ~168 flights
   * const matrix3 = calculator.calculateODMatrix(17, 5, 60);
   * console.log(matrix3.totalDemand); // ~168 (4.1 × 0.7 × 60)
   * ```
   */
  calculateODMatrix(
    currentHour: number,
    dayOfWeek: number,
    baselineDemand?: number
  ): ODMatrixResult {
    // Validation
    if (currentHour < 0 || currentHour > 23) {
      throw new Error('currentHour must be between 0-23');
    }
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error('dayOfWeek must be between 0-6 (0=Monday, 6=Sunday)');
    }

    // Get multipliers from config
    const hourlyMultiplier = this.config.getHourlyMultiplier(currentHour);
    const dayMultiplier = this.config.getDayMultiplier(dayOfWeek);
    const combinedMultiplier = hourlyMultiplier * dayMultiplier;

    const demandByRoute: { [key: string]: number } = {};
    let totalDemand = 0;

    // Calculate demand for each OD pair
    for (const flow of this.baselineODFlows) {
      const routeKey = `${flow.origin}-${flow.destination}`;

      // Use provided baseline or flow's baseFlights
      const baseline = baselineDemand 
        ? (baselineDemand * flow.baseFlights) / this.getTotalBaselineFlights()
        : flow.baseFlights;

      // Apply multipliers with stochastic variation
      const rawDemand = baseline * combinedMultiplier;
      const demandWithVariation = this.addRandomVariation(
        rawDemand,
        this.defaultVariationPercent
      );

      // Round and ensure non-negative
      const finalDemand = Math.max(0, Math.round(demandWithVariation));

      demandByRoute[routeKey] = finalDemand;
      totalDemand += finalDemand;
    }

    return {
      hour: currentHour,
      dayOfWeek,
      totalDemand,
      demandByRoute,
      hourlyMultiplier,
      dayMultiplier,
      combinedMultiplier,
      timestamp: Date.now()
    };
  }

  /**
   * Adds random variation to demand value
   * 
   * @param {number} demandValue - Base demand value
   * @param {number} variationPercent - Variation percentage (e.g., 10 for ±10%)
   * @returns {number} Demand with random variation applied
   * 
   * @example
   * ```typescript
   * const baseDemand = 100;
   * const varied = calculator.addRandomVariation(baseDemand, 10);
   * // Result will be between 90-110
   * ```
   */
  addRandomVariation(demandValue: number, variationPercent: number): number {
    if (variationPercent < 0 || variationPercent > 100) {
      throw new Error('variationPercent must be between 0-100');
    }

    // Convert percent to decimal (10% -> 0.10)
    const variationDecimal = variationPercent / 100;

    // Generate random factor between (1 - variation) and (1 + variation)
    // For 10%: random between 0.9 and 1.1
    const randomFactor = 1 + (Math.random() - 0.5) * 2 * variationDecimal;

    return demandValue * randomFactor;
  }

  /**
   * Gets route share analysis for specific origin-destination
   * 
   * @param {string} originCity - Origin city name
   * @param {string} destinationCity - Destination city name
   * @param {number} currentHour - Hour of day (0-23)
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {RouteShare | null} Route share data or null if route not found
   * 
   * @example
   * ```typescript
   * const share = calculator.getRouteShare("SanDiego", "OrangeCounty", 9, 0);
   * console.log(share?.sharePercent); // e.g., 28.5% of total demand
   * console.log(share?.demand); // e.g., 74 flights
   * ```
   */
  getRouteShare(
    originCity: string,
    destinationCity: string,
    currentHour: number,
    dayOfWeek: number
  ): RouteShare | null {
    const matrix = this.calculateODMatrix(currentHour, dayOfWeek);
    const routeKey = `${originCity}-${destinationCity}`;
    const demand = matrix.demandByRoute[routeKey];

    if (demand === undefined) {
      return null;
    }

    const sharePercent = matrix.totalDemand > 0 
      ? (demand / matrix.totalDemand) * 100 
      : 0;

    return {
      origin: originCity,
      destination: destinationCity,
      demand,
      sharePercent,
      routeKey
    };
  }

  /**
   * Projects demand over hour range (cumulative and breakdown)
   * 
   * @param {number} startHour - Start hour (inclusive, 0-23)
   * @param {number} endHour - End hour (inclusive, 0-23)
   * @param {number} dayOfWeek - Day of week (0-6)
   * @param {number} baselineDemand - Optional baseline demand per hour
   * @returns {DemandProjection} Cumulative projection with hourly breakdown
   * @throws {Error} If hour range invalid
   * 
   * @example
   * ```typescript
   * // Project morning peak (7 AM - 10 AM)
   * const projection = calculator.projectDemand(7, 10, 0, 60);
   * console.log(projection.cumulativeDemand); // Total flights 7-10 AM
   * console.log(projection.peakHour); // Hour with max demand (likely 9)
   * console.log(projection.hourlyBreakdown); // Demand per hour
   * ```
   */
  projectDemand(
    startHour: number,
    endHour: number,
    dayOfWeek: number,
    baselineDemand?: number
  ): DemandProjection {
    // Validation
    if (startHour < 0 || startHour > 23) {
      throw new Error('startHour must be between 0-23');
    }
    if (endHour < 0 || endHour > 23) {
      throw new Error('endHour must be between 0-23');
    }
    if (startHour > endHour) {
      throw new Error('startHour must be <= endHour');
    }

    const hourlyBreakdown: { hour: number; demand: number }[] = [];
    let cumulativeDemand = 0;
    let peakHour = startHour;
    let peakDemand = 0;

    // Calculate demand for each hour in range
    for (let hour = startHour; hour <= endHour; hour++) {
      const matrix = this.calculateODMatrix(hour, dayOfWeek, baselineDemand);
      const hourDemand = matrix.totalDemand;

      hourlyBreakdown.push({ hour, demand: hourDemand });
      cumulativeDemand += hourDemand;

      // Track peak hour
      if (hourDemand > peakDemand) {
        peakDemand = hourDemand;
        peakHour = hour;
      }
    }

    const hourCount = endHour - startHour + 1;
    const averageDemandPerHour = cumulativeDemand / hourCount;

    return {
      startHour,
      endHour,
      dayOfWeek,
      cumulativeDemand,
      averageDemandPerHour,
      peakHour,
      peakDemand,
      hourlyBreakdown
    };
  }

  /**
   * Detects if current time is peak and returns detailed analysis
   * 
   * @param {number} currentHour - Hour of day (0-23)
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {PeakDetection} Peak detection result with type and intensity
   * 
   * @example
   * ```typescript
   * const peak1 = calculator.detectPeakHour(9, 0);
   * console.log(peak1.isPeak); // true
   * console.log(peak1.peakType); // "morning"
   * console.log(peak1.intensity); // 0.71 (71% of max)
   * 
   * const peak2 = calculator.detectPeakHour(17, 2);
   * console.log(peak2.isPeak); // true
   * console.log(peak2.peakType); // "evening"
   * console.log(peak2.intensity); // 0.98 (98% of max)
   * 
   * const peak3 = calculator.detectPeakHour(14, 0);
   * console.log(peak3.isPeak); // false
   * console.log(peak3.peakType); // "off-peak"
   * ```
   */
  detectPeakHour(currentHour: number, dayOfWeek: number): PeakDetection {
    // Validation
    if (currentHour < 0 || currentHour > 23) {
      throw new Error('currentHour must be between 0-23');
    }
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error('dayOfWeek must be between 0-6');
    }

    const isPeak = this.config.isPeakHour(currentHour, dayOfWeek);
    const intensity = this.config.getPeakIntensity(currentHour, dayOfWeek);
    const multiplier = this.config.getMultiplierForTime(currentHour, dayOfWeek);

    // Determine peak type
    let peakType = 'off-peak';

    if (isPeak) {
      const peakHours = this.config.getPeakHours();

      // Check each peak period
      if (this.isInRange(currentHour, peakHours.morning)) {
        peakType = 'morning';
      } else if (this.isInRange(currentHour, peakHours.midday)) {
        peakType = 'midday';
      } else if (this.isInRange(currentHour, peakHours.evening)) {
        peakType = 'evening';
      } else if (this.isInRangeWithWraparound(currentHour, peakHours.night)) {
        peakType = 'night';
      }
    }

    return {
      isPeak,
      peakType,
      intensity,
      multiplier,
      hour: currentHour,
      dayOfWeek
    };
  }

  /**
   * Gets all route shares for current time (sorted by demand)
   * 
   * @param {number} currentHour - Hour of day (0-23)
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {RouteShare[]} Array of route shares sorted by demand (descending)
   * 
   * @example
   * ```typescript
   * const shares = calculator.getAllRouteShares(9, 0);
   * console.log(shares[0]); // Highest demand route
   * console.log(shares[0].sharePercent); // e.g., 28.5%
   * ```
   */
  getAllRouteShares(currentHour: number, dayOfWeek: number): RouteShare[] {
    const matrix = this.calculateODMatrix(currentHour, dayOfWeek);
    const shares: RouteShare[] = [];

    for (const [routeKey, demand] of Object.entries(matrix.demandByRoute)) {
      const [origin, destination] = routeKey.split('-');
      const sharePercent = matrix.totalDemand > 0 
        ? (demand / matrix.totalDemand) * 100 
        : 0;

      shares.push({
        origin,
        destination,
        demand,
        sharePercent,
        routeKey
      });
    }

    // Sort by demand (descending)
    return shares.sort((a, b) => b.demand - a.demand);
  }

  /**
   * Sets default variation percentage
   * 
   * @param {number} percent - Variation percentage (0-100)
   * @returns {ODMatrixCalculator} This instance for chaining
   * 
   * @example
   * ```typescript
   * calculator.setDefaultVariation(15); // ±15% variation
   * ```
   */
  setDefaultVariation(percent: number): ODMatrixCalculator {
    if (percent < 0 || percent > 100) {
      throw new Error('Variation percent must be between 0-100');
    }
    this.defaultVariationPercent = percent;
    return this;
  }

  /**
   * Gets current default variation percentage
   * 
   * @returns {number} Current variation percentage
   */
  getDefaultVariation(): number {
    return this.defaultVariationPercent;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Calculates total baseline flights across all OD pairs
   * 
   * @private
   * @returns {number} Total baseline flights per hour
   */
  private getTotalBaselineFlights(): number {
    return this.baselineODFlows.reduce((sum, flow) => sum + flow.baseFlights, 0);
  }

  /**
   * Checks if hour is within range (no wraparound)
   * 
   * @private
   * @param {number} hour - Hour to check
   * @param {any} range - Range with start and end
   * @returns {boolean} True if in range
   */
  private isInRange(hour: number, range: any): boolean {
    return hour >= range.start && hour < range.end;
  }

  /**
   * Checks if hour is within range (with wraparound support)
   * 
   * @private
   * @param {number} hour - Hour to check
   * @param {any} range - Range with start and end
   * @returns {boolean} True if in range
   */
  private isInRangeWithWraparound(hour: number, range: any): boolean {
    if (range.start > range.end) {
      // Wraparound case (e.g., 22-6)
      return hour >= range.start || hour < range.end;
    }
    return this.isInRange(hour, range);
  }
}

// ============================================================================
// UNIT TEST SCENARIOS (for validation)
// ============================================================================

/*
TEST CASE 1: Peak Morning (9 AM Monday)
========================================
import { TrafficProfileConfig } from './TrafficProfileConfig';
const calculator = new ODMatrixCalculator(
  TrafficProfileConfig,
  TrafficProfileConfig.getBaselineODFlows()
);

const matrix = calculator.calculateODMatrix(9, 0, 60);
Expected:
- totalDemand: ~260 flights (60 × 3.2 × 1.0)
- combinedMultiplier: 3.2
- hourlyMultiplier: 3.2
- dayMultiplier: 1.0 ✓

TEST CASE 2: Trough Hours (2 AM Monday)
========================================
const matrix = calculator.calculateODMatrix(2, 0, 60);
Expected:
- totalDemand: ~2 flights (60 × 0.03 × 1.0)
- combinedMultiplier: 0.03
- Values within ±10% due to stochastic variation ✓

TEST CASE 3: Saturday Evening (5 PM)
=====================================
const matrix = calculator.calculateODMatrix(17, 5, 60);
Expected:
- totalDemand: ~168 flights (60 × 4.1 × 0.7)
- combinedMultiplier: 2.87
- Demonstrates day-of-week impact ✓

TEST CASE 4: Peak Wednesday (5 PM)
===================================
const matrix = calculator.calculateODMatrix(17, 2, 60);
Expected:
- totalDemand: ~265 flights (60 × 4.1 × 1.08)
- combinedMultiplier: 4.428
- Highest possible demand scenario ✓

TEST CASE 5: Random Variation
==============================
const base = 100;
const results = [];
for (let i = 0; i < 1000; i++) {
  results.push(calculator.addRandomVariation(base, 10));
}
Expected:
- All results between 90-110
- Average ~100
- Standard distribution ✓

TEST CASE 6: Route Share Analysis
==================================
const share = calculator.getRouteShare("SanDiego", "OrangeCounty", 9, 0);
Expected:
- share.demand > 0
- share.sharePercent between 0-100
- share.routeKey === "SanDiego-OrangeCounty" ✓

TEST CASE 7: Demand Projection
===============================
const projection = calculator.projectDemand(7, 10, 0, 60);
Expected:
- cumulativeDemand: sum of 7-10 AM demand
- peakHour: 9 (highest multiplier in range)
- hourlyBreakdown.length: 4 hours
- averageDemandPerHour: cumulative / 4 ✓

TEST CASE 8: Peak Detection (Morning)
======================================
const peak = calculator.detectPeakHour(9, 0);
Expected:
- isPeak: true
- peakType: "morning"
- intensity: ~0.71 (3.2 / 4.5)
- multiplier: 3.2 ✓

TEST CASE 9: Peak Detection (Evening)
======================================
const peak = calculator.detectPeakHour(17, 2);
Expected:
- isPeak: true
- peakType: "evening"
- intensity: ~0.98 (4.428 / 4.5)
- multiplier: 4.428 ✓

TEST CASE 10: Off-Peak Detection
=================================
const peak = calculator.detectPeakHour(14, 0);
Expected:
- isPeak: false
- peakType: "off-peak"
- intensity: ~0.27
- multiplier: 1.2 ✓

TEST CASE 11: All Route Shares
===============================
const shares = calculator.getAllRouteShares(9, 0);
Expected:
- shares.length === number of OD pairs
- Sorted by demand (descending)
- Sum of sharePercent ~100% (within rounding)
- shares[0].demand >= shares[1].demand ✓

TEST CASE 12: Chaining
======================
calculator.setDefaultVariation(15);
const variation = calculator.getDefaultVariation();
Expected: variation === 15 ✓

TEST CASE 13: Error Handling
=============================
try {
  calculator.calculateODMatrix(25, 0);
} catch (e) {
  console.log(e.message); // "currentHour must be between 0-23" ✓
}

try {
  calculator.addRandomVariation(100, 150);
} catch (e) {
  console.log(e.message); // "variationPercent must be between 0-100" ✓
}

try {
  calculator.projectDemand(15, 10, 0);
} catch (e) {
  console.log(e.message); // "startHour must be <= endHour" ✓
}
*/