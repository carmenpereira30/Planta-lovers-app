import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Loader2, 
  Sun, 
  CloudRain, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  Heart, 
  Plus, 
  Calendar,
  Sparkles,
  Info,
  Star,
  Book,
  Wand2,
  Image as ImageIcon
} from 'lucide-react';
import { Navigation } from './components/Navigation';
import { PlantCard } from './components/PlantCard';
import { identifyPlant, generatePlantImage } from './services/ai';
import { getPlants, savePlant, toggleFavoritePlant, addNoteToPlant, deletePlant } from './services/storage';
import { UserPlant, ViewState, PlantAnalysis, ToastMessage } from './types';

// --- Helper Components --- //

const Badge: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div className={`flex flex-col items-center justify-center p-3 rounded-2xl ${color} bg-opacity-10 w-full`}>
    <div className={`mb-1 ${color.replace('bg-', 'text-')}`}>{icon}</div>
    <span className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">{label}</span>
    <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{value}</span>
  </div>
);

const NoteItem: React.FC<{ note: { date: string, text: string } }> = ({ note }) => (
  <div className="pl-4 border-l-2 border-brand-200 ml-2 relative pb-6">
    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-brand-500"></div>
    <span className="text-xs text-gray-400 font-mono mb-1 block">
      {new Date(note.date).toLocaleDateString()}
    </span>
    <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-sm">
      {note.text}
    </p>
  </div>
);

