export interface PlantAnalysis {
  commonName: string;
  scientificName: string;
  description: string;
  lightRequirement: 'low' | 'medium' | 'high';
  wateringRequirement: 'low' | 'medium' | 'high';
  temperatureRange: string;
  toxicity: 'toxic' | 'safe' | 'unknown';
  difficulty: 'easy' | 'medium' | 'hard';
  funFacts: string[];
}

export interface PlantNote {
  id: string;
  date: string; // ISO string
  text: string;
}

export interface UserPlant extends PlantAnalysis {
  id: string;
  image: string; // Base64
  dateAdded: string; // ISO string
  isFavorite: boolean;
  notes: PlantNote[];
}

export type ViewState = 'HOME' | 'CAMERA' | 'DIARY' | 'FAVORITES' | 'DETAILS' | 'GENERATOR';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}