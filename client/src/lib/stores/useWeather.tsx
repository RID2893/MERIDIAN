import { create } from "zustand";

/**
 * Weather presets for quick switching during simulation
 */
export type WeatherPreset = "clear" | "cloudy" | "rain" | "storm" | "snow" | "fog" | "custom";

export interface WeatherState {
  // Current conditions
  visibility: number;          // meters
  windSpeed: number;           // m/s
  windDirection: number;       // degrees
  precipitation: number;       // mm/h
  precipitationType: "NONE" | "RAIN" | "SNOW" | "SLEET" | "HAIL";
  cloudCover: number;          // 0-100
  thunderstorm: boolean;
  temperature: number;         // Celsius
  turbulence: "NONE" | "LIGHT" | "MODERATE" | "SEVERE";

  // UI state
  enabled: boolean;            // Weather effects on/off
  activePreset: WeatherPreset;
  showWeatherPanel: boolean;   // Show/hide HUD weather panel

  // Safety
  safetyScore: number;         // 0-100
  clearForFlight: boolean;

  // Actions
  setPreset: (preset: WeatherPreset) => void;
  setEnabled: (enabled: boolean) => void;
  setShowWeatherPanel: (show: boolean) => void;
  updateConditions: (conditions: Partial<WeatherState>) => void;
}

const PRESETS: Record<WeatherPreset, Partial<WeatherState>> = {
  clear: {
    visibility: 30000,
    windSpeed: 3,
    windDirection: 180,
    precipitation: 0,
    precipitationType: "NONE",
    cloudCover: 10,
    thunderstorm: false,
    temperature: 24,
    turbulence: "NONE",
    safetyScore: 98,
    clearForFlight: true,
  },
  cloudy: {
    visibility: 15000,
    windSpeed: 8,
    windDirection: 220,
    precipitation: 0,
    precipitationType: "NONE",
    cloudCover: 70,
    thunderstorm: false,
    temperature: 18,
    turbulence: "LIGHT",
    safetyScore: 82,
    clearForFlight: true,
  },
  rain: {
    visibility: 5000,
    windSpeed: 12,
    windDirection: 200,
    precipitation: 8,
    precipitationType: "RAIN",
    cloudCover: 90,
    thunderstorm: false,
    temperature: 15,
    turbulence: "LIGHT",
    safetyScore: 65,
    clearForFlight: true,
  },
  storm: {
    visibility: 2000,
    windSpeed: 22,
    windDirection: 240,
    precipitation: 18,
    precipitationType: "RAIN",
    cloudCover: 100,
    thunderstorm: true,
    temperature: 12,
    turbulence: "SEVERE",
    safetyScore: 15,
    clearForFlight: false,
  },
  snow: {
    visibility: 3000,
    windSpeed: 6,
    windDirection: 320,
    precipitation: 5,
    precipitationType: "SNOW",
    cloudCover: 95,
    thunderstorm: false,
    temperature: -2,
    turbulence: "LIGHT",
    safetyScore: 55,
    clearForFlight: true,
  },
  fog: {
    visibility: 800,
    windSpeed: 2,
    windDirection: 150,
    precipitation: 0,
    precipitationType: "NONE",
    cloudCover: 100,
    thunderstorm: false,
    temperature: 10,
    turbulence: "NONE",
    safetyScore: 30,
    clearForFlight: false,
  },
  custom: {},
};

export const useWeather = create<WeatherState>((set) => ({
  // Default: clear weather
  visibility: 30000,
  windSpeed: 3,
  windDirection: 180,
  precipitation: 0,
  precipitationType: "NONE",
  cloudCover: 10,
  thunderstorm: false,
  temperature: 24,
  turbulence: "NONE",

  enabled: true,
  activePreset: "clear",
  showWeatherPanel: true,

  safetyScore: 98,
  clearForFlight: true,

  setPreset: (preset) => {
    const presetData = PRESETS[preset];
    if (presetData && preset !== "custom") {
      set({ ...presetData, activePreset: preset });
    } else {
      set({ activePreset: preset });
    }
  },

  setEnabled: (enabled) => set({ enabled }),

  setShowWeatherPanel: (show) => set({ showWeatherPanel: show }),

  updateConditions: (conditions) => set((state) => ({
    ...state,
    ...conditions,
    activePreset: "custom" as WeatherPreset,
  })),
}));
