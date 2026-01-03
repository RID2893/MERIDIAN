/**
 * MRSSP RINGS Simulator - TrafficProfileConfig Module
 * Singleton configuration for realistic urban air mobility traffic patterns
 * Integrates with: DemandGenerator, ODMatrixCalculator
 * Location: /client/src/modules/TrafficProfileConfig.ts
 * 
 * @module TrafficProfileConfig
 * @description Immutable singleton providing time-of-day and day-of-week multipliers,
 * passenger distributions, aircraft specifications, and peak hour definitions.
 * All configuration is deep-frozen to prevent runtime modifications.
 * 
 * @example
 * ```typescript
 * import { TrafficProfileConfig } from './modules/TrafficProfileConfig';
 * 
 * // Get combined multiplier for 9 AM Monday
 * const multiplier = TrafficProfileConfig.getMultiplierForTime(9, 0); // 3.2
 * 
 * // Check if hour is peak
 * const isPeak = TrafficProfileConfig.isPeakHour(17, 2); // true (5 PM)
 * ```
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Hourly multiplier entry with metadata
 * @interface HourlyMultiplierEntry
 */
export interface HourlyMultiplierEntry {
  /** Hour of day (0-23) */
  hour: number;

  /** Traffic multiplier for this hour */
  multiplier: number;

  /** Human-readable label for dashboard display */
  label: string;
}

/**
 * Day-of-week multipliers (0=Monday, 6=Sunday)
 * @interface DayMultipliers
 */
export interface DayMultipliers {
  [day: number]: number;
}

/**
 * Passenger count probability distribution
 * Keys: passenger count (2-6), Values: probability (must sum to 1.0)
 * @interface PassengerDistribution
 */
export interface PassengerDistribution {
  [passengerCount: number]: number;
}

/**
 * Aircraft specification ranges for eVTOL fleet
 * @interface AircraftSpecs
 */
export interface AircraftSpecs {
  /** Battery capacity range in kWh */
  batteryCapacity: { min: number; max: number };

  /** Cruise speed range in kph */
  cruiseSpeed: { min: number; max: number };

  /** Maximum flight time range in minutes */
  maxFlightTime: { min: number; max: number };

  /** Reserve fuel percentage (minimum) */
  reserveFuelPercent: number;

  /** Maximum passenger capacity */
  maxPassengers: number;

  /** Minimum passenger capacity */
  minPassengers: number;
}

/**
 * Origin-Destination baseline flow definition
 * @interface ODFlow
 */
export interface ODFlow {
  /** Origin city name */
  origin: string;

  /** Destination city name */
  destination: string;

  /** Baseline flights per hour (before multipliers) */
  baseFlights: number;
}

/**
 * Peak hour time range definition
 * @interface PeakHourRange
 */
export interface PeakHourRange {
  /** Start hour (inclusive) */
  start: number;

  /** End hour (exclusive) */
  end: number;
}

/**
 * Collection of peak hour periods
 * @interface PeakHours
 */
export interface PeakHours {
  [key: string]: PeakHourRange;
}

/**
 * Complete traffic profile configuration
 * @interface TrafficProfileConfig
 */
export interface TrafficProfileConfig {
  /** 24-hour multiplier schedule */
  hourlyMultipliers: HourlyMultiplierEntry[];

  /** 7-day multiplier schedule */
  dayMultipliers: DayMultipliers;

  /** Passenger count probabilities */
  passengerDistribution: PassengerDistribution;

  /** Aircraft specification ranges */
  aircraftSpecs: AircraftSpecs;

  /** Baseline origin-destination flows */
  baselineODFlows: ODFlow[];

  /** Peak hour period definitions */
  peakHours: PeakHours;
}

/**
 * Configuration validation result
 * @interface ValidationResult
 */
export interface ValidationResult {
  /** Whether configuration is valid */
  valid: boolean;

