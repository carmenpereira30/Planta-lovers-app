import React from 'react';
import { Heart, ChevronRight, Droplets } from 'lucide-react';
import { UserPlant } from '../types';

interface PlantCardProps {
  plant: UserPlant;
  onClick: (plant: UserPlant) => void;
  compact?: boolean;
}

export const PlantCard: React.FC<PlantCardProps> = ({ plant, onClick, compact = false }) => {
  if (compact) {
    return (
      <div 
        onClick={() => onClick(plant)}
        className="flex-shrink-0 w-36 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden snap-start cursor-pointer hover:shadow-md transition-all"
      >
        <div className="h-36 w-full relative bg-gray-100">
           <img src={plant.image} alt={plant.commonName} className="w-full h-full object-cover" />
           {plant.isFavorite && (
             <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1 rounded-full">
               <Heart size={12} className="fill-yellow-400 text-yellow-400" />
             </div>
           )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-gray-800 text-sm truncate">{plant.commonName}</h3>
          <p className="text-xs text-gray-500 italic truncate">{plant.scientificName}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => onClick(plant)}
      className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all mb-4"
    >
      <div className="h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
        <img src={plant.image} alt={plant.commonName} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-gray-800 text-lg truncate">{plant.commonName}</h3>
          {plant.isFavorite && <Heart size={16} className="fill-yellow-400 text-yellow-400 mt-1" />}
        </div>
        <p className="text-sm text-gray-500 italic truncate mb-2">{plant.scientificName}</p>
        <div className="flex items-center gap-2 text-xs text-brand-600 bg-brand-50 w-fit px-2 py-1 rounded-full">
          <Droplets size={10} />
          <span>Riego {plant.wateringRequirement === 'high' ? 'Frecuente' : plant.wateringRequirement === 'medium' ? 'Moderado' : 'Escaso'}</span>
        </div>
      </div>
      <ChevronRight className="text-gray-300" />
    </div>
  );
};