import { pgTable, text, serial, integer, boolean, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// EXISTING TABLES
// ============================================================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================================================
// WEATHER TABLES
// ============================================================================

/** Cached weather data from EARTH-2 and other sources */
export const weatherCache = pgTable("weather_cache", {
  id: serial("id").primaryKey(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  conditions: jsonb("conditions").notNull(),
  source: text("source").notNull(), // EARTH2_MEDIUM, EARTH2_NOWCAST, OPENWEATHER, MOCK
  forecastType: text("forecast_type").notNull(), // current, forecast, nowcast
  leadTimeHours: real("lead_time_hours").default(0),
  confidence: real("confidence").default(1),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWeatherCacheSchema = createInsertSchema(weatherCache).omit({
  id: true,
  createdAt: true,
});
export type InsertWeatherCache = z.infer<typeof insertWeatherCacheSchema>;
export type WeatherCache = typeof weatherCache.$inferSelect;

// ============================================================================
// FLIGHT HISTORY TABLE
// ============================================================================

/** Flight history for ML training and analytics */
export const flightHistory = pgTable("flight_history", {
  id: serial("id").primaryKey(),
  aircraftId: text("aircraft_id").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  departureTime: timestamp("departure_time"),
  arrivalTime: timestamp("arrival_time"),
  plannedDuration: integer("planned_duration_minutes"),
  actualDuration: integer("actual_duration_minutes"),
  delayMinutes: integer("delay_minutes").default(0),
  weatherConditions: jsonb("weather_conditions"),
  weatherImpactFactor: real("weather_impact_factor").default(1),
  conflicts: integer("conflicts").default(0),
  passengerCount: integer("passenger_count"),
  batteryUsed: real("battery_used_percent"),
  status: text("status").notNull().default("completed"), // completed, diverted, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFlightHistorySchema = createInsertSchema(flightHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertFlightHistory = z.infer<typeof insertFlightHistorySchema>;
export type FlightHistory = typeof flightHistory.$inferSelect;

// ============================================================================
// PREDICTIONS TABLE
// ============================================================================

/** Prediction log for model accuracy tracking */
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  predictionId: text("prediction_id").notNull().unique(),
  type: text("type").notNull(), // DELAY, CONGESTION, CONFLICT_RISK, DEMAND
  location: text("location").notNull(),
  prediction: jsonb("prediction").notNull(),
  predictedValue: real("predicted_value"),
  actualValue: real("actual_value"),
  probability: real("probability"),
  confidence: real("confidence"),
  accuracy: real("accuracy"),
  modelVersion: text("model_version"),
  timeframeStart: timestamp("timeframe_start"),
  timeframeEnd: timestamp("timeframe_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  createdAt: true,
});
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type PredictionRecord = typeof predictions.$inferSelect;

// ============================================================================
// INCIDENTS TABLE (Enhanced with weather context)
// ============================================================================

/** Incidents with weather context for correlation analysis */
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  severity: text("severity").notNull(), // CRITICAL, HIGH, MEDIUM, LOW
  aircraftA: text("aircraft_a").notNull(),
  aircraftB: text("aircraft_b"),
  horizontalDistance: real("horizontal_distance"),
  verticalDistance: real("vertical_distance"),
  timeToCollision: real("time_to_collision"),
  weatherContributing: boolean("weather_contributing").default(false),
  weatherConditions: jsonb("weather_conditions"),
  weatherSafetyScore: real("weather_safety_score"),
  resolution: text("resolution"), // Resolution action taken
  resolutionConfidence: real("resolution_confidence"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  altitude: real("altitude"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  timestamp: true,
});
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

// ============================================================================
// WEATHER ALERTS TABLE
// ============================================================================

/** Active weather alerts and warnings */
export const weatherAlerts = pgTable("weather_alerts", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(), // WIND, VISIBILITY, THUNDERSTORM, etc.
  severity: text("severity").notNull(), // ADVISORY, WARNING, CRITICAL
  description: text("description").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  radius: real("radius"), // Affected radius in km
  conditions: jsonb("conditions"),
  active: boolean("active").default(true),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: text("acknowledged_by"),
});

export const insertWeatherAlertSchema = createInsertSchema(weatherAlerts).omit({
  id: true,
  issuedAt: true,
});
export type InsertWeatherAlert = z.infer<typeof insertWeatherAlertSchema>;
export type WeatherAlert = typeof weatherAlerts.$inferSelect;