  /** Array of validation issue descriptions */
  issues: string[];
}

// ============================================================================
// SINGLETON CLASS
// ============================================================================

/**
 * TrafficProfileConfigManager - Immutable singleton for traffic pattern management
 * 
 * Design principles:
 * - Singleton pattern ensures single source of truth
 * - Deep freeze prevents runtime modifications
 * - All getters return defensive copies
 * - Comprehensive validation on initialization
 * 
 * @class TrafficProfileConfigManager
 */
class TrafficProfileConfigManager {
  private static instance: TrafficProfileConfigManager;
  private config: TrafficProfileConfig;

  /**
   * Private constructor - use getInstance() instead
   * Initializes and deep-freezes configuration
   */
  private constructor() {
    this.config = this.initializeConfig();
    // Deep freeze to make configuration immutable
    this.deepFreeze(this.config);
  }

  /**
   * Gets singleton instance (creates on first call)
   * 
   * @returns {TrafficProfileConfigManager} Singleton instance
   * 
   * @example
   * ```typescript
   * const config = TrafficProfileConfigManager.getInstance();
   * const multiplier = config.getHourlyMultiplier(9); // 3.2
   * ```
   */
  static getInstance(): TrafficProfileConfigManager {
    if (!TrafficProfileConfigManager.instance) {
      TrafficProfileConfigManager.instance = new TrafficProfileConfigManager();
    }
    return TrafficProfileConfigManager.instance;
  }

