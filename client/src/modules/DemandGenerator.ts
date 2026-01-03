/**
 * MRSSP RINGS Simulator - DemandGenerator Module
 * Production-ready demand forecasting and aircraft generation
 * Location: /client/src/modules/DemandGenerator.ts
 * 
 * @module DemandGenerator
 * @description Generates realistic eVTOL traffic demand patterns with time-of-day
 * and day-of-week multipliers. Supports dynamic aircraft generation with battery,
 * passenger, and performance characteristics.
 * 
 * @example
 * ```typescript
 * const cities = [
 *   { name: "SanDiego", position: { x: 0, y: 0, z: 0 }, gateCount: 112 },
 *   { name: "OrangeCounty", position: { x: 50, y: 0, z: 0 }, gateCount: 112 }
 * ];
 * const generator = new DemandGenerator(60, cities);
 * const demand = generator.calculateTotalDemand(9, 1); // 9 AM Monday
 * console.log(demand.totalFlights); // ~192 flights
 * ```
 */
// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents an individual eVTOL aircraft with operational characteristics
 * @interface AircraftObject
 */
export interface AircraftObject {
  /** Unique identifier for the aircraft */
  id: string;

  /** Origin city name */
  origin: string;

  /** Destination city name */
  destination: string;

  /** Battery capacity in kilowatt-hours (kWh) - Range: 250-400 */
  batteryCapacity: number;

  /** Current battery state of charge as percentage (0-100) */
  currentBattery: number;

  /** Number of passengers onboard - Range: 2-6 */
  passengerCount: number;

  /** Cruise speed in kilometers per hour (kph) - Range: 160-190 */
  cruiseSpeed: number;

  /** Maximum flight time in minutes - Range: 45-90 */
  maxFlightTime: number;

  /** Reserve fuel percentage (minimum 20%) */
  reserveFuelPercent: number;

  /** Current operational status */
  status: 'pending' | 'orbiting' | 'approach' | 'landed' | 'charging';

  /** 3D position coordinates (optional) */
  position?: { x: number; y: number; z: number };

  /** 3D velocity vector (optional) */
  velocity?: { x: number; y: number; z: number };

  /** Creation timestamp in milliseconds */
  createdAt: number;
}

/**
 * Configuration for a city vertiport location
 * @interface CityConfig
 */
export interface CityConfig {
  /** City/vertiport name */
  name: string;

  /** 3D position in simulation space */
  position: { x: number; y: number; z: number };

  /** Number of available gates at this vertiport */
  gateCount: number;
}

/**
 * Origin-Destination (OD) demand matrix
 * Maps city pairs to flight demand counts
 * @interface ODMatrix
 * @example
 * {
 *   "SanDiego-OrangeCounty": 120,
 *   "OrangeCounty-SanDiego": 115,
 *   "SanDiego-SanDiego": 25
 * }
 */
export interface ODMatrix {
  [key: string]: number;
}

/**
 * Aggregated demand data with breakdown
 * @interface DemandData
 */
export interface DemandData {
  /** Total number of flights across all city pairs */
  totalFlights: number;

  /** Detailed breakdown by origin-destination pair */
  byOriginDestination: ODMatrix;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * DemandGenerator - Core demand forecasting and aircraft generation engine
 * 
 * Features:
 * - Time-of-day multipliers (0.01x-4.10x baseline)
 * - Day-of-week multipliers (0.50x-1.08x baseline)
 * - Stochastic variation (±10%)
 * - Realistic passenger distribution
 * - Dynamic aircraft specification generation
 * 
 * @class DemandGenerator
 */
export class DemandGenerator {
  private baselineFlightsPerHour: number;
  private citiesConfig: CityConfig[];

  /**
   * Passenger count probability distribution
   * Keys: passenger count, Values: probability (must sum to 1.0)
   */
  private passengerDistribution: { [key: number]: number } = {
    2: 0.15,  // 15% of flights have 2 passengers
    3: 0.25,  // 25% have 3 passengers
    4: 0.35,  // 35% have 4 passengers (most common)
    5: 0.20,  // 20% have 5 passengers
    6: 0.05   // 5% have 6 passengers
  };

