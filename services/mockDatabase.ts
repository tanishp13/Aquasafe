
import { DataPoint, AlertStatus, LiveState } from '../types';

// Normalized Dataset: Ensured all base pH values are within the safe 7.55 - 8.45 range
// to prevent accidental boundary triggers from the raw playback.
const RAW_DATASET = [
  {nitrate: 171.1, ph: 7.8, ammonia: 0.11, temp: 26.2, do: 7.9, turbidity: 90.0, manganese: 1.87},
  {nitrate: 34.7, ph: 7.68, ammonia: 0.63, temp: 31.3, do: 4.6, turbidity: 79.5, manganese: 1.13},
  {nitrate: 107.7, ph: 8.09, ammonia: 0.5, temp: 30.8, do: 8.8, turbidity: 59.7, manganese: 1.39},
  {nitrate: 150.0, ph: 7.96, ammonia: 0.62, temp: 30.0, do: 5.3, turbidity: 72.0, manganese: 1.74},
  {nitrate: 36.9, ph: 8.3, ammonia: 0.05, temp: 29.1, do: 8.4, turbidity: 66.7, manganese: 2.33},
  {nitrate: 134.7, ph: 8.37, ammonia: 0.96, temp: 30.9, do: 8.4, turbidity: 106.9, manganese: 2.12},
  {nitrate: 124.3, ph: 8.15, ammonia: 0.89, temp: 30.0, do: 7.7, turbidity: 39.5, manganese: 0.63},
  {nitrate: 33.0, ph: 7.72, ammonia: 0.13, temp: 25.3, do: 6.6, turbidity: 39.6, manganese: 0.89},
  {nitrate: 58.5, ph: 7.82, ammonia: 0.42, temp: 26.0, do: 8.5, turbidity: 81.3, manganese: 0.73},
  {nitrate: 13.9, ph: 7.61, ammonia: 0.12, temp: 30.7, do: 5.4, turbidity: 61.8, manganese: 1.59},
  {nitrate: 162.3, ph: 8.26, ammonia: 0.42, temp: 29.7, do: 6.4, turbidity: 79.7, manganese: 1.42},
  {nitrate: 13.6, ph: 7.7, ammonia: 0.29, temp: 30.7, do: 4.4, turbidity: 80.0, manganese: 2.25},
  {nitrate: 81.6, ph: 8.32, ammonia: 0.62, temp: 28.9, do: 7.0, turbidity: 62.9, manganese: 0.97},
  {nitrate: 138.7, ph: 8.21, ammonia: 0.57, temp: 27.9, do: 7.4, turbidity: 77.2, manganese: 1.08},
  {nitrate: 68.3, ph: 7.61, ammonia: 0.6, temp: 29.4, do: 4.6, turbidity: 65.2, manganese: 1.45},
  {nitrate: 53.5, ph: 7.6, ammonia: 0.57, temp: 25.4, do: 7.3, turbidity: 106.1, manganese: 0.71},
  {nitrate: 138.2, ph: 8.1, ammonia: 0.98, temp: 24.3, do: 7.9, turbidity: 36.8, manganese: 1.74},
  {nitrate: 66.6, ph: 8.4, ammonia: 0.61, temp: 27.5, do: 4.4, turbidity: 80.3, manganese: 0.49},
  {nitrate: 63.0, ph: 7.9, ammonia: 0.02, temp: 24.4, do: 6.4, turbidity: 25.2, manganese: 2.49},
  {nitrate: 103.2, ph: 7.73, ammonia: 0.43, temp: 28.2, do: 8.1, turbidity: 56.0, manganese: 2.46},
  {nitrate: 12.2, ph: 8.28, ammonia: 0.01, temp: 31.5, do: 7.7, turbidity: 51.0, manganese: 0.76},
  {nitrate: 8.9, ph: 7.89, ammonia: 0.95, temp: 25.4, do: 4.0, turbidity: 62.9, manganese: 0.48},
  {nitrate: 53.1, ph: 7.9, ammonia: 0.7, temp: 26.8, do: 3.3, turbidity: 90.6, manganese: 2.2},
  {nitrate: 100.2, ph: 8.17, ammonia: 0.66, temp: 25.4, do: 7.9, turbidity: 80.0, manganese: 0.43},
  {nitrate: 50.5, ph: 7.7, ammonia: 0.25, temp: 24.2, do: 8.9, turbidity: 71.9, manganese: 0.42},
  {nitrate: 143.2, ph: 7.71, ammonia: 0.87, temp: 30.4, do: 5.9, turbidity: 87.6, manganese: 1.01},
  {nitrate: 71.1, ph: 7.92, ammonia: 0.01, temp: 27.6, do: 5.4, turbidity: 52.9, manganese: 1.16},
  {nitrate: 16.9, ph: 7.76, ammonia: 0.56, temp: 31.9, do: 4.0, turbidity: 94.0, manganese: 2.34},
  {nitrate: 73.6, ph: 7.53, ammonia: 0.5, temp: 26.0, do: 3.6, turbidity: 68.4, manganese: 1.1},
  {nitrate: 145.5, ph: 8.22, ammonia: 0.63, temp: 28.2, do: 5.2, turbidity: 81.7, manganese: 0.77}
];

