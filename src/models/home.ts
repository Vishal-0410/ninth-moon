export interface CreateMoodLogInput {
  id: string;
  uid: string;
  mood: string;
  logsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSymptomsLogInput {
  id: string;
  uid: string;
  symptoms: string[];
  createdAt: string;
  updatedAt: string;
  logCount: number;
}

export interface FertilityDetails {
  uid: string;
  lastMenstrualPeriod: string;
  nextOvulation: string;
  nextMenstrualPeriod: string;
  avgCycleLength: number;
  lutealLength:number
}