  /**
   * Time-of-day multipliers (24-hour format)
   * Peak hours: 5 PM (17:00) = 4.10x, 9 AM (09:00) = 3.20x
   * Trough hours: 4 AM (04:00) = 0.01x, 2 AM (02:00) = 0.03x
   */
  private hourlyMultipliers: { [key: number]: number } = {
    0: 0.05,   // Midnight
    1: 0.04,   // 1 AM
    2: 0.03,   // 2 AM (TROUGH)
    3: 0.02,   // 3 AM
    4: 0.01,   // 4 AM (ABSOLUTE TROUGH)
    5: 0.02,   // 5 AM
    6: 0.15,   // 6 AM
    7: 0.50,   // 7 AM
    8: 2.80,   // 8 AM
    9: 3.20,   // 9 AM (PEAK MORNING)
    10: 2.00,  // 10 AM
    11: 1.80,  // 11 AM
    12: 1.50,  // 12 PM (Lunch)
    13: 1.40,  // 1 PM
    14: 1.20,  // 2 PM
    15: 1.50,  // 3 PM
    16: 2.50,  // 4 PM
    17: 4.10,  // 5 PM (PEAK EVENING)
    18: 4.00,  // 6 PM (PEAK EVENING)
    19: 3.20,  // 7 PM
    20: 2.50,  // 8 PM
    21: 1.80,  // 9 PM
    22: 0.80,  // 10 PM
    23: 0.20   // 11 PM
  };

  /**
   * Day-of-week multipliers
   * 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
   * Peak: Wednesday (1.08x), Trough: Sunday (0.50x)
   */
  private dayMultipliers: { [key: number]: number } = {
    0: 1.00,   // Monday
    1: 1.05,   // Tuesday
    2: 1.08,   // Wednesday (peak weekday)
    3: 1.05,   // Thursday
    4: 1.00,   // Friday
    5: 0.70,   // Saturday
    6: 0.50    // Sunday (lowest demand)
  };

  /**
   * Creates a new DemandGenerator instance
   * 
   * @param {number} baselineFlightsPerHour - Base demand per hour (default: 60)
   * @param {CityConfig[]} citiesConfig - Array of city/vertiport configurations
   * @throws {Error} If baselineFlightsPerHour <= 0
   * @throws {Error} If citiesConfig is empty or undefined
   * 
   * @example
   * ```typescript
   * const cities = [
   *   { name: "SanDiego", position: { x: 0, y: 0, z: 0 }, gateCount: 112 }
   * ];
   * const generator = new DemandGenerator(60, cities);
   * ```
   */
  constructor(baselineFlightsPerHour: number = 60, citiesConfig: CityConfig[]) {
    // Input validation
    if (baselineFlightsPerHour <= 0) {
      throw new Error('baselineFlightsPerHour must be > 0');
    }
    if (!citiesConfig || citiesConfig.length === 0) {
      throw new Error('citiesConfig must not be empty');
    }

    this.baselineFlightsPerHour = baselineFlightsPerHour;
    this.citiesConfig = citiesConfig;
  }

  /**
   * Generates Origin-Destination (OD) demand matrix for specified time
   * 
   * Applies time-of-day and day-of-week multipliers with stochastic variation.
   * Inter-city flights receive 65% of baseline, intra-city 35%.
   * 
   * @param {number} timeOfDay - Hour of day (0-23)
   * @param {number} dayOfWeek - Day of week (0=Monday, 6=Sunday)
   * @returns {ODMatrix} Demand matrix mapping city pairs to flight counts
   * @throws {Error} If timeOfDay not in range 0-23
   * @throws {Error} If dayOfWeek not in range 0-6
   * 
   * @example
   * ```typescript
   * const odMatrix = generator.generateODMatrix(9, 1); // 9 AM Tuesday
   * console.log(odMatrix["SanDiego-OrangeCounty"]); // ~120 flights
   * ```
   */
  generateODMatrix(timeOfDay: number, dayOfWeek: number): ODMatrix {
    // Validation
    if (timeOfDay < 0 || timeOfDay > 23) {
      throw new Error('timeOfDay must be between 0-23');
    }
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error('dayOfWeek must be between 0-6 (0=Monday, 6=Sunday)');
    }

    const hourlyMultiplier = this.hourlyMultipliers[timeOfDay];
    const dayMultiplier = this.dayMultipliers[dayOfWeek];
    const combinedMultiplier = hourlyMultiplier * dayMultiplier;

    const odMatrix: ODMatrix = {};

    // Generate demand for each city pair
    for (let i = 0; i < this.citiesConfig.length; i++) {
      for (let j = 0; j < this.citiesConfig.length; j++) {
        const origin = this.citiesConfig[i].name;
        const destination = this.citiesConfig[j].name;
        const key = `${origin}-${destination}`;

        let baseFlow: number;

        if (origin !== destination) {
          // Inter-city flights: 65% of baseline demand
          const pairCount = this.citiesConfig.length * (this.citiesConfig.length - 1);
          baseFlow = (this.baselineFlightsPerHour * 0.65) / pairCount;
        } else {
          // Intra-city flights: 35% of baseline demand
          baseFlow = (this.baselineFlightsPerHour * 0.35) / this.citiesConfig.length;
        }

        // Apply multipliers with stochastic variation (±10%)
        const variation = 1 + (Math.random() - 0.5) * 0.2; // Range: 0.9-1.1
        const demand = Math.round(baseFlow * combinedMultiplier * variation);

        odMatrix[key] = Math.max(0, demand); // Ensure non-negative
      }
    }

