
import React, { useState, useEffect, useRef } from 'react';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import SimulationCanvas from './components/SimulationCanvas';
import { generateFishLore } from './services/geminiService';
import { fetchLocalWeather } from './services/weatherService';
import { AppMode, WeatherType, Fish, AtmosphereState } from './types';
import { FISH_DB, getRandomFish } from './utils/gameData';
import { Compass, BookOpen, Clock, RotateCcw, X, MapPin, CloudRain, Wind, Thermometer, Anchor, Sun, Moon, CloudLightning, CloudDrizzle, Settings, ChevronDown, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const { orientation, requestPermission, permissionGranted, isDesktop } = useDeviceOrientation();
  
  // App State
  const [mode, setMode] = useState<AppMode>(AppMode.MENU);
  
  // Weather / Atmosphere State
  const [atmosphere, setAtmosphere] = useState<AtmosphereState>({
      type: WeatherType.SUNNY,
      localHour: 12,
      waveAmp: 1, // Default 1px
      waveSpeed: 0.1,
      windSpeed: 1, // Default 1
      temperature: 24,
      hasRainbow: false,
      isDay: true,
      lightning: false
  });
  
  const [locationName, setLocationName] = useState<string>("Unknown Waters");
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  
  // Debug / Zen State
  const [debugHour, setDebugHour] = useState(12);
  const [debugWind, setDebugWind] = useState(1); // Default to 1
  const [debugWeather, setDebugWeather] = useState<WeatherType>(WeatherType.SUNNY);
  const [zenPanelOpen, setZenPanelOpen] = useState(false);

  // Game State
  const [focusDuration, setFocusDuration] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [caughtFish, setCaughtFish] = useState<Fish | null>(null);
  const [lore, setLore] = useState<string>("");
  const [loadingLore, setLoadingLore] = useState(false);
  
  // Collection
  const [collection, setCollection] = useState<string[]>([]);

  // Init Collection
  useEffect(() => {
    const saved = localStorage.getItem('bottled_ocean_collection');
    if (saved) setCollection(JSON.parse(saved));
  }, []);

  // Time ticker for Dashboard
  useEffect(() => {
    const updateTime = () => {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Weather Logic
  const handleEnableWeather = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            setLocationName(`${pos.coords.latitude.toFixed(1)}°N, ${pos.coords.longitude.toFixed(1)}°E`);
            const weatherData = await fetchLocalWeather(pos.coords.latitude, pos.coords.longitude);
            setAtmosphere(weatherData);
            setWeatherEnabled(true);
        }, (err) => {
            console.error("Geo Error", err);
            alert("Could not fetch location. Using simulated weather.");
        });
      } else {
          alert("Geolocation not supported.");
      }
  };

  // Debug / Zen Mode Effect
  useEffect(() => {
    if (mode === AppMode.ZEN) {
        // Calculate physics based on debug sliders (Max wind 50)
        
        // Amplitude: 1:1 Mapping. Wind 1 = 1px.
        // If wind is 0, give it a tiny bit of life (0.5)
        let waveAmp = debugWind === 0 ? 0.5 : debugWind;
        
        // Speed: Map 0-50 wind to sensible speed range
        // Wind 0 = 0.05 (Static breathing)
        // Wind 1 = 0.08 (Very slow)
        // Wind 50 = 1.2 (Fast)
        let waveSpeed = 0.05 + (debugWind / 50) * 1.15;
        
        // Storm overrides
        let isStorm = debugWeather === WeatherType.STORM;
        if (isStorm) {
            waveAmp = Math.max(waveAmp, 45);
            waveSpeed = Math.max(waveSpeed, 1.0);
        }

        // Day/Night logic based on slider
        const isDay = debugHour >= 6 && debugHour <= 18;
        
        // Rainbow logic (Only day, sunny or rainy)
        const hasRainbow = isDay && debugWeather === WeatherType.SUNNY && Math.random() < 0.2;

        setAtmosphere({
            type: debugWeather,
            localHour: debugHour,
            waveAmp,
            waveSpeed,
            windSpeed: debugWind,
            temperature: 20, // Static for debug
            hasRainbow,
            isDay,
            lightning: isStorm
        });
    }
  }, [mode, debugHour, debugWind, debugWeather]);

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
        if (navigator.vibrate) navigator.vibrate(200);
        alert("The line snapped! You touched the phone!");
        setMode(AppMode.MENU);
        if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    }
  };

  const handleSuccess = async () => {
    const fish = getRandomFish(focusDuration, atmosphere.type);
    setCaughtFish(fish);
    setMode(AppMode.REWARD);
    
    // Save
    const newColl = [...new Set([...collection, fish.id])];
    setCollection(newColl);
    localStorage.setItem('bottled_ocean_collection', JSON.stringify(newColl));

    // Lore
    setLoadingLore(true);
    const text = await generateFishLore(fish, atmosphere.type);
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
    <div className="absolute inset-0 flex flex-col landscape:flex-row items-center justify-between landscape:justify-center p-6 landscape:gap-12 animate-fade-in pointer-events-auto z-50 overflow-y-auto landscape:overflow-hidden">
      
      {/* Header Area */}
      <div className="text-center landscape:text-left space-y-2 mt-10 landscape:mt-0 landscape:flex-1 landscape:flex landscape:flex-col landscape:items-start landscape:pl-8">
        <h1 className="text-6xl md:text-8xl landscape:text-6xl font-black text-sky-600 drop-shadow-sm font-hand -rotate-2">
          Focus Fishing
        </h1>
        <div className="flex items-center justify-center landscape:justify-start gap-2 text-slate-500 font-bold font-hand text-lg landscape:text-xl">
            <Anchor size={20} /> 
            <span>Put your phone in a bottle</span>
        </div>
      </div>

      {/* Main Controls Center */}
      <div className="flex flex-col gap-6 w-full max-w-md landscape:w-96 landscape:flex-1 landscape:pr-8 landscape:justify-center">
        
        {(!permissionGranted && !isDesktop) ? (
            <button onClick={requestPermission} className="bg-orange-400 text-white font-bold py-3 px-8 rounded-full shadow-lg transform active:scale-95 transition crayon-box font-hand text-xl w-full">
            Start Adventure (Enable Sensors)
            </button>
        ) : (
            <>
                <div className="bg-white p-6 landscape:p-5 rounded-2xl crayon-box transform rotate-1 shadow-xl">
                    <h3 className="text-xl landscape:text-lg font-bold text-slate-700 mb-4 landscape:mb-2 font-hand flex items-center gap-2">
                        <Clock size={20} /> Select Focus Time
                    </h3>
                    <div className="flex justify-between gap-2">
                        {[25, 30, 45].map(m => (
                            <button key={m} onClick={() => startFocus(m)} 
                                className="flex-1 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold py-4 landscape:py-3 rounded-xl border-2 border-sky-200 transition active:scale-95 font-hand text-2xl landscape:text-xl">
                                {m}m
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setMode(AppMode.COLLECTION)} 
                        className="bg-white p-4 landscape:p-3 rounded-2xl crayon-box flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition -rotate-1 shadow-md">
                        <BookOpen className="text-orange-500" size={32} />
                        <span className="font-bold text-slate-600 font-hand text-xl landscape:text-lg">FishDex</span>
                    </button>
                    <button onClick={() => setMode(AppMode.ZEN)} 
                        className="bg-white p-4 landscape:p-3 rounded-2xl crayon-box flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition rotate-1 shadow-md">
                        <Settings className="text-green-500" size={32} />
                        <span className="font-bold text-slate-600 font-hand text-xl landscape:text-lg">Zen Mode</span>
                    </button>
                </div>
                
                 {/* Weather Sync Button (Integrated into Right Column for Landscape) */}
                <div className="w-full">
                    {!weatherEnabled ? (
                        <button 
                            onClick={handleEnableWeather}
                            className="w-full bg-indigo-50/80 hover:bg-indigo-100 backdrop-blur-sm border-2 border-indigo-200 text-indigo-700 p-4 landscape:p-3 rounded-2xl flex items-center justify-between group transition-all"
                        >
                            <div className="flex flex-col text-left">
                                <span className="font-bold font-hand text-lg landscape:text-base">Sync Weather</span>
                                <span className="text-xs text-indigo-400 font-sans hidden sm:block">Real-time effects</span>
                            </div>
                            <div className="bg-indigo-200 p-2 rounded-full text-indigo-700 group-hover:scale-110 transition">
                                <CloudRain size={20} />
                            </div>
                        </button>
                    ) : (
                        <div className="w-full bg-emerald-50/80 backdrop-blur-sm border-2 border-emerald-200 text-emerald-700 p-4 landscape:p-3 rounded-2xl flex items-center gap-3">
                            <div className="bg-emerald-200 p-2 rounded-full">
                                <MapPin size={18} />
                            </div>
                            <div className="flex flex-col text-left overflow-hidden">
                                <span className="font-bold font-hand text-lg landscape:text-base whitespace-nowrap">Ocean Synced</span>
                                <span className="text-xs text-emerald-500 font-sans truncate">{locationName}</span>
                            </div>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
      
      {/* Spacer for portrait bottom area */}
      <div className="landscape:hidden h-8"></div>
    </div>
  );

  const renderFocusing = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between py-12 landscape:py-4 pointer-events-none">
       
       {/* Marine Dashboard (Top Left) */}
       <div className="absolute top-6 left-6 landscape:top-4 landscape:left-4 pointer-events-none animate-fade-in landscape:origin-top-left landscape:scale-90">
           <div className="bg-white/90 backdrop-blur-sm border-2 border-slate-200 p-4 rounded-lg shadow-lg rotate-1 crayon-box max-w-[160px]">
               <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Ship's Log</h4>
               
               <div className="space-y-2 font-hand text-slate-700">
                   <div className="flex items-center gap-2">
                       <Clock size={16} className="text-sky-500"/>
                       <span className="font-bold text-lg">{currentTime}</span>
                   </div>
                   
                   <div className="flex items-center gap-2">
                       <Thermometer size={16} className="text-orange-500"/>
                       <span>{atmosphere.temperature.toFixed(1)}°C</span>
                   </div>

                   <div className="flex items-center gap-2">
                       <Wind size={16} className="text-teal-500"/>
                       <span>{atmosphere.windSpeed} km/h</span>
                   </div>
                   
                   <div className="flex items-center gap-2 text-sm">
                        {atmosphere.type === WeatherType.SUNNY && <div className="text-yellow-500 flex gap-1 items-center">☀️ Sunny</div>}
                        {atmosphere.type === WeatherType.RAINY && <div className="text-blue-500 flex gap-1 items-center">🌧️ Rainy</div>}
                        {atmosphere.type === WeatherType.STORM && <div className="text-slate-600 flex gap-1 items-center">⛈️ Storm</div>}
                        {atmosphere.type === WeatherType.NIGHT && <div className="text-indigo-500 flex gap-1 items-center">🌙 Clear</div>}
                   </div>
               </div>
           </div>
       </div>

       {/* Timer */}
       <div className="bg-white/90 backdrop-blur px-8 py-4 rounded-full text-slate-700 font-hand text-6xl landscape:text-5xl font-bold shadow-lg border-4 border-slate-100 mt-20 landscape:mt-2 transition-all">
          {formatTime(timeLeft)}
       </div>
       
       {/* Warning */}
       <div className="bg-orange-100 text-orange-800 px-6 py-4 rounded-xl shadow-lg max-w-xs text-center border-2 border-orange-200 mb-12 landscape:mb-2 rotate-1 mx-4 transition-all">
          <p className="font-bold text-2xl landscape:text-xl font-hand mb-1">Don't Touch!</p>
          <p className="text-sm font-hand landscape:text-xs">Touching the screen will scare the fish and break the line.</p>
       </div>

       {/* Trap layer for interaction penalty */}
       <div className="absolute inset-0 pointer-events-auto" onClick={handleFail}></div>
    </div>
  );

  const renderReward = () => (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-8 landscape:p-6 max-w-sm landscape:max-w-2xl w-full shadow-2xl text-center relative crayon-box animate-bounce-in my-auto landscape:flex landscape:flex-row landscape:items-center landscape:gap-8 landscape:text-left">
        
        {/* Left Side (Icon) in Landscape */}
        <div className="relative flex-shrink-0 landscape:w-1/3 flex flex-col items-center">
             <div className="text-8xl landscape:text-7xl filter drop-shadow-lg mb-6 landscape:mb-0 transform transition hover:scale-110">
                {caughtFish?.icon}
            </div>
             <div className="landscape:hidden mt-4 space-y-2">
                <h2 className="text-4xl font-black text-slate-800 font-hand">{caughtFish?.name}</h2>
                <div className="inline-block px-3 py-1 bg-sky-100 text-sky-600 rounded-full text-xs font-bold font-hand uppercase tracking-widest border border-sky-200">
                    {caughtFish?.rarity}
                </div>
            </div>
        </div>
        
        {/* Right Side (Details) in Landscape */}
        <div className="flex-1">
            <div className="hidden landscape:block mb-4 space-y-1">
                <h2 className="text-4xl font-black text-slate-800 font-hand">{caughtFish?.name}</h2>
                <div className="inline-block px-3 py-1 bg-sky-100 text-sky-600 rounded-full text-xs font-bold font-hand uppercase tracking-widest border border-sky-200">
                    {caughtFish?.rarity}
                </div>
            </div>

            <div className="my-6 landscape:my-2 bg-slate-50 p-4 rounded-xl border-2 border-slate-100 text-left relative">
                <div className="absolute -top-3 -left-2 bg-yellow-200 w-8 h-8 rounded-full opacity-50"></div>
                <p className="font-hand text-lg text-slate-600 relative z-10 leading-relaxed">
                    {loadingLore ? "The fisherman is writing in his journal..." : `"${lore}"`}
                </p>
            </div>

            <button onClick={() => setMode(AppMode.MENU)} 
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 landscape:py-3 rounded-xl font-hand text-2xl shadow-md transition transform active:scale-95 mt-4">
                Awesome!
            </button>
        </div>
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
            
            <div className="grid grid-cols-2 sm:grid-cols-3 landscape:grid-cols-4 gap-4">
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
      <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-end items-center pb-8 transition-all">
          {zenPanelOpen ? (
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border-2 border-slate-200 pointer-events-auto w-full max-w-lg mx-4 crayon-box animate-bounce-in">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                      <h3 className="font-hand font-bold text-2xl text-slate-700 flex items-center gap-2">
                          <Settings className="text-slate-400" size={24}/>
                          Environment Control
                      </h3>
                      <button onClick={() => setZenPanelOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition">
                         <ChevronDown size={24} />
                     </button>
                  </div>

                  {/* Controls Grid */}
                  <div className="space-y-6">
                      
                      {/* Time Slider */}
                      <div className="space-y-2">
                          <div className="flex justify-between font-hand font-bold text-slate-600">
                              <span>Time of Day</span>
                              <span>{debugHour.toFixed(1)} h</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" max="24" step="0.1" 
                            value={debugHour}
                            onChange={(e) => setDebugHour(parseFloat(e.target.value))}
                            className="w-full h-3 bg-gradient-to-r from-slate-900 via-sky-400 to-slate-900 rounded-lg appearance-none cursor-pointer"
                          />
                      </div>

                       {/* Wind Slider */}
                       <div className="space-y-2">
                          <div className="flex justify-between font-hand font-bold text-slate-600">
                              <span>Wind Speed</span>
                              <span>{debugWind} km/h</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" max="50" step="1" 
                            value={debugWind}
                            onChange={(e) => setDebugWind(parseInt(e.target.value))}
                            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                          />
                      </div>

                      {/* Weather Type */}
                      <div className="grid grid-cols-4 gap-2">
                          <button 
                            onClick={() => setDebugWeather(WeatherType.SUNNY)}
                            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition border-2 font-hand font-bold text-xs ${debugWeather === WeatherType.SUNNY ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                              <Sun size={20}/> Sunny
                          </button>
                          <button 
                            onClick={() => setDebugWeather(WeatherType.RAINY)}
                            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition border-2 font-hand font-bold text-xs ${debugWeather === WeatherType.RAINY ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                              <CloudDrizzle size={20}/> Rainy
                          </button>
                          <button 
                            onClick={() => setDebugWeather(WeatherType.STORM)}
                            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition border-2 font-hand font-bold text-xs ${debugWeather === WeatherType.STORM ? 'bg-slate-200 border-slate-500 text-slate-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                              <CloudLightning size={20}/> Storm
                          </button>
                          <button 
                            onClick={() => setDebugWeather(WeatherType.NIGHT)}
                            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition border-2 font-hand font-bold text-xs ${debugWeather === WeatherType.NIGHT ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                              <Moon size={20}/> Night
                          </button>
                      </div>

                  </div>
              </div>
          ) : (
              <div 
                  className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border-2 border-slate-200 pointer-events-auto flex items-center gap-6 cursor-pointer hover:scale-105 transition-all animate-bounce-in"
                  onClick={() => setZenPanelOpen(true)}
              >
                  <div className="flex items-center gap-3">
                     <span className="font-hand font-bold text-slate-700 text-xl">Zen Mode</span>
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="flex items-center gap-3 text-slate-500 text-sm border-l-2 border-slate-200 pl-6">
                        <div className="flex items-center gap-1">
                            {atmosphere.isDay ? <Sun size={16} className="text-orange-400"/> : <Moon size={16} className="text-indigo-400"/>}
                            <span className="font-bold font-hand">{debugHour.toFixed(1)}h</span>
                        </div>
                        <div className="flex items-center gap-1">
                             <Wind size={16} className="text-teal-500"/>
                             <span className="font-bold font-hand">{debugWind}</span>
                        </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 border-l-2 border-slate-200 pl-6">
                      <div className="p-2 bg-sky-100 text-sky-600 rounded-full hover:bg-sky-200 transition">
                          <Settings size={20} />
                      </div>
                      <button 
                          onClick={(e) => { e.stopPropagation(); setMode(AppMode.MENU); }} 
                          className="p-2 bg-red-100 text-red-500 rounded-full hover:bg-red-200 transition"
                      >
                          <LogOut size={20} />
                      </button>
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-100 text-slate-800 select-none">
      
      {/* Background Canvas */}
      <SimulationCanvas 
         tilt={orientation.tilt} 
         atmosphere={atmosphere}
         isFishing={mode === AppMode.FOCUSING} 
         caughtFishColor={mode === AppMode.REWARD ? caughtFish?.color : null}
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
