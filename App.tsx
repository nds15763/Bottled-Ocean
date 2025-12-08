import React, { useState, useEffect, useRef } from 'react';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import SimulationCanvas from './components/SimulationCanvas';
import { generateFishLore } from './services/geminiService';
import { AppMode, WeatherType, Fish } from './types';
import { FISH_DB, getRandomFish } from './utils/gameData';
import { Compass, BookOpen, Clock, Play, RotateCcw, X, Map, Utensils } from 'lucide-react';

const App: React.FC = () => {
  const { orientation, requestPermission, permissionGranted, isDesktop } = useDeviceOrientation();
  
  // App State
  const [mode, setMode] = useState<AppMode>(AppMode.MENU);
  const [weather, setWeather] = useState<WeatherType>(WeatherType.SUNNY);
  const [zenNightMode, setZenNightMode] = useState(false);
  
  // Game State
  const [focusDuration, setFocusDuration] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [caughtFish, setCaughtFish] = useState<Fish | null>(null);
  const [lore, setLore] = useState<string>("");
  const [loadingLore, setLoadingLore] = useState(false);
  
  // Collection
  const [collection, setCollection] = useState<string[]>([]);

  // Init
  useEffect(() => {
    const saved = localStorage.getItem('bottled_ocean_collection');
    if (saved) setCollection(JSON.parse(saved));
  }, []);

  // Weather Logic
  useEffect(() => {
    if (mode === AppMode.ZEN) {
        setWeather(zenNightMode ? WeatherType.NIGHT : WeatherType.SUNNY);
        return;
    }
    const h = new Date().getHours();
    if (h < 6 || h > 19) setWeather(WeatherType.NIGHT);
    else if (Math.random() > 0.7) setWeather(WeatherType.RAINY);
    else setWeather(WeatherType.SUNNY);
  }, [mode, zenNightMode]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (mode === AppMode.FOCUSING && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            handleSuccess();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, timeLeft]);

  // Actions
  const startFocus = (min: number) => {
    setFocusDuration(min);
    setTimeLeft(min * 60);
    setMode(AppMode.FOCUSING);
    if (!isDesktop && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const handleFail = () => {
    if (mode === AppMode.FOCUSING) {
        // Vibrate if possible
        if (navigator.vibrate) navigator.vibrate(200);
        alert("The line snapped! You touched the phone!");
        setMode(AppMode.MENU);
        if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    }
  };

  const handleSuccess = async () => {
    const fish = getRandomFish(focusDuration, weather);
    setCaughtFish(fish);
    setMode(AppMode.REWARD);
    
    // Save
    const newColl = [...new Set([...collection, fish.id])];
    setCollection(newColl);
    localStorage.setItem('bottled_ocean_collection', JSON.stringify(newColl));

    // Lore
    setLoadingLore(true);
    const text = await generateFishLore(fish, weather);
    setLore(text);
    setLoadingLore(false);
    
    if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // --- UI RENDERERS ---

  const renderMenu = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-8 animate-fade-in pointer-events-auto z-50">
      <div className="text-center space-y-2">
        <h1 className="text-6xl md:text-8xl font-black text-sky-600 drop-shadow-sm font-hand -rotate-2">
          Focus Fishing
        </h1>
        <p className="text-slate-500 font-bold text-lg font-hand">Put your phone in a bottle (figuratively)</p>
      </div>

      {!permissionGranted && !isDesktop && (
        <button onClick={requestPermission} className="bg-orange-400 text-white font-bold py-3 px-8 rounded-full shadow-lg transform active:scale-95 transition crayon-box font-hand text-xl">
           Start Adventure (Enable Sensors)
        </button>
      )}

      {(permissionGranted || isDesktop) && (
        <div className="flex flex-col gap-4 w-full max-w-md">
            <div className="bg-white p-6 rounded-2xl crayon-box transform rotate-1">
                <h3 className="text-xl font-bold text-slate-700 mb-4 font-hand flex items-center gap-2">
                    <Clock size={20} /> Select Focus Time
                </h3>
                <div className="flex justify-between gap-2">
                    {[25, 30, 45].map(m => (
                        <button key={m} onClick={() => startFocus(m)} 
                            className="flex-1 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold py-4 rounded-xl border-2 border-sky-200 transition active:scale-95 font-hand text-2xl">
                            {m}m
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setMode(AppMode.COLLECTION)} 
                    className="bg-white p-4 rounded-2xl crayon-box flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition -rotate-1">
                    <BookOpen className="text-orange-500" size={32} />
                    <span className="font-bold text-slate-600 font-hand text-xl">FishDex</span>
                </button>
                <button onClick={() => setMode(AppMode.ZEN)} 
                    className="bg-white p-4 rounded-2xl crayon-box flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition rotate-1">
                    <Compass className="text-green-500" size={32} />
                    <span className="font-bold text-slate-600 font-hand text-xl">Zen Mode</span>
                </button>
            </div>
        </div>
      )}
    </div>
  );

  const renderFocusing = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between py-12 pointer-events-none">
       <div className="bg-white/90 backdrop-blur px-8 py-4 rounded-full text-slate-700 font-hand text-6xl font-bold shadow-lg border-4 border-slate-100 mt-10">
          {formatTime(timeLeft)}
       </div>
       
       <div className="bg-orange-100 text-orange-800 px-6 py-4 rounded-xl shadow-lg max-w-xs text-center border-2 border-orange-200 mb-12 rotate-1 mx-4">
          <p className="font-bold text-2xl font-hand mb-1">Don't Touch!</p>
          <p className="text-sm font-hand">Touching the screen will scare the fish and break the line.</p>
       </div>

       {/* Trap layer for interaction penalty */}
       <div className="absolute inset-0 pointer-events-auto" onClick={handleFail}></div>
    </div>
  );

  const renderReward = () => (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative crayon-box animate-bounce-in">
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-8xl filter drop-shadow-lg">
            {caughtFish?.icon}
        </div>
        
        <div className="mt-12 space-y-2">
            <h2 className="text-4xl font-black text-slate-800 font-hand">{caughtFish?.name}</h2>
            <div className="inline-block px-3 py-1 bg-sky-100 text-sky-600 rounded-full text-xs font-bold font-hand uppercase tracking-widest border border-sky-200">
                {caughtFish?.rarity}
            </div>
        </div>

        <div className="my-6 bg-slate-50 p-4 rounded-xl border-2 border-slate-100 text-left relative">
            <div className="absolute -top-3 -left-2 bg-yellow-200 w-8 h-8 rounded-full opacity-50"></div>
            <p className="font-hand text-lg text-slate-600 relative z-10 leading-relaxed">
                {loadingLore ? "The fisherman is writing in his journal..." : `"${lore}"`}
            </p>
        </div>

        <button onClick={() => setMode(AppMode.MENU)} 
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 rounded-xl font-hand text-2xl shadow-md transition transform active:scale-95">
            Awesome!
        </button>
      </div>
    </div>
  );

  const renderCollection = () => (
    <div className="absolute inset-0 z-50 bg-slate-50 overflow-y-auto pointer-events-auto">
        <div className="p-6 pb-24 max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-slate-50/90 backdrop-blur py-4 z-10">
                <h2 className="text-4xl font-bold text-slate-800 font-hand">My FishDex</h2>
                <button onClick={() => setMode(AppMode.MENU)} className="p-2 bg-white rounded-full shadow border hover:bg-gray-100">
                    <X size={24} />
                </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {FISH_DB.map(fish => {
                    const caught = collection.includes(fish.id);
                    return (
                        <div key={fish.id} className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-4 text-center border-2 transition-all relative overflow-hidden
                            ${caught ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-100 border-dashed border-slate-300'}`}>
                            
                            {caught ? (
                                <>
                                    <div className="text-5xl mb-2 transform transition hover:scale-110 cursor-pointer">{fish.icon}</div>
                                    <p className="font-hand font-bold text-lg text-slate-700 leading-none">{fish.name}</p>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 mt-2 tracking-widest">{fish.rarity}</span>
                                </>
                            ) : (
                                <span className="text-4xl opacity-20 grayscale">{fish.icon}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );

  const renderZen = () => (
      <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-end p-8">
          <div className="bg-white/80 backdrop-blur p-4 rounded-2xl shadow-lg border border-white/50 pointer-events-auto flex justify-between items-center gap-4 max-w-sm mx-auto w-full mb-8">
              <div className="text-sm font-hand text-slate-600">
                  <p className="font-bold text-lg">Zen Mode</p>
                  <p>Chill & Watch.</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setZenNightMode(!zenNightMode)} className="p-3 bg-slate-200 rounded-full hover:bg-slate-300 transition">
                     {zenNightMode ? '☀️' : '🌙'}
                 </button>
                 <button onClick={() => setMode(AppMode.MENU)} className="p-3 bg-red-100 text-red-500 rounded-full hover:bg-red-200 transition">
                     <RotateCcw size={20} />
                 </button>
              </div>
          </div>
      </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-100 text-slate-800 select-none">
      
      {/* Background Canvas */}
      <SimulationCanvas 
         tilt={orientation.tilt} 
         weather={weather} 
         isFishing={mode === AppMode.FOCUSING} 
         caughtFishColor={mode === AppMode.REWARD ? caughtFish?.color : null}
         mode={mode}
      />

      {/* Main UI Router */}
      {mode === AppMode.MENU && renderMenu()}
      {mode === AppMode.FOCUSING && renderFocusing()}
      {mode === AppMode.REWARD && renderReward()}
      {mode === AppMode.COLLECTION && renderCollection()}
      {mode === AppMode.ZEN && renderZen()}

    </div>
  );
};

export default App;