let currentIndex = 0;
let overrideHealthy = false;
let currentEventDuration = 0;

/**
 * Probabilistic anomaly generator.
 * Target: Roughly 1 anomaly event per minute.
 * Data cycle: 2 seconds.
 * 60s / 2s = 30 cycles per minute.
 * Event Start Probability: ~3% (0.033) per cycle.
 */
export const generateDataPoint = (): DataPoint => {
  const timestamp = Date.now();
  const raw = RAW_DATASET[currentIndex];
  
  // Cycle through dataset
  currentIndex = (currentIndex + 1) % RAW_DATASET.length;

  let isAnomaly = false;
  let ph = raw.ph;

  // Handle Ongoing Event (3 data points duration)
  if (currentEventDuration > 0 && !overrideHealthy) {
    isAnomaly = true;
    // Sustained out-of-bounds value
    ph = currentEventDuration % 2 === 0 ? 7.2 : 8.9; 
    currentEventDuration--;
  } else {
    // Chance to START a new event
    if (Math.random() < 0.03 && !overrideHealthy) {
      isAnomaly = true;
      currentEventDuration = 2; // Event will last for 3 total cycles (this one + 2 more)
      ph = Math.random() > 0.5 ? 7.15 : 8.85; 
    }
  }

  // Mandatory Boundary Check: Any data point falling outside 7.5-8.5 is an anomaly.
  if (ph < 7.5 || ph > 8.5) {
    isAnomaly = true;
  }

  const baselinePh = 8.0; 
  const residualError = ph - baselinePh;

  return {
    timestamp,
    ph: ph,
    temp: raw.temp,
    nitrate: raw.nitrate,
    ammonia: raw.ammonia,
    do: raw.do,
    turbidity: raw.turbidity,
    manganese: raw.manganese,
    isAnomaly: isAnomaly,
    baselinePh: baselinePh,
    residualError: Number(residualError.toFixed(3))
  };
};

export const getLiveState = (latestPoint: DataPoint): LiveState => {
  let status = AlertStatus.HEALTHY;
  
  if (latestPoint.isAnomaly) {
    status = AlertStatus.ANOMALY;
  } else if (Math.abs(latestPoint.residualError) > 0.3) {
    status = AlertStatus.DRIFT;
  }

  let forecastedLethalTime: number | null = null;
  if (status === AlertStatus.ANOMALY) {
    // Simple prediction logic
    if (latestPoint.ph < 7.5) {
      const unitsToLethal = latestPoint.ph - 6.0;
      forecastedLethalTime = Math.max(1, Math.round(unitsToLethal * 12));
    } else if (latestPoint.ph > 8.5) {
      const unitsToLethal = 9.5 - latestPoint.ph;
      forecastedLethalTime = Math.max(1, Math.round(unitsToLethal * 12));
    }
  }

  return {
    currentPh: latestPoint.ph,
    currentTemp: latestPoint.temp,
    nitrate: latestPoint.nitrate,
    ammonia: latestPoint.ammonia,
    do: latestPoint.do,
    status,
    lastUpdated: latestPoint.timestamp,
    forecastedLethalTime
  };
};

export const toggleAnomaly = (state: boolean) => {
  overrideHealthy = !state;
  if (!state) {
    currentIndex = 0;
    currentEventDuration = 0;
  }
};
