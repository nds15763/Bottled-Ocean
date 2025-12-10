import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import SimulationCanvas from './components/SimulationCanvas';
import { generateFishLore } from './services/geminiService';
import { fetchLocalWeather } from './services/weatherService';
import { AppMode, WeatherType, Fish, AtmosphereState } from './types';
import { FISH_DB, getRandomFish } from './utils/gameData';
import { Clock, BookOpen, Settings, ChevronDown, LogOut, X, MapPin, CloudRain, Wind, Thermometer, Anchor, Sun, Moon, CloudDrizzle, CloudLightning, Snowflake, Flower } from 'lucide-react';

const App: React.FC = () => {
  const { orientation, requestPermission, permissionGranted, isDesktop } = useDeviceOrientation();
  
  // App State
  const [mode, setMode] = useState<AppMode>(AppMode.MENU);
  
  // Wake Lock Ref
  const wakeLockRef = useRef<any>(null);
  
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
  const [focusDuration, setFocusDuration] = useState<number>(15);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [caughtFish, setCaughtFish] = useState<Fish | null>(null);
  const [lore, setLore] = useState<string>("");
  const [loadingLore, setLoadingLore] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  
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

  // Global Orientation Lock (Run Once)
  useEffect(() => {
    const lockLandscape = async () => {
      try {
        // Attempt to lock landscape immediately
        if (screen.orientation && (screen.orientation as any).lock) {
           await (screen.orientation as any).lock('landscape').catch((e: any) => {
               console.debug("Orientation lock skipped:", e);
           });
        }
      } catch (err) {
        console.debug('Orientation lock API unavailable');
      }
    };
    lockLandscape();
  }, []);

  // Wake Lock Request Logic
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock active');
        
        wakeLockRef.current.addEventListener('release', () => {
            console.log('Wake Lock released');
        });

      } catch (err: any) {
        // Suppress policy errors
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.message?.includes('policy') || err.message?.includes('disallowed')) {
            console.debug('Wake Lock disallowed by policy.');
        } else {
            console.error('Wake Lock failed:', err);
        }
      }
    }
  }, []);

  // Wake Lock Management (Focus/Zen Modes)
  useEffect(() => {
    const manageWakeLock = async () => {
        if (mode === AppMode.FOCUSING || mode === AppMode.ZEN) {
            await requestWakeLock();

            // Re-acquire on visibility change
            const handleVisibility = () => {
                if (document.visibilityState === 'visible' && wakeLockRef.current === null) {
                    requestWakeLock();
                }
            };
            document.addEventListener('visibilitychange', handleVisibility);
            return () => document.removeEventListener('visibilitychange', handleVisibility);

        } else {
            // Release Wake Lock
            if (wakeLockRef.current) {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            }
        }
    };

    manageWakeLock();

    return () => {
        if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, [mode, requestWakeLock]);

  // Weather Logic
  const handleEnableWeather = async () => {
      try {
          const { Geolocation } = await import('@capacitor/geolocation');
          
          // Request permission and get current position
          const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: false, // false is faster and often more reliable for rough location
              timeout: 15000,            // 15 seconds timeout
              maximumAge: 60000          // Accept cached position
          });
          
          const { latitude, longitude } = position.coords;
          setLocationName(`${latitude.toFixed(1)}°N, ${longitude.toFixed(1)}°E`);
          const weatherData = await fetchLocalWeather(latitude, longitude);
          setAtmosphere(weatherData);
          setWeatherEnabled(true);
      } catch (err: any) {
          console.error("Geo Error", err);
          // Explicit error handling for debugging on device
          let msg = "Unknown error";
          if (err.message?.includes('permission') || err.message?.includes('denied')) {
              msg = "Permission Denied. Please enable Location in Android Settings for this app.";
          } else if (err.message?.includes('unavailable')) {
              msg = "Position Unavailable. Check your GPS.";
          } else if (err.message?.includes('timeout')) {
              msg = "Request Timed Out.";
          }
          alert(`Location Error: ${msg}\n(${err.message || err})`);
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
            temperature: debugWeather === WeatherType.SNOW ? -2 : 20, 
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
    setShowQuitConfirm(false);
    
    // Request Fullscreen (Manual trigger required for some browsers)
    if (!isDesktop && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.log("Fullscreen request failed", err);
        });
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

  const handleQuit = () => {
      setMode(AppMode.MENU);
      setShowQuitConfirm(false);
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
        
                <div className="bg-white p-6 landscape:p-5 rounded-2xl crayon-box transform rotate-1 shadow-xl">
                    <h3 className="text-xl landscape:text-lg font-bold text-slate-700 mb-4 landscape:mb-2 font-hand flex items-center gap-2">
                        <Clock size={20} /> Select Focus Time
                    </h3>
                    <div className="flex justify-between gap-2">
                        {/* 1m OPTION REMOVED */}
                        {[15, 30, 45].map(m => (
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
                        <Flower className="text-emerald-500" size={32} />
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
      </div>
      
      {/* Spacer for portrait bottom area */}
      <div className="landscape:hidden h-8"></div>
    </div>
  );

  const renderFocusing = () => (
    <>
       {/* Minimal HUD Card (Spliced Style) */}
       <div 
         className="absolute top-8 right-8 z-40 pointer-events-auto flex flex-col animate-fade-in rounded-3xl w-56"
         style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
       >
           {/* Top Section: Time */}
           <div className="bg-white/95 backdrop-blur-md pt-5 pb-3 rounded-t-3xl border-2 border-b-0 border-slate-200 flex flex-col items-center w-full">
               <span className="text-6xl font-hand font-bold text-slate-700 tracking-wider tabular-nums leading-none mb-1">
                 {formatTime(timeLeft)}
               </span>
               <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-widest font-hand">
                    <Clock size={12} /> {currentTime}
               </div>
           </div>
           
           {/* Bottom Section: Stop Button (Spliced) */}
           <button 
             onClick={() => setShowQuitConfirm(true)}
             className="w-full bg-red-50 hover:bg-red-100 text-red-500 py-3 rounded-b-3xl font-bold font-hand text-lg transition border-2 border-t border-red-100 flex items-center justify-center gap-2 active:bg-red-200 group"
           >
             <LogOut size={18} className="group-hover:-translate-x-1 transition-transform"/> Stop
           </button>
       </div>

       {/* Quit Confirmation Modal */}
       {showQuitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative crayon-box animate-bounce-in flex flex-col items-center border-2 border-white/50">
            
            <div className="bg-orange-100 p-4 rounded-full text-orange-500 mb-4 shadow-sm transform -rotate-3">
                <Anchor size={40} />
            </div>
            
            <h2 className="text-3xl font-black text-slate-800 font-hand mb-2">Reel in the line?</h2>

            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 text-center w-full mb-6">
                <p className="font-hand text-lg text-slate-600 leading-snug">
                    If you stop now, the fish will get away!
                </p>
            </div>

            <div className="flex gap-3 w-full">
                <button onClick={() => setShowQuitConfirm(false)} 
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl font-hand text-lg border-2 border-slate-200 transition active:scale-95">
                    Wait
                </button>
                <button onClick={handleQuit} 
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl font-hand text-lg shadow-lg border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition-all">
                    Give Up
                </button>
            </div>
          </div>
        </div>
       )}
    </>
  );

  const renderReward = () => (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 w-80 shadow-2xl text-center relative crayon-box animate-bounce-in flex flex-col items-center">
        
        <div className="text-6xl filter drop-shadow-xl mb-4 transform hover:scale-110 transition cursor-pointer">
            {caughtFish?.icon}
        </div>
        
        <h2 className="text-3xl font-black text-slate-800 font-hand mb-2">{caughtFish?.name}</h2>
        <div className="inline-block px-4 py-1 bg-sky-100 text-sky-600 rounded-full text-xs font-bold font-hand uppercase tracking-widest border border-sky-200 mb-4">
            {caughtFish?.rarity}
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 text-left relative w-full">
            <div className="absolute -top-3 -left-2 bg-yellow-200 w-8 h-8 rounded-full opacity-50"></div>
            <p className="font-hand text-base text-slate-600 relative z-10 leading-relaxed italic">
                {loadingLore ? "The fisherman is writing in his journal..." : `"${lore}"`}
            </p>
        </div>

        <button onClick={() => setMode(AppMode.MENU)} 
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-2xl font-hand text-lg shadow-lg border-b-4 border-sky-700 active:border-b-0 active:translate-y-1 transition-all mt-6">
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
            
            <div className="grid grid-cols-2 sm:grid-cols-3 landscape:grid-cols-4 gap-4">
                {FISH_DB.map(fish => {
                    const caught = collection.includes(fish.id);
                    return (
                        <div key={fish.id} className={`aspect-square rounded-3xl flex flex-col items-center justify-center p-4 text-center border-2 transition-all relative overflow-hidden
                            ${caught ? 'bg-white border-slate-200 shadow-sm crayon-box' : 'bg-slate-100 border-dashed border-slate-300'}`}>
                            
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
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border-2 border-slate-200 pointer-events-auto w-full max-w-lg mx-4 crayon-box animate-bounce-in absolute bottom-8">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
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
                      <div className="grid grid-cols-5 gap-2">
                          <button 
                            onClick={() => setDebugWeather(WeatherType.SUNNY)}
                            className={`p-2 rounded-2xl flex flex-col items-center gap-1 transition border-2 font-hand font-bold text-[10px] ${debugWeather === WeatherType.SUNNY ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                              <Sun size={18}/> Sun
                          </button>
                          <button 
                            onClick={() => setDebugWeather(WeatherType.RAINY)}
                            className={`p-2 rounded-2xl flex flex-col items-center gap-1 transition border-2 font-hand font-bold text-[10px] ${debugWeather === WeatherType.RAINY ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                              <CloudDrizzle size={18}/> Rain
                          </button>
                          <button 
                            onClick={() => setDebugWeather(WeatherType.STORM)}
                            className={`p-2 rounded-2xl flex flex-col items-center gap-1 transition border-2 font-hand font-bold text-[10px] ${debugWeather === WeatherType.STORM ? 'bg-slate-200 border-slate-500 text-slate-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                              <CloudLightning size={18}/> Storm
                          </button>
                          <button 
                            onClick={() => setDebugWeather(WeatherType.NIGHT)}
                            className={`p-2 rounded-2xl flex flex-col items-center gap-1 transition border-2 font-hand font-bold text-[10px] ${debugWeather === WeatherType.NIGHT ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                              <Moon size={18}/> Night
                          </button>
                          <button 
                            onClick={() => setDebugWeather(WeatherType.SNOW)}
                            className={`p-2 rounded-2xl flex flex-col items-center gap-1 transition border-2 font-hand font-bold text-[10px] ${debugWeather === WeatherType.SNOW ? 'bg-cyan-100 border-cyan-400 text-cyan-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                              <Snowflake size={18}/> Snow
                          </button>
                      </div>

                  </div>
              </div>
          ) : (
              <div 
                  className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-full shadow-xl border-2 border-slate-200 pointer-events-auto flex items-center gap-6 cursor-pointer hover:scale-105 transition-all animate-bounce-in absolute bottom-8 crayon-box"
                  onClick={() => setZenPanelOpen(true)}
              >
                  <div className="flex items-center gap-3">
                     <span className="font-hand font-bold text-slate-700 text-xl">Zen Mode</span>
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="hidden sm:flex items-center gap-3 text-slate-500 text-sm border-l-2 border-slate-200 pl-6">
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