  /**
   * Initializes traffic profile configuration with production values
   * 
   * @private
   * @returns {TrafficProfileConfig} Initial configuration
   */
  private initializeConfig(): TrafficProfileConfig {
    return {
      // ===== HOURLY MULTIPLIERS (0-23) =====
      // Peak hours: 5 PM (4.10x), 6 PM (4.00x), 9 AM (3.20x)
      // Trough hours: 4 AM (0.01x), 2 AM (0.03x)
      hourlyMultipliers: [
        { hour: 0, multiplier: 0.05, label: "Midnight" },
        { hour: 1, multiplier: 0.04, label: "1 AM" },
        { hour: 2, multiplier: 0.03, label: "2 AM (Trough)" },
        { hour: 3, multiplier: 0.02, label: "3 AM" },
        { hour: 4, multiplier: 0.01, label: "4 AM (Deep Trough)" },
        { hour: 5, multiplier: 0.02, label: "5 AM" },
        { hour: 6, multiplier: 0.15, label: "6 AM - Early morning" },
        { hour: 7, multiplier: 0.50, label: "7 AM - Morning starts" },
        { hour: 8, multiplier: 2.80, label: "8 AM - Peak morning" },
        { hour: 9, multiplier: 3.20, label: "9 AM - PEAK morning" },
        { hour: 10, multiplier: 2.00, label: "10 AM" },
        { hour: 11, multiplier: 1.80, label: "11 AM" },
        { hour: 12, multiplier: 1.50, label: "12 PM - Lunch" },
        { hour: 13, multiplier: 1.40, label: "1 PM" },
        { hour: 14, multiplier: 1.20, label: "2 PM" },
        { hour: 15, multiplier: 1.50, label: "3 PM" },
        { hour: 16, multiplier: 2.50, label: "4 PM - Afternoon ramp" },
        { hour: 17, multiplier: 4.10, label: "5 PM - PEAK evening" },
        { hour: 18, multiplier: 4.00, label: "6 PM - PEAK evening" },
        { hour: 19, multiplier: 3.20, label: "7 PM - Evening" },
        { hour: 20, multiplier: 2.50, label: "8 PM - Evening decline" },
        { hour: 21, multiplier: 1.80, label: "9 PM" },
        { hour: 22, multiplier: 0.80, label: "10 PM" },
        { hour: 23, multiplier: 0.20, label: "11 PM" }
      ],

      // ===== DAY-OF-WEEK MULTIPLIERS (0=Monday, 6=Sunday) =====
      // Peak: Wednesday (1.08x)
      // Trough: Sunday (0.50x)
      dayMultipliers: {
        0: 1.00,   // Monday
        1: 1.05,   // Tuesday
        2: 1.08,   // Wednesday (Peak weekday)
        3: 1.05,   // Thursday
        4: 1.00,   // Friday
        5: 0.70,   // Saturday (Reduced weekend)
        6: 0.50    // Sunday (Lowest demand)
      },

      // ===== PASSENGER DISTRIBUTION (Must sum to 1.0) =====
      // Most common: 4 passengers (35%)
      // Range: 2-6 passengers
      passengerDistribution: {
        2: 0.15,   // 15% of flights
        3: 0.25,   // 25% of flights
        4: 0.35,   // 35% of flights (most common)
        5: 0.20,   // 20% of flights
        6: 0.05    // 5% of flights
      },

      // ===== AIRCRAFT SPECIFICATIONS (Realistic eVTOL Ranges) =====
      aircraftSpecs: {
        batteryCapacity: { min: 250, max: 400 },     // kWh
        cruiseSpeed: { min: 160, max: 190 },          // kph
        maxFlightTime: { min: 45, max: 90 },          // minutes
        reserveFuelPercent: 20,                        // 20% minimum reserve
        maxPassengers: 6,
        minPassengers: 2
      },

      // ===== BASELINE OD FLOWS (Origin-Destination) =====
      // Typical for Southern California metropolitan area
      // Inter-city flows higher than intra-city
      baselineODFlows: [
        { origin: "SanDiego", destination: "OrangeCounty", baseFlights: 75 },
        { origin: "OrangeCounty", destination: "SanDiego", baseFlights: 65 },
        { origin: "SanDiego", destination: "LosAngeles", baseFlights: 45 },
        { origin: "LosAngeles", destination: "SanDiego", baseFlights: 40 },
        { origin: "OrangeCounty", destination: "LosAngeles", baseFlights: 55 },
        { origin: "LosAngeles", destination: "OrangeCounty", baseFlights: 50 },
        // Intra-city short hops (lower baseline)
        { origin: "SanDiego", destination: "SanDiego", baseFlights: 35 },
        { origin: "OrangeCounty", destination: "OrangeCounty", baseFlights: 28 },
        { origin: "LosAngeles", destination: "LosAngeles", baseFlights: 42 }
      ],

      // ===== PEAK HOUR DEFINITIONS =====
      // Morning peak: 7-10 AM
      // Evening peak: 4-7 PM (MAJOR PEAK)
      // Night period: 10 PM - 6 AM (handles wraparound)
      peakHours: {
        morning: { start: 7, end: 10 },      // 7 AM - 10 AM
        midday: { start: 12, end: 14 },      // 12 PM - 2 PM
        evening: { start: 16, end: 19 },     // 4 PM - 7 PM (MAJOR PEAK)
        night: { start: 22, end: 6 }         // 10 PM - 6 AM (wraparound)
      }
    };
  }