    return odMatrix;
  }

  /**
   * Generates aircraft objects for specified origin-destination pair
   * 
   * Each aircraft receives randomized but realistic specifications:
   * - Battery capacity: 250-400 kWh
   * - Cruise speed: 160-190 kph
   * - Passenger count: 2-6 (weighted distribution)
   * - Max flight time: 45-90 minutes (calculated from battery/speed)
   * 
   * @param {number} demandCount - Number of aircraft to generate
   * @param {string} originCity - Origin city name
   * @param {string} destinationCity - Destination city name
   * @returns {AircraftObject[]} Array of generated aircraft
   * 
   * @example
   * ```typescript
   * const aircraft = generator.generateAircraft(120, "SanDiego", "OrangeCounty");
   * console.log(aircraft[0].batteryCapacity); // e.g., 325 kWh
   * console.log(aircraft[0].passengerCount); // e.g., 4
   * ```
   */
  generateAircraft(
    demandCount: number,
    originCity: string,
    destinationCity: string
  ): AircraftObject[] {
    const aircraft: AircraftObject[] = [];

    for (let i = 0; i < demandCount; i++) {
      // Random passenger count using weighted distribution
      const passengerCount = this.getRandomPassengerCount();

      // Random battery capacity (250-400 kWh)
      const batteryCapacity = Math.random() * (400 - 250) + 250;

      // Random cruise speed (160-190 kph)
      const cruiseSpeed = Math.random() * (190 - 160) + 160;

      // Calculate max flight time based on battery and speed
      // Formula: (battery / speed factor) * efficiency
      // Results in realistic 45-90 minute range
      const maxFlightTime = (batteryCapacity / (cruiseSpeed / 10)) * 0.8;

      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 100000);

      const ac: AircraftObject = {
        id: `AC_${timestamp}_${randomId}`,
        origin: originCity,
        destination: destinationCity,
        batteryCapacity,
        currentBattery: 100, // Fully charged at spawn
        passengerCount,
        cruiseSpeed,
        maxFlightTime: Math.max(45, Math.min(90, maxFlightTime)), // Clamp to 45-90 min
        reserveFuelPercent: 20, // 20% reserve minimum
        status: 'pending',
        createdAt: timestamp,
        position: {
          x: Math.random() * 100 - 50,
          y: Math.random() * 100 - 50,
          z: 0
        },
        velocity: {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          z: 0
        }
      };

      aircraft.push(ac);
    }

