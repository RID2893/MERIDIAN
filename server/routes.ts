import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Earth2Service } from "./weather";

const weatherService = new Earth2Service();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ========================================================================
  // WEATHER API ENDPOINTS
  // ========================================================================

  /** GET /api/weather/:lat/:lon - Current weather conditions */
  app.get("/api/weather/:lat/:lon", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.params.lat);
      const lon = parseFloat(req.params.lon);

      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      const conditions = await weatherService.getCurrentWeather(lat, lon);
      res.json(conditions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  /** GET /api/weather/forecast/:lat/:lon - 15-day medium range forecast */
  app.get("/api/weather/forecast/:lat/:lon", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.params.lat);
      const lon = parseFloat(req.params.lon);
      const days = Math.min(15, Math.max(1, parseInt(req.query.days as string) || 15));

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      const forecasts = await weatherService.getMediumRangeForecast(lat, lon, days);
      res.json(forecasts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch forecast data" });
    }
  });

  /** GET /api/weather/nowcast/:lat/:lon - 0-6 hour nowcast */
  app.get("/api/weather/nowcast/:lat/:lon", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.params.lat);
      const lon = parseFloat(req.params.lon);

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      const nowcasts = await weatherService.getNowcast(lat, lon);
      res.json(nowcasts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch nowcast data" });
    }
  });

  /** GET /api/weather/status - Weather service health check */
  app.get("/api/weather/status", (_req: Request, res: Response) => {
    res.json(weatherService.getStatus());
  });

  // ========================================================================
  // SIMULATION API ENDPOINTS (placeholders for future implementation)
  // ========================================================================

  /** GET /api/aircraft - List all active aircraft in simulation */
  app.get("/api/aircraft", (_req: Request, res: Response) => {
    // TODO: Connect to simulation state
    res.json({ aircraft: [], count: 0 });
  });

  /** GET /api/incidents - Recent incident history */
  app.get("/api/incidents", (_req: Request, res: Response) => {
    // TODO: Query from database
    res.json({ incidents: [], count: 0 });
  });

  /** GET /api/stats/daily - Daily statistics summary */
  app.get("/api/stats/daily", (_req: Request, res: Response) => {
    // TODO: Aggregate from database
    res.json({
      date: new Date().toISOString().split('T')[0],
      totalFlights: 0,
      totalConflicts: 0,
      averageDelay: 0,
      weatherImpactEvents: 0,
      peakAircraftCount: 0
    });
  });

  /** POST /api/predictions/congestion - Request congestion prediction */
  app.post("/api/predictions/congestion", (req: Request, res: Response) => {
    const { sector, hoursAhead, currentAircraftCount } = req.body;
    // TODO: Connect to PredictionEngine
    res.json({
      type: 'CONGESTION',
      sector: sector || 'ALL',
      hoursAhead: hoursAhead || 1,
      level: 'MODERATE',
      probability: 0.5,
      message: 'Prediction engine not yet connected'
    });
  });

  /** POST /api/predictions/delay - Request delay prediction */
  app.post("/api/predictions/delay", (req: Request, res: Response) => {
    const { origin, destination, departureHour } = req.body;
    // TODO: Connect to PredictionEngine
    res.json({
      type: 'DELAY',
      route: `${origin || 'unknown'}-${destination || 'unknown'}`,
      expectedDelayMinutes: 0,
      probability: 0.3,
      message: 'Prediction engine not yet connected'
    });
  });

  return httpServer;
}
