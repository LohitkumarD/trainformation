export type CoachType = 'engine' | 'sleeper' | 'ac' | 'general' | 'other';

export interface Coach {
  id: string;
  code: string;
  type: CoachType;
}

export interface Train {
  id: string;
  number: string;
  name: string;
  coaches: Coach[];
  createdAt: number;
  updatedAt: number;
}

export interface OCRResult {
  trainNumbers: string[];
  coaches: Coach[];
  rawText: string;
}

export interface ParsedOCRSuggestion {
  trainNumber: string;
  coaches: Coach[];
}