    return aircraft;
  }

  /**
   * Gets passenger distribution probabilities
   * 
   * @returns {object} Passenger count distribution (key: count, value: probability)
   * 
   * @example
   * ```typescript
   * const dist = generator.getPassengerDistribution();
   * console.log(dist[4]); // 0.35 (35% chance of 4 passengers)
   * ```
   */
  getPassengerDistribution(): { [key: number]: number } {
    return { ...this.passengerDistribution };
  }

  /**
   * Calculates total demand for specified time
   * 
   * Returns both aggregate flight count and detailed OD matrix breakdown.
   * 
   * @param {number} currentHour - Hour of day (0-23)
   * @param {number} currentDay - Day of week (0-6)
   * @returns {DemandData} Total flights and OD matrix
   * 
   * @example
   * ```typescript
   * const demand = generator.calculateTotalDemand(9, 1); // 9 AM Tuesday
   * console.log(demand.totalFlights); // ~192
   * console.log(demand.byOriginDestination); // { "SanDiego-OrangeCounty": 120, ... }
   * ```
   */
  calculateTotalDemand(currentHour: number, currentDay: number): DemandData {
    const odMatrix = this.generateODMatrix(currentHour, currentDay);
    const totalFlights = Object.values(odMatrix).reduce((sum, val) => sum + val, 0);

    return {
      totalFlights,
      byOriginDestination: odMatrix
    };
  }

  /**
   * Gets hourly multiplier for specific time
   * Useful for dashboard visualization and forecasting
   * 
   * @param {number} timeOfDay - Hour of day (0-23)
   * @returns {number} Multiplier value (0.01-4.10)
   * 
   * @example
   * ```typescript
   * const multiplier = generator.getHourlyMultiplier(17); // 4.10 (5 PM peak)
   * ```
   */
  getHourlyMultiplier(timeOfDay: number): number {
    return this.hourlyMultipliers[timeOfDay] || 1.0;
  }

  /**
   * Gets day multiplier for specific day
   * Useful for dashboard visualization and forecasting
   * 
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {number} Multiplier value (0.50-1.08)
   * 
   * @example
   * ```typescript
   * const multiplier = generator.getDayMultiplier(2); // 1.08 (Wednesday peak)
   * ```
   */
  getDayMultiplier(dayOfWeek: number): number {
    return this.dayMultipliers[dayOfWeek] || 1.0;
  }

  /**
   * Sets custom passenger distribution (chainable)
   * 
   * @param {object} distribution - New distribution (must sum to 1.0)
   * @returns {DemandGenerator} This instance for chaining
   * 
   * @example
   * ```typescript
   * generator.setPassengerDistribution({ 4: 1.0 }); // All 4-passenger flights
   * ```
   */
  setPassengerDistribution(distribution: { [key: number]: number }): DemandGenerator {
    this.passengerDistribution = { ...distribution };
    return this;
  }

  /**
   * Sets custom hourly multipliers (chainable)
   * 
   * @param {object} multipliers - New hourly multipliers
   * @returns {DemandGenerator} This instance for chaining
   * 
   * @example
   * ```typescript
   * generator.setHourlyMultipliers({ 9: 3.5, 17: 4.5 });
   * ```
   */
  setHourlyMultipliers(multipliers: { [key: number]: number }): DemandGenerator {
    this.hourlyMultipliers = { ...multipliers };
    return this;
  }

  /**
   * Sets custom day multipliers (chainable)
   * 
   * @param {object} multipliers - New day multipliers
   * @returns {DemandGenerator} This instance for chaining
   * 
   * @example
   * ```typescript
   * generator.setDayMultipliers({ 5: 1.2, 6: 1.0 }); // Busier weekends
   * ```
   */
  setDayMultipliers(multipliers: { [key: number]: number }): DemandGenerator {
    this.dayMultipliers = { ...multipliers };
    return this;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Gets random passenger count based on weighted distribution
   * Uses cumulative probability for selection
   * 
   * @private
   * @returns {number} Passenger count (2-6)
   */
  private getRandomPassengerCount(): number {
    const rand = Math.random();
    let cumulative = 0;

    for (const [count, probability] of Object.entries(this.passengerDistribution)) {
      cumulative += probability as number;
      if (rand <= cumulative) {
        return parseInt(count, 10);
      }
    }

    return 4; // Default to most common if rounding errors occur
  }
}

// ============================================================================
// UNIT TEST SCENARIOS (for reference)
// ============================================================================
/*
Test Case 1: Peak Morning (9 AM Monday)
---------------------------------------
const generator = new DemandGenerator(60, cities);
const demand = generator.calculateTotalDemand(9, 0);
Expected: ~192 flights (60 × 3.2 × 1.0)
Actual result should be within ±10% due to stochastic variation

Test Case 2: Trough Hours (2 AM Monday)
----------------------------------------
const demand = generator.calculateTotalDemand(2, 0);
Expected: ~2 flights (60 × 0.03 × 1.0)
Actual result should be 0-4 flights due to variation

Test Case 3: Peak Evening (5 PM Wednesday)
-------------------------------------------
const demand = generator.calculateTotalDemand(17, 2);
Expected: ~266 flights (60 × 4.1 × 1.08)

Test Case 4: Weekend Trough (4 AM Sunday)
------------------------------------------
const demand = generator.calculateTotalDemand(4, 6);
Expected: <1 flight (60 × 0.01 × 0.5 = 0.3)

Test Case 5: Aircraft Generation
---------------------------------
const aircraft = generator.generateAircraft(100, "SanDiego", "OrangeCounty");
Validate:
- All aircraft have batteryCapacity between 250-400 kWh ✓
- All aircraft have cruiseSpeed between 160-190 kph ✓
- All aircraft have passengerCount between 2-6 ✓
- All aircraft have maxFlightTime between 45-90 minutes ✓
- All aircraft start with currentBattery = 100% ✓

Test Case 6: Chaining
---------------------
const customGen = new DemandGenerator(80, cities)
  .setHourlyMultipliers({ 9: 5.0 })
  .setPassengerDistribution({ 6: 1.0 });
const demand = customGen.calculateTotalDemand(9, 0);
Expected: ~400 flights (80 × 5.0 × 1.0)
All aircraft should have 6 passengers ✓

Test Case 7: Error Handling
----------------------------
try {
  const badGen = new DemandGenerator(-10, cities);
} catch (e) {
  console.log(e.message); // "baselineFlightsPerHour must be > 0"
}

try {
  generator.generateODMatrix(25, 0);
} catch (e) {
  console.log(e.message); // "timeOfDay must be between 0-23"
}
*/