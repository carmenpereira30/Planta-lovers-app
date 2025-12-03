import { UserPlant, PlantNote } from '../types';

const STORAGE_KEY = 'botanical_diary_plants_v1';

export const getPlants = (): UserPlant[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load plants", e);
    return [];
  }
};

export const savePlant = (plant: UserPlant): void => {
  const plants = getPlants();
  const updatedPlants = [plant, ...plants];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlants));
};

export const updatePlant = (updatedPlant: UserPlant): void => {
  const plants = getPlants();
  const index = plants.findIndex(p => p.id === updatedPlant.id);
  if (index !== -1) {
    plants[index] = updatedPlant;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
  }
};

export const deletePlant = (id: string): void => {
  const plants = getPlants();
  const filtered = plants.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const addNoteToPlant = (plantId: string, noteText: string): UserPlant | null => {
  const plants = getPlants();
  const index = plants.findIndex(p => p.id === plantId);
  if (index === -1) return null;

  const newNote: PlantNote = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    text: noteText
  };

  const plant = plants[index];
  plant.notes = [newNote, ...(plant.notes || [])];
  
  plants[index] = plant;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
  
  return plant;
};

export const toggleFavoritePlant = (plantId: string): UserPlant | null => {
  const plants = getPlants();
  const index = plants.findIndex(p => p.id === plantId);
  if (index === -1) return null;

  plants[index].isFavorite = !plants[index].isFavorite;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
  
  return plants[index];
};