const Toast: React.FC<{ message: ToastMessage | null }> = ({ message }) => {
  if (!message) return null;
  const bg = message.type === 'success' ? 'bg-green-500' : message.type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 ${bg} text-white px-6 py-3 rounded-full shadow-lg z-[100] animate-fade-in-down flex items-center gap-2`}>
      {message.type === 'success' && <CheckCircle2 size={18} />}
      {message.type === 'error' && <AlertTriangle size={18} />}
      <span className="text-sm font-medium">{message.text}</span>
    </div>
  );
};

// --- Main App Component --- //

export default function App() {
  const [view, setView] = useState<ViewState>('HOME');
  const [plants, setPlants] = useState<UserPlant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<UserPlant | null>(null);
  
  // Camera & Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PlantAnalysis | null>(null);
  
  // Refs for different file inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Generator State
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    // Load plants on mount
    setPlants(getPlants());
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Actions --- //

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset inputs so same file can be selected again if needed
    e.target.value = '';
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCapturedImage(base64);
      runIdentification(base64);
    };
    reader.readAsDataURL(file);
  };

  const runIdentification = (base64Image: string) => {
    setAnalyzing(true);
    identifyPlant(base64Image)
      .then(data => {
        setAnalysisResult(data);
      })
      .catch(err => {
        showToast('error', err.message || "Error identificando la planta.");
        setCapturedImage(null);
      })
      .finally(() => {
        setAnalyzing(false);
      });
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGeneratedImage(null);
    try {
      const base64 = await generatePlantImage(prompt + " . Photorealistic, high quality, botanical photography style.");
      setGeneratedImage(base64);
    } catch (e) {
      showToast('error', "No se pudo generar la imagen. Intenta de nuevo.");
    } finally {
      setGenerating(false);
    }
  };

  const analyzeGeneratedImage = () => {
    if (generatedImage) {
      setCapturedImage(generatedImage);
      setGeneratedImage(null);
      setPrompt('');
      setView('CAMERA'); // Reuse camera view logic for analysis display
      runIdentification(generatedImage);
    }
  };

  const saveCurrentPlant = () => {
    if (!analysisResult || !capturedImage) return;
    
    const newPlant: UserPlant = {
      ...analysisResult,
      id: Date.now().toString(),
      image: capturedImage,
      dateAdded: new Date().toISOString(),
      isFavorite: false,
      notes: []
    };

    savePlant(newPlant);
    setPlants(prev => [newPlant, ...prev]);
    showToast('success', '¡Planta guardada en tu diario!');
    
    // Reset and go to details
    setCapturedImage(null);
    setAnalysisResult(null);
    setSelectedPlant(newPlant);
    setView('DETAILS');
  };

  const handleToggleFavorite = (plantId: string) => {
    const updated = toggleFavoritePlant(plantId);
    if (updated) {
      setPlants(prev => prev.map(p => p.id === plantId ? updated : p));
      if (selectedPlant?.id === plantId) setSelectedPlant(updated);
    }
  };

  const handleAddNote = (text: string) => {
    if (!selectedPlant || !text.trim()) return;
    const updated = addNoteToPlant(selectedPlant.id, text);
    if (updated) {
      setPlants(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedPlant(updated);
      showToast('success', 'Nota añadida');
    }
  };

  // --- Views --- //

  const renderHome = () => {
    const recent = plants.slice(0, 5);
    const favorites = plants.filter(p => p.isFavorite);

    return (
      <div className="pb-24 pt-8 px-4 max-w-md mx-auto min-h-screen">
        <header className="mb-8">
          <p className="text-gray-500 text-sm mb-1">Buenos días,</p>
          <h1 className="text-3xl font-bold text-gray-800">
            ¿Qué descubriremos hoy? 🌿
          </h1>
        </header>

        {/* Hero Actions Grid */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          
          {/* Identify Card */}
          <div className="bg-gradient-to-br from-brand-600 to-emerald-800 rounded-3xl p-6 text-white shadow-xl shadow-brand-200 relative overflow-hidden group cursor-pointer" onClick={() => setView('CAMERA')}>
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-4">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                    <Camera size={24} className="text-white" />
                  </div>
                  <span className="bg-brand-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">AI Vision</span>
               </div>
               <h2 className="text-2xl font-bold mb-1">Identificar Planta</h2>
               <p className="text-brand-100 text-sm mb-4">Usa la cámara o sube una foto.</p>
               <div className="flex items-center text-sm font-semibold gap-1 group-hover:gap-2 transition-all">
                 Escanear ahora <ArrowLeft className="rotate-180" size={16} />
               </div>
             </div>
             {/* Decorative */}
             <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          </div>

          {/* Generator Card */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-purple-200 relative overflow-hidden group cursor-pointer" onClick={() => setView('GENERATOR')}>
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-4">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                    <Wand2 size={24} className="text-white" />
                  </div>
                  <span className="bg-purple-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Nano Banana AI</span>
               </div>
               <h2 className="text-2xl font-bold mb-1">Crear Planta</h2>
               <p className="text-purple-100 text-sm mb-4">Genera especies únicas con IA.</p>
               <div className="flex items-center text-sm font-semibold gap-1 group-hover:gap-2 transition-all">
                 Imaginar <ArrowLeft className="rotate-180" size={16} />
               </div>
             </div>
             {/* Decorative */}
             <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
             <div className="absolute right-4 top-4 text-purple-400 opacity-20">
               <Sparkles size={64} />
             </div>
          </div>

        </div>

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-lg">Favoritas ⭐</h3>
              <button onClick={() => setView('FAVORITES')} className="text-brand-600 text-xs font-semibold">Ver todas</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x">
              {favorites.map(plant => (
                <PlantCard key={plant.id} plant={plant} onClick={(p) => { setSelectedPlant(p); setView('DETAILS'); }} compact />
              ))}
            </div>
          </div>
        )}

        {/* Recent Journal */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 text-lg">Recientes en tu diario</h3>
            <button onClick={() => setView('DIARY')} className="text-brand-600 text-xs font-semibold">Ver todo</button>
          </div>
          <div className="space-y-3">
            {recent.length === 0 ? (
               <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                 <p className="text-gray-400 text-sm">Aún no has guardado ninguna planta.</p>
                 <button onClick={() => setView('CAMERA')} className="text-brand-600 font-medium text-sm mt-2">¡Escanea la primera!</button>
               </div>
            ) : (
              recent.map(plant => (
                <PlantCard key={plant.id} plant={plant} onClick={(p) => { setSelectedPlant(p); setView('DETAILS'); }} />
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGenerator = () => {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
        <div className="p-4 flex items-center justify-between bg-white shadow-sm sticky top-0 z-10">
          <button onClick={() => setView('HOME')} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Wand2 size={18} className="text-purple-600" /> Estudio AI
          </h2>
          <div className="w-10"></div>
        </div>

        <div className="max-w-md mx-auto p-6 flex flex-col items-center">
          
          {!generatedImage && (
            <div className="w-full text-center mb-8 mt-4">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                <ImageIcon size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Imagina tu planta</h3>
              <p className="text-gray-500 text-sm">Describe cómo sería tu planta ideal y la IA la creará visualmente para ti.</p>
            </div>
          )}

          {generatedImage ? (
            <div className="w-full animate-fade-in mb-8">
              <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-white mb-6">
                <img src={generatedImage} className="w-full h-auto" alt="Generated Plant" />
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={analyzeGeneratedImage}
                  className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Camera size={20} />
                  Analizar y Guardar
                </button>
                <button 
                  onClick={() => setGeneratedImage(null)}
                  className="w-full bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Generar otra
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: Una orquídea azul brillante creciendo sobre una roca volcánica..."
                  className="w-full h-32 p-4 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none text-gray-700 shadow-sm"
                  disabled={generating}
                />
              </div>
              
              <button 
                onClick={handleGenerateImage}
                disabled={generating || !prompt.trim()}
                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2
                  ${generating || !prompt.trim() 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-purple-300'
                  }`}
              >
                {generating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Creando magia...
                  </>
                ) : (
                  <>
                    <Wand2 size={20} />
                    Generar Imagen
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    );
  };

  const renderCamera = () => {
    if (analyzing) {
      return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 text-center">
          <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-4 border-brand-200 rounded-full animate-ping opacity-25"></div>
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl">
               {capturedImage && <img src={capturedImage} className="w-full h-full object-cover" alt="Analyzing" />}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-brand-500 text-white p-2 rounded-full animate-bounce">
              <Sparkles size={20} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Analizando... 🌱</h2>
          <p className="text-gray-500 animate-pulse">Nuestra IA está identificando tu planta y buscando los mejores consejos de cuidado.</p>
        </div>
      );
    }

    if (analysisResult && capturedImage) {
      return (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto pb-24">
          <div className="relative h-72 w-full">
            <img src={capturedImage} className="w-full h-full object-cover" alt="Result" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <button 
              onClick={() => { setCapturedImage(null); setAnalysisResult(null); setView('HOME'); }}
              className="absolute top-4 left-4 bg-black/30 backdrop-blur-md text-white p-2 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="relative -mt-6 bg-white rounded-t-3xl px-6 py-8 min-h-[50vh]">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-1">{analysisResult.commonName}</h2>
              <p className="text-gray-500 italic font-medium">{analysisResult.scientificName}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <Badge icon={<Sun size={20} />} label="Luz" value={analysisResult.lightRequirement === 'high' ? 'Directa' : analysisResult.lightRequirement === 'medium' ? 'Indirecta' : 'Sombra'} color="bg-orange-100 text-orange-500" />
              <Badge icon={<CloudRain size={20} />} label="Riego" value={analysisResult.wateringRequirement === 'high' ? 'Frecuente' : analysisResult.wateringRequirement === 'medium' ? 'Moderado' : 'Escaso'} color="bg-blue-100 text-blue-500" />
            </div>

            <div className="prose prose-sm text-gray-600 mb-8">
               <h3 className="text-gray-800 font-bold mb-2">Sobre esta planta</h3>
               <p>{analysisResult.description}</p>
            </div>

            <button 
              onClick={saveCurrentPlant}
              className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 />
              Guardar en mi Diario
            </button>
          </div>
        </div>
      );
    }

    // Default Camera UI
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="absolute top-0 w-full p-4 flex justify-between items-center z-10">
          <button onClick={() => setView('HOME')} className="text-white p-2 bg-white/10 rounded-full backdrop-blur-md">
            <X size={24} />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-900">
          <p className="text-white/60 mb-8">Cargando cámara...</p>
          <div className="absolute inset-0 pointer-events-none border-[30px] border-black/40"></div>
          <div className="absolute w-64 h-64 border-2 border-white/50 rounded-2xl pointer-events-none">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1"></div>
          </div>
        </div>

        {/* Controls */}
        <div className="h-48 bg-black flex flex-col items-center justify-center gap-4 pb-8">
           <p className="text-white text-sm font-medium">Apunta a la planta</p>
           <div className="relative">
             <button className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg flex items-center justify-center relative z-0">
               <div className="w-16 h-16 bg-white rounded-full border-2 border-black"></div>
             </button>
             {/* Camera specific input */}
             <input 
               type="file" 
               accept="image/*" 
               capture="environment"
               ref={cameraInputRef}
               onChange={handleImageInput}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rounded-full"
             />
           </div>
           
           <div className="flex gap-4">
             {/* Gallery specific input (hidden) */}
             <input 
               type="file" 
               accept="image/*" 
               ref={galleryInputRef}
               onChange={handleImageInput}
               className="hidden"
             />
            <button 
              onClick={() => galleryInputRef.current?.click()}
              className="text-white/80 text-xs flex items-center gap-1 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              <Upload size={14} /> Subir archivo
            </button>
           </div>
        </div>
      </div>
    );
  };

  const renderDetails = () => {
    if (!selectedPlant) return null;

    return (
      <div className="bg-white min-h-screen pb-24">
        {/* Header Image */}
        <div className="relative h-80 w-full">
          <img src={selectedPlant.image} className="w-full h-full object-cover" alt={selectedPlant.commonName} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"></div>
          
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white">
            <button onClick={() => setView('HOME')} className="p-2 bg-black/20 backdrop-blur-md rounded-full">
              <ArrowLeft size={20} />
            </button>
            <div className="flex gap-2">
               <button 
                 onClick={() => {
                   if(confirm('¿Borrar esta planta?')) {
                     deletePlant(selectedPlant.id);
                     setPlants(prev => prev.filter(p => p.id !== selectedPlant.id));
                     setView('HOME');
                     showToast('info', 'Planta eliminada');
                   }
                 }}
                 className="p-2 bg-black/20 backdrop-blur-md rounded-full hover:bg-red-500/50 transition-colors"
               >
                 <X size={20} />
               </button>
               <button 
                 onClick={() => handleToggleFavorite(selectedPlant.id)}
                 className={`p-2 backdrop-blur-md rounded-full transition-all ${selectedPlant.isFavorite ? 'bg-yellow-400 text-white' : 'bg-black/20 text-white'}`}
               >
                 <Heart size={20} fill={selectedPlant.isFavorite ? 'currentColor' : 'none'} />
               </button>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-3xl font-bold text-white mb-1 shadow-black/10 drop-shadow-md">{selectedPlant.commonName}</h1>
            <p className="text-white/80 italic font-medium">{selectedPlant.scientificName}</p>
          </div>
        </div>

        <div className="px-6 py-8 -mt-6 bg-white rounded-t-3xl relative z-10">
          
          {/* Care Cards Grid */}
          <div className="grid grid-cols-3 gap-3 mb-8">
             <Badge icon={<Sun size={18} />} label="Luz" value={selectedPlant.lightRequirement} color="bg-orange-100 text-orange-600" />
             <Badge icon={<CloudRain size={18} />} label="Riego" value={selectedPlant.wateringRequirement} color="bg-blue-100 text-blue-600" />
             <Badge icon={<Thermometer size={18} />} label="Temp" value={selectedPlant.temperatureRange.split(' ')[0]} color="bg-red-100 text-red-500" />
          </div>

          {/* Info Section */}
          <div className="mb-8 space-y-4">
             <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-2">
                  <Info size={16} className="text-brand-500" />
                  Cuidados
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedPlant.description}</p>
             </div>

             <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <h3 className="flex items-center gap-2 font-bold text-purple-800 mb-2">
                  <Sparkles size={16} />
                  Curiosidades
                </h3>
                <ul className="list-disc list-inside text-sm text-purple-700 space-y-1">
                  {selectedPlant.funFacts.map((fact, i) => <li key={i}>{fact}</li>)}
                </ul>
             </div>
             
             {selectedPlant.toxicity === 'toxic' && (
               <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-start gap-3 text-sm">
                 <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                 <span><strong>Precaución:</strong> Esta planta puede ser tóxica para mascotas o niños.</span>
               </div>
             )}
          </div>

          {/* Diary / Timeline */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-gray-800">Mi Diario</h3>
              <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                {selectedPlant.notes.length} notas
              </span>
            </div>

            <div className="mb-6">
              {selectedPlant.notes.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No hay notas aún. ¡Añade la primera!</p>
              ) : (
                <div className="mt-4">
                  {selectedPlant.notes.map(note => <NoteItem key={note.id} note={note} />)}
                </div>
              )}
            </div>

            {/* Add Note Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('note') as HTMLInputElement;
                handleAddNote(input.value);
                input.value = '';
              }}
              className="flex gap-2"
            >
              <input 
                name="note"
                type="text" 
                placeholder="Añadir nota (ej: Regada hoy, nueva hoja...)" 
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button 
                type="submit"
                className="bg-brand-600 text-white p-3 rounded-xl hover:bg-brand-700 transition-colors"
              >
                <Plus size={20} />
              </button>
            </form>
          </div>

        </div>
      </div>
    );
  };

  const renderGallery = (filterFavorites: boolean) => {
    const displayedPlants = filterFavorites 
      ? plants.filter(p => p.isFavorite) 
      : plants;

    return (
      <div className="pb-24 pt-8 px-4 max-w-md mx-auto min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {filterFavorites ? 'Mis Favoritas ⭐' : 'Mi Diario Botánico 📖'}
        </h1>
        
        {displayedPlants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              {filterFavorites ? <Star size={40} className="text-gray-400" /> : <Book size={40} className="text-gray-400" />}
            </div>
            <p className="text-gray-500">
              {filterFavorites ? 'No tienes favoritas aún.' : 'Tu diario está vacío.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {displayedPlants.map(plant => (
              <PlantCard key={plant.id} plant={plant} onClick={(p) => { setSelectedPlant(p); setView('DETAILS'); }} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <Toast message={toast} />

      {view === 'HOME' && renderHome()}
      {view === 'CAMERA' && renderCamera()}
      {view === 'DETAILS' && renderDetails()}
      {view === 'DIARY' && renderGallery(false)}
      {view === 'FAVORITES' && renderGallery(true)}
      {view === 'GENERATOR' && renderGenerator()}

      {/* Navigation is visible unless in Camera, Details, or Generator view */}
      {(view !== 'CAMERA' && view !== 'DETAILS' && view !== 'GENERATOR') && (
        <Navigation currentView={view} setView={setView} />
      )}
    </div>
  );
}