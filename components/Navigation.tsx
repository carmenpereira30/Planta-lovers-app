import React from 'react';
import { Home, Camera, Book, Star } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  
  const navItemClass = (view: ViewState) => `
    flex flex-col items-center justify-center w-full h-full space-y-1
    ${currentView === view || (currentView === 'DETAILS' && view === 'DIARY') 
      ? 'text-brand-600' 
      : 'text-gray-400 hover:text-gray-600'}
    transition-colors duration-200
  `;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 pb-safe">
      <div className="flex justify-around items-center h-full max-w-md mx-auto px-2">
        
        <button onClick={() => setView('HOME')} className={navItemClass('HOME')}>
          <Home size={24} strokeWidth={currentView === 'HOME' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Inicio</span>
        </button>

        <button onClick={() => setView('DIARY')} className={navItemClass('DIARY')}>
          <Book size={24} strokeWidth={currentView === 'DIARY' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Diario</span>
        </button>

        {/* Floating Action Button for Camera */}
        <div className="relative -top-6">
          <button 
            onClick={() => setView('CAMERA')}
            className="flex items-center justify-center w-16 h-16 bg-brand-500 rounded-full shadow-lg shadow-brand-500/40 text-white transform transition-transform active:scale-95 hover:bg-brand-600"
          >
            <Camera size={32} />
          </button>
        </div>

        <button onClick={() => setView('FAVORITES')} className={navItemClass('FAVORITES')}>
          <Star size={24} strokeWidth={currentView === 'FAVORITES' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Favoritos</span>
        </button>

      </div>
    </nav>
  );
};