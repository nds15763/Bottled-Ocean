import React, { useState, useEffect, useCallback } from 'react';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import SimulationCanvas from './components/SimulationCanvas';
import { generateCaptainLog } from './services/geminiService';
import { Compass, RotateCcw, Info } from 'lucide-react';

const App: React.FC = () => {
  const { orientation, requestPermission, permissionGranted, isDesktop } = useDeviceOrientation();
  const [logEntry, setLogEntry] = useState<string>("Engines ready! Toot toot!");
  const [isGeneratingLog, setIsGeneratingLog] = useState(false);
  const [turbulence, setTurbulence] = useState(0);
  const [showIntro, setShowIntro] = useState(true);

  // Debounced log generator
  const updateLog = useCallback(async () => {
    if (isGeneratingLog) return;
    setIsGeneratingLog(true);
    // Convert radians to rough degrees 0-90 for the prompt context
    const tiltDeg = Math.abs(orientation.tilt * (180/Math.PI));
    const text = await generateCaptainLog(turbulence, tiltDeg);
    setLogEntry(text);
    setIsGeneratingLog(false);
  }, [turbulence, orientation.tilt, isGeneratingLog]);

  // Trigger log update occasionally based on turbulence or time
  useEffect(() => {
    const interval = setInterval(() => {
      // 10% chance to update log if not turbulent, higher chance if turbulent
      if (Math.random() > 0.9 || (turbulence > 50 && Math.random() > 0.5)) {
        updateLog();
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [updateLog, turbulence]);

  const handleStart = () => {
    requestPermission();
    setShowIntro(false);
  };

  const tiltDeg = (orientation.tilt * (180/Math.PI)).toFixed(1);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-50 select-none font-sans text-slate-800 touch-none">
      
      {/* Simulation Layer */}
      <SimulationCanvas 
        tilt={orientation.tilt} 
        onTurbulenceChange={setTurbulence} 
      />

      {/* Glass Bottle Reflections */}
      <div className="absolute inset-0 pointer-events-none border-[16px] border-white/50 rounded-[3rem] shadow-[inset_0_0_60px_rgba(255,255,255,0.5)] z-10"></div>
      <div className="absolute inset-0 pointer-events-none rounded-[3rem] shadow-[inset_10px_10px_40px_rgba(255,255,255,0.9),inset_-10px_-10px_40px_rgba(0,0,0,0.1)] z-20"></div>
      
      {/* Dynamic High Gloss that moves slightly opposite to tilt for realism */}
      <div 
        className="absolute top-12 left-12 w-32 h-64 bg-gradient-to-br from-white/40 to-transparent rounded-full -rotate-12 blur-xl z-20 pointer-events-none transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${-orientation.tilt * 50}px) rotate(${-12 + orientation.tilt * 10}deg)` }}
      ></div>

      {/* UI Controls */}
      <div className="absolute top-0 left-0 w-full p-6 z-30 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-black text-sky-600 tracking-tight drop-shadow-sm flex items-center gap-2" style={{ textShadow: '2px 2px 0px white' }}>
            <Compass className="w-8 h-8 text-orange-500 fill-orange-500 stroke-white stroke-2" />
            Toy Ocean
          </h1>
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-4 border-white max-w-xs transition-all duration-500 transform hover:scale-105 origin-top-left">
            <p className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">Captain's Log</p>
            <p className="text-lg font-bold text-slate-700 leading-tight font-sans">
              "{logEntry}"
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-0 w-full flex justify-center z-30 pointer-events-auto px-4">
        {showIntro && !permissionGranted && !isDesktop && (
           <button 
             onClick={handleStart}
             className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold py-4 px-10 rounded-full shadow-[0_10px_20px_rgba(249,115,22,0.4)] transition-transform transform hover:scale-105 active:scale-95 animate-bounce border-4 border-white/30"
           >
             Start Voyage! ⚓
           </button>
        )}
        
        {isDesktop && showIntro && (
           <div className="bg-white/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border-4 border-sky-100 text-center max-w-md mx-4">
             <div className="flex justify-center mb-4 text-sky-500">
                <Info size={40} className="fill-sky-100" />
             </div>
             <h3 className="font-black text-2xl text-slate-800 mb-2">Ahoy Captain!</h3>
             <p className="text-slate-600 mb-6 text-lg">
               Since you don't have a gyroscope, <b>move your mouse</b> left/right to tilt the ocean!
             </p>
             <button 
               onClick={() => setShowIntro(false)}
               className="bg-sky-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-sky-600 transition shadow-lg"
             >
               Aye Aye!
             </button>
           </div>
        )}
      </div>

      {/* Ambient Data Overlay */}
      <div className="absolute bottom-8 right-8 z-30 text-right opacity-60 pointer-events-none hidden sm:block">
        <div className="flex items-center justify-end gap-2 text-sky-700 text-sm font-bold">
          <span>TILT: {tiltDeg}°</span>
          <RotateCcw className="w-4 h-4" />
        </div>
      </div>

    </div>
  );
};

export default App;