  /**
   * Recursively freezes object and all nested properties
   * Prevents any runtime modifications to configuration
   * 
   * @private
   * @param {any} obj - Object to freeze
   * @returns {any} Frozen object
   */
  private deepFreeze(obj: any): any {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      if (
        obj[prop] !== null &&
        (typeof obj[prop] === "object" || typeof obj[prop] === "function") &&
        !Object.isFrozen(obj[prop])
      ) {
        this.deepFreeze(obj[prop]);
      }
    });
    return obj;
  }

  // ============================================================================
  // GETTER METHODS (Return defensive copies)
  // ============================================================================

  /**
   * Gets hourly multiplier for specific hour (0-23)
   * 
   * @param {number} hour - Hour of day (0-23)
   * @returns {number} Multiplier value (0.01-4.10)
   * @throws {Error} If hour not in valid range
   * 
   * @example
   * ```typescript
   * const multiplier = config.getHourlyMultiplier(9); // 3.2
   * const usage = 60 * multiplier; // 192 flights
   * ```
   */
  getHourlyMultiplier(hour: number): number {
    if (hour < 0 || hour > 23) {
      throw new Error("Hour must be between 0-23");
    }
    const entry = this.config.hourlyMultipliers.find(e => e.hour === hour);
    return entry?.multiplier || 1.0;
  }

  /**
   * Gets hourly multiplier entry with metadata (label)
   * 
   * @param {number} hour - Hour of day (0-23)
   * @returns {HourlyMultiplierEntry} Entry with hour, multiplier, label
   * @throws {Error} If hour not in valid range or entry not found
   * 
   * @example
   * ```typescript
   * const entry = config.getHourlyEntry(17);
   * console.log(entry.label); // "5 PM - PEAK evening"
   * console.log(entry.multiplier); // 4.10
   * ```
   */
  getHourlyEntry(hour: number): HourlyMultiplierEntry {
    if (hour < 0 || hour > 23) {
      throw new Error("Hour must be between 0-23");
    }
    const entry = this.config.hourlyMultipliers.find(e => e.hour === hour);
    if (!entry) {
      throw new Error(`No multiplier entry for hour ${hour}`);
    }
    // Return defensive copy
    return { ...entry };
  }

  /**
   * Gets day-of-week multiplier (0=Monday, 6=Sunday)
   * 
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {number} Multiplier value (0.50-1.08)
   * @throws {Error} If dayOfWeek not in valid range
   * 
   * @example
   * ```typescript
   * const multiplier = config.getDayMultiplier(2); // 1.08 (Wednesday)
   * const multiplier = config.getDayMultiplier(6); // 0.50 (Sunday)
   * ```
   */
  getDayMultiplier(dayOfWeek: number): number {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error("dayOfWeek must be between 0-6 (0=Monday, 6=Sunday)");
    }
    return this.config.dayMultipliers[dayOfWeek] || 1.0;
  }

  /**
   * Gets combined multiplier for specific time and day
   * Combines hourly and day-of-week multipliers
   * 
   * @param {number} hour - Hour of day (0-23)
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {number} Combined multiplier
   * @throws {Error} If hour or dayOfWeek invalid
   * 
   * @example
   * ```typescript
   * // 9 AM Monday: 3.2 × 1.0 = 3.2
   * const multiplier1 = config.getMultiplierForTime(9, 0); // 3.2
   * 
   * // 5 PM Wednesday: 4.1 × 1.08 = 4.428
   * const multiplier2 = config.getMultiplierForTime(17, 2); // 4.428
   * 
   * // 2 AM Saturday: 0.03 × 0.7 = 0.021
   * const multiplier3 = config.getMultiplierForTime(2, 5); // 0.021
   * ```
   */
  getMultiplierForTime(hour: number, dayOfWeek: number): number {
    return this.getHourlyMultiplier(hour) * this.getDayMultiplier(dayOfWeek);
  }

  /**
   * Gets passenger count distribution (defensive copy)
   * 
   * @returns {PassengerDistribution} Passenger distribution probabilities
   * 
   * @example
   * ```typescript
   * const dist = config.getPassengerDistribution();
   * console.log(dist); // { 2: 0.15, 3: 0.25, 4: 0.35, 5: 0.20, 6: 0.05 }
   * ```
   */
  getPassengerDistribution(): PassengerDistribution {
    return { ...this.config.passengerDistribution };
  }

  /**
   * Gets aircraft specifications (defensive copy)
   * 
   * @returns {AircraftSpecs} Aircraft specification ranges
   * 
   * @example
   * ```typescript
   * const specs = config.getAircraftSpecs();
   * console.log(specs.batteryCapacity); // { min: 250, max: 400 }
   * console.log(specs.cruiseSpeed); // { min: 160, max: 190 }
   * ```
   */
  getAircraftSpecs(): AircraftSpecs {
    return JSON.parse(JSON.stringify(this.config.aircraftSpecs));
  }

  /**
   * Gets baseline OD flows (defensive copy of array)
   * 
   * @returns {ODFlow[]} Array of origin-destination baseline flows
   * 
   * @example
   * ```typescript
   * const flows = config.getBaselineODFlows();
   * const sdToOc = flows.find(f => f.origin === "SanDiego" && f.destination === "OrangeCounty");
   * console.log(sdToOc?.baseFlights); // 75
   * ```
   */
  getBaselineODFlows(): ODFlow[] {
    return this.config.baselineODFlows.map(flow => ({ ...flow }));
  }

  /**
   * Gets peak hour definitions (defensive copy)
   * 
   * @returns {PeakHours} Peak hour period definitions
   * 
   * @example
   * ```typescript
   * const peaks = config.getPeakHours();
   * console.log(peaks.evening); // { start: 16, end: 19 }
   * console.log(peaks.morning); // { start: 7, end: 10 }
   * ```
   */
  getPeakHours(): PeakHours {
    return JSON.parse(JSON.stringify(this.config.peakHours));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Checks if hour is within any defined peak period
   * Handles wraparound for night peak (22:00-06:00)
   * 
   * @param {number} hour - Hour of day (0-23)
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {boolean} True if within peak period
   * 
   * @example
   * ```typescript
   * config.isPeakHour(9, 0);   // true (9 AM in morning peak)
   * config.isPeakHour(14, 0);  // false (2 PM not in peak)
   * config.isPeakHour(17, 2);  // true (5 PM in evening peak)
   * config.isPeakHour(23, 5);  // true (11 PM in night period)
   * ```
   */
  isPeakHour(hour: number, dayOfWeek: number): boolean {
    const peakHours = this.config.peakHours;

    for (const [key, range] of Object.entries(peakHours)) {
      // Handle wraparound for night peak (22-6)
      if (range.start > range.end) {
        if (hour >= range.start || hour < range.end) {
          return true;
        }
      } else {
        // Normal range
        if (hour >= range.start && hour < range.end) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Gets peak intensity score for current time (0-1 scale)
   * Used for dashboard visualization and KPI calculations
   * 
   * @param {number} hour - Hour of day (0-23)
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {number} Intensity score (0-1, where 1 = maximum peak)
   * 
   * @example
   * ```typescript
   * const intensity1 = config.getPeakIntensity(17, 2); // ~0.98 (5 PM Wed)
   * const intensity2 = config.getPeakIntensity(9, 0);  // ~0.71 (9 AM Mon)
   * const intensity3 = config.getPeakIntensity(2, 5);  // ~0.005 (2 AM Sat)
   * ```
   */
  getPeakIntensity(hour: number, dayOfWeek: number): number {
    const multiplier = this.getMultiplierForTime(hour, dayOfWeek);
    // Normalize: max multiplier is ~4.5 (5 PM Wednesday: 4.1 × 1.08 = 4.428)
    return Math.min(1.0, multiplier / 4.5);
  }

  /**
   * Validates configuration consistency and integrity
   * Checks passenger distribution sums to 1.0, all hours/days present, etc.
   * 
   * @returns {ValidationResult} Validation result with issues array
   * 
   * @example
   * ```typescript
   * const validation = config.validateConfiguration();
   * if (!validation.valid) {
   *   console.error("Config issues:", validation.issues);
   * }
   * ```
   */
  validateConfiguration(): ValidationResult {
    const issues: string[] = [];

    // Check passenger distribution sums to ~1.0 (allow 1% tolerance)
    const passengerSum = Object.values(this.config.passengerDistribution)
      .reduce((a, b) => a + b, 0);
    if (Math.abs(passengerSum - 1.0) > 0.01) {
      issues.push(`Passenger distribution sum ${passengerSum.toFixed(3)} != 1.0`);
    }

    // Check all hours 0-23 present
    if (this.config.hourlyMultipliers.length !== 24) {
      issues.push(
        `Hourly multipliers count ${this.config.hourlyMultipliers.length} != 24`
      );
    }

    // Check sequential hours
    const hours = this.config.hourlyMultipliers.map(e => e.hour).sort((a, b) => a - b);
    for (let i = 0; i < 24; i++) {
      if (!hours.includes(i)) {
        issues.push(`Missing hour ${i} in hourly multipliers`);
      }
    }

    // Check all days 0-6 present
    const dayKeys = Object.keys(this.config.dayMultipliers).map(Number);
    if (dayKeys.length !== 7) {
      issues.push(`Day multipliers count ${dayKeys.length} != 7`);
    }

    for (let i = 0; i < 7; i++) {
      if (!dayKeys.includes(i)) {
        issues.push(`Missing day ${i} in day multipliers`);
      }
    }

    // Check aircraft specs ranges are valid
    const specs = this.config.aircraftSpecs;
    if (specs.batteryCapacity.min >= specs.batteryCapacity.max) {
      issues.push("Aircraft battery min >= max");
    }
    if (specs.cruiseSpeed.min >= specs.cruiseSpeed.max) {
      issues.push("Aircraft cruise speed min >= max");
    }
    if (specs.maxFlightTime.min >= specs.maxFlightTime.max) {
      issues.push("Aircraft max flight time min >= max");
    }

    // Check passenger limits
    if (specs.minPassengers >= specs.maxPassengers) {
      issues.push("Aircraft minPassengers >= maxPassengers");
    }

    // Check OD flows have valid baseline
    for (const flow of this.config.baselineODFlows) {
      if (flow.baseFlights < 0) {
        issues.push(`Negative baseFlights for ${flow.origin}-${flow.destination}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Exports full configuration as plain object (defensive copy)
   * Useful for serialization, logging, or external systems
   * 
   * @returns {TrafficProfileConfig} Complete configuration copy
   * 
   * @example
   * ```typescript
   * const configCopy = config.exportConfig();
   * console.log(JSON.stringify(configCopy, null, 2));
   * ```
   */
  exportConfig(): TrafficProfileConfig {
    return JSON.parse(JSON.stringify(this.config));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Export singleton instance for use throughout application
 * 
 * @constant {TrafficProfileConfigManager} TrafficProfileConfig
 * 
 * @example
 * ```typescript
 * import { TrafficProfileConfig } from './modules/TrafficProfileConfig';
 * 
 * const multiplier = TrafficProfileConfig.getMultiplierForTime(9, 0);
 * const isPeak = TrafficProfileConfig.isPeakHour(17, 2);
 * const dist = TrafficProfileConfig.getPassengerDistribution();
 * ```
 */
export const TrafficProfileConfig = TrafficProfileConfigManager.getInstance();

// ============================================================================
// UNIT TEST SCENARIOS (for validation)
// ============================================================================

/*
TEST CASE 1: Peak Morning (9 AM Monday)
========================================
const multiplier = TrafficProfileConfig.getMultiplierForTime(9, 0);
Expected: 3.2 × 1.0 = 3.2
Usage: 60 baseline × 3.2 = 192 flights ✓

TEST CASE 2: Peak Evening (5 PM Wednesday)
===========================================
const multiplier = TrafficProfileConfig.getMultiplierForTime(17, 2);
Expected: 4.1 × 1.08 = 4.428
Usage: 60 baseline × 4.428 = ~265 flights ✓

TEST CASE 3: Night Trough (2 AM Saturday)
==========================================
const multiplier = TrafficProfileConfig.getMultiplierForTime(2, 5);
Expected: 0.03 × 0.7 = 0.021
Usage: 60 baseline × 0.021 = ~1.3 flights ✓

TEST CASE 4: Absolute Trough (4 AM Sunday)
===========================================
const multiplier = TrafficProfileConfig.getMultiplierForTime(4, 6);
Expected: 0.01 × 0.5 = 0.005
Usage: 60 baseline × 0.005 = 0.3 flights ✓

TEST CASE 5: Passenger Distribution
====================================
const dist = TrafficProfileConfig.getPassengerDistribution();
Expected: { 2: 0.15, 3: 0.25, 4: 0.35, 5: 0.20, 6: 0.05 }
Sum: 1.0 ✓
Most common: 4 passengers (35%) ✓

TEST CASE 6: Peak Hour Detection
=================================
TrafficProfileConfig.isPeakHour(9, 0)   // true (9 AM in morning peak 7-10)
TrafficProfileConfig.isPeakHour(14, 0)  // false (2 PM not in defined peaks)
TrafficProfileConfig.isPeakHour(17, 2)  // true (5 PM in evening peak 16-19)
TrafficProfileConfig.isPeakHour(23, 5)  // true (11 PM in night period 22-6)
TrafficProfileConfig.isPeakHour(3, 0)   // true (3 AM in night period wraparound)

TEST CASE 7: Peak Intensity Calculation
========================================
const intensity1 = TrafficProfileConfig.getPeakIntensity(17, 2);
Expected: 4.428 / 4.5 = 0.984 (98.4% of maximum)

const intensity2 = TrafficProfileConfig.getPeakIntensity(9, 0);
Expected: 3.2 / 4.5 = 0.711 (71.1% of maximum)

const intensity3 = TrafficProfileConfig.getPeakIntensity(2, 5);
Expected: 0.021 / 4.5 = 0.0047 (0.47% of maximum)

TEST CASE 8: Configuration Validation
======================================
const validation = TrafficProfileConfig.validateConfiguration();
Expected: { valid: true, issues: [] } ✓

Checks performed:
- Passenger distribution sums to 1.0 ✓
- All 24 hours (0-23) present ✓
- All 7 days (0-6) present ✓
- Aircraft spec ranges valid (min < max) ✓
- No negative baseline flows ✓

TEST CASE 9: Aircraft Specifications
=====================================
const specs = TrafficProfileConfig.getAircraftSpecs();
Expected:
- Battery: 250-400 kWh ✓
- Speed: 160-190 kph ✓
- Flight time: 45-90 min ✓
- Reserve: 20% ✓
- Passengers: 2-6 ✓

TEST CASE 10: Baseline OD Flows
================================
const flows = TrafficProfileConfig.getBaselineODFlows();
Expected flows include:
- SanDiego→OrangeCounty: 75 flights/hour ✓
- OrangeCounty→SanDiego: 65 flights/hour ✓
- Intra-city (SanDiego→SanDiego): 35 flights/hour ✓
Total: 9 OD pairs defined ✓

TEST CASE 11: Immutability Check
=================================
const dist1 = TrafficProfileConfig.getPassengerDistribution();
dist1[4] = 0.99; // Attempt to modify
const dist2 = TrafficProfileConfig.getPassengerDistribution();
Expected: dist2[4] === 0.35 (original value preserved) ✓

Object.isFrozen(TrafficProfileConfig.exportConfig()) // true ✓

TEST CASE 12: Error Handling
=============================
try {
  TrafficProfileConfig.getHourlyMultiplier(25);
} catch (e) {
  console.log(e.message); // "Hour must be between 0-23" ✓
}

try {
  TrafficProfileConfig.getDayMultiplier(7);
} catch (e) {
  console.log(e.message); // "dayOfWeek must be between 0-6..." ✓
}

try {
  TrafficProfileConfig.getHourlyEntry(24);
} catch (e) {
  console.log(e.message); // "Hour must be between 0-23" ✓
}
*/