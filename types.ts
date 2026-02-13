
export interface DataPoint {
  timestamp: number;
  ph: number;
  temp: number;
  nitrate: number;
  ammonia: number;
  do: number;
  turbidity: number;
  manganese: number;
  isAnomaly: boolean;
  baselinePh: number;
  residualError: number;
}

export enum AlertStatus {
  HEALTHY = 0,
  DRIFT = 1,
  ANOMALY = -1
}

export interface LiveState {
  currentPh: number;
  currentTemp: number;
  nitrate: number;
  ammonia: number;
  do: number;
  status: AlertStatus;
  lastUpdated: number;
  forecastedLethalTime: number | null; // minutes
}

export interface AnomalyLog {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  type: string;
  clearedAt?: number;
}

export interface UserSettings {
  baselineTrainingPeriod: number; // in hours
  smsContact: string;
  notificationsEnabled: boolean;
}
