
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import SimulationCanvas from './components/SimulationCanvas';
import AquariumCanvas from './components/AquariumCanvas';
import { generateFishLore } from './services/geminiService';
import { fetchLocalWeather } from './services/weatherService';
import { AppMode, WeatherType, Fish, AtmosphereState, AquariumFish } from './types';
import { FISH_DB, getRandomFish } from './utils/gameData';
import { Clock, BookOpen, Settings, ChevronDown, LogOut, X, MapPin, CloudRain, Wind, Thermometer, Anchor, Sun, Moon, CloudDrizzle, CloudLightning, Snowflake, Coins, Fish as FishIcon } from 'lucide-react';

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

  // Game State
  const [focusDuration, setFocusDuration] = useState<number>(15);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [caughtFish, setCaughtFish] = useState<Fish | null>(null);
  const [lore, setLore] = useState<string>("");
  const [loadingLore, setLoadingLore] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showAquariumDetail, setShowAquariumDetail] = useState(false);
  
  // Data Persistence
  const [collection, setCollection] = useState<string[]>([]);
  const [coins, setCoins] = useState<number>(0);
  const [aquariumFish, setAquariumFish] = useState<AquariumFish[]>([]);

  // Init Data & Demo Fish
  useEffect(() => {
    const savedCollection = localStorage.getItem('bottled_ocean_collection');
    if (savedCollection) setCollection(JSON.parse(savedCollection));

    const savedCoins = localStorage.getItem('bottled_ocean_coins');
    if (savedCoins) setCoins(parseInt(savedCoins, 10));

    const savedTank = localStorage.getItem('bottled_ocean_tank');
    if (savedTank && savedTank !== '[]') {
        setAquariumFish(JSON.parse(savedTank));
    } else {
        // --- ADD DEMO SCHOOL (5 Fish) if tank is empty ---
        console.log("Empty tank detected, adding demo school...");
        const w = window.innerWidth;
        const h = window.innerHeight;
        const demoSchool: AquariumFish[] = [
            { instanceId: 1, fishId: 'clownfish', x: w*0.2, y: h*0.2, targetX: w/2, targetY: h/2, angle: 0, speed: 1.5, flipX: false },
            { instanceId: 2, fishId: 'blue_tang', x: w*0.8, y: h*0.2, targetX: w/2, targetY: h/2, angle: Math.PI, speed: 1.8, flipX: true },
            { instanceId: 3, fishId: 'origami_crab', x: w*0.2, y: h*0.8, targetX: w/2, targetY: h/2, angle: 0, speed: 1.2, flipX: false },
            { instanceId: 4, fishId: 'lantern_fish', x: w*0.8, y: h*0.8, targetX: w/2, targetY: h/2, angle: Math.PI, speed: 1.4, flipX: true },
            { instanceId: 5, fishId: 'clownfish', x: w*0.5, y: h*0.9, targetX: w/2, targetY: h/2, angle: -Math.PI/2, speed: 1.6, flipX: false },
        ];
        setAquariumFish(demoSchool);
    }
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
        wakeLockRef.current.addEventListener('release', () => {
            console.log('Wake Lock released');
        });
      } catch (err: any) {
         console.debug('Wake Lock disallowed', err);
      }
    }
  }, []);

  // Wake Lock Management (Focus/Aquarium Modes)
  useEffect(() => {
    const manageWakeLock = async () => {
        if (mode === AppMode.FOCUSING || mode === AppMode.AQUARIUM) {
            await requestWakeLock();
            const handleVisibility = () => {
                if (document.visibilityState === 'visible' && wakeLockRef.current === null) {
                    requestWakeLock();
                }
            };
            document.addEventListener('visibilitychange', handleVisibility);
            return () => document.removeEventListener('visibilitychange', handleVisibility);

        } else {
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
  const handleEnableWeather = () => {
      if (navigator.geolocation) {
        const options = {
            enableHighAccuracy: false, 
            timeout: 15000,           
            maximumAge: 60000          
        };

        navigator.geolocation.getCurrentPosition(async (pos) => {
            setLocationName(`${pos.coords.latitude.toFixed(1)}°N, ${pos.coords.longitude.toFixed(1)}°E`);
            const weatherData = await fetchLocalWeather(pos.coords.latitude, pos.coords.longitude);
            setAtmosphere(weatherData);
            setWeatherEnabled(true);
        }, (err) => {
            let msg = "Unknown error";
            switch(err.code) {
                case 1: msg = "Permission Denied. Please enable Location in Android Settings."; break;
                case 2: msg = "Position Unavailable."; break;
                case 3: msg = "Request Timed Out."; break;
            }
            alert(`Location Error: ${msg}`);
        }, options);
      } else {
          alert("Geolocation is not supported.");
      }
  };

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
    
    if (!isDesktop && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const handleSuccess = async () => {
    const fish = getRandomFish(focusDuration, atmosphere.type);
    setCaughtFish(fish);
    setMode(AppMode.REWARD);
    
    // Unlock in collection immediately (Pokedex entry logic)
    const newColl = [...new Set([...collection, fish.id])];
    setCollection(newColl);
    localStorage.setItem('bottled_ocean_collection', JSON.stringify(newColl));

    setLoadingLore(true);
    const text = await generateFishLore(fish, atmosphere.type);
    setLore(text);
    setLoadingLore(false);
    
    if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
  };

  // Reward Decisions
  const handleSellFish = () => {
      if (!caughtFish) return;
      const newBalance = coins + caughtFish.price;
      setCoins(newBalance);
      localStorage.setItem('bottled_ocean_coins', newBalance.toString());
      setMode(AppMode.MENU);
  };

  const handleKeepFish = () => {
      if (!caughtFish) return;
      const newFish: AquariumFish = {
          instanceId: Date.now(),
          fishId: caughtFish.id,
          x: 0, y: 0, targetX: 0, targetY: 0, angle: 0, speed: 1, // Defaults, handled by AquariumCanvas
          flipX: false
      };
      const newTank = [...aquariumFish, newFish];
      setAquariumFish(newTank);
      localStorage.setItem('bottled_ocean_tank', JSON.stringify(newTank));
      setMode(AppMode.AQUARIUM);
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
      
      {/* Coin Display - Fixed Top Right */}
      <div className="absolute top-6 right-6 z-50 animate-bounce-in">
        <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300 text-yellow-700 font-bold font-hand shadow-sm transform hover:scale-105 transition">
            <Coins size={20} /> 
            <span className="text-xl">{coins}</span>
        </div>
      </div>

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
                        {[15, 30, 45].map(m => (
                            <button key={m} onClick={() => startFocus(m)} 
                                className="flex-1 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold py-4 landscape:py-3 rounded-xl border-2 border-sky-200 transition active:scale-95 font-hand text-2xl landscape:text-xl">
                                {m}m
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setMode(AppMode.ZEN)} 
                        className="bg-white p-4 landscape:p-3 rounded-2xl crayon-box flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition -rotate-1 shadow-md">
                        <Sun className="text-orange-500" size={32} />
                        <span className="font-bold text-slate-600 font-hand text-xl landscape:text-lg">Zen Mode</span>
                    </button>
                    <button onClick={() => setMode(AppMode.AQUARIUM)} 
                        className="bg-white p-4 landscape:p-3 rounded-2xl crayon-box flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition rotate-1 shadow-md">
                        <FishIcon className="text-emerald-500" size={32} />
                        <span className="font-bold text-slate-600 font-hand text-xl landscape:text-lg">My Aquarium</span>
                    </button>
                </div>
                
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
      <div className="landscape:hidden h-8"></div>
    </div>
  );

  const renderFocusing = () => (
    <>
       <div 
         className="absolute top-8 right-8 z-40 pointer-events-auto flex flex-col animate-fade-in rounded-3xl w-56"
         style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
       >
           <div className="bg-white/95 backdrop-blur-md pt-5 pb-3 rounded-t-3xl border-2 border-b-0 border-slate-200 flex flex-col items-center w-full">
               <span className="text-6xl font-hand font-bold text-slate-700 tracking-wider tabular-nums leading-none mb-1">
                 {formatTime(timeLeft)}
               </span>
               <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-widest font-hand">
                    <Clock size={12} /> {currentTime}
               </div>
           </div>
           
           <button 
             onClick={() => setShowQuitConfirm(true)}
             className="w-full bg-red-50 hover:bg-red-100 text-red-500 py-3 rounded-b-3xl font-bold font-hand text-lg transition border-2 border-t border-red-100 flex items-center justify-center gap-2 active:bg-red-200 group"
           >
             <LogOut size={18} className="group-hover:-translate-x-1 transition-transform"/> Stop
           </button>
       </div>

       {showQuitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative crayon-box animate-bounce-in flex flex-col items-center border-2 border-white/50">
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
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 w-96 shadow-2xl text-center relative crayon-box animate-bounce-in flex flex-col items-center">
        
        <div className="text-8xl filter drop-shadow-xl mb-6 transform hover:scale-110 transition cursor-pointer">
            {caughtFish?.icon}
        </div>
        
        <h2 className="text-4xl font-black text-slate-800 font-hand mb-2">{caughtFish?.name}</h2>
        <div className="flex items-center gap-2 mb-4">
             <div className="inline-block px-4 py-1 bg-sky-100 text-sky-600 rounded-full text-xs font-bold font-hand uppercase tracking-widest border border-sky-200">
                {caughtFish?.rarity}
            </div>
            <div className="inline-block px-4 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold font-hand uppercase tracking-widest border border-yellow-300">
                {caughtFish?.price} coins
            </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 text-left relative w-full mb-6">
            <p className="font-hand text-lg text-slate-600 relative z-10 leading-relaxed italic text-center">
                {loadingLore ? "Identifying..." : `"${lore}"`}
            </p>
        </div>

        <div className="flex gap-4 w-full">
            <button onClick={handleSellFish} 
                className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-bold py-4 rounded-2xl font-hand text-lg border-2 border-yellow-300 active:scale-95 transition flex flex-col items-center gap-1">
                <Coins size={24} />
                Sell
            </button>
            <button onClick={handleKeepFish} 
                className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold py-4 rounded-2xl font-hand text-lg border-2 border-emerald-300 active:scale-95 transition flex flex-col items-center gap-1">
                <FishIcon size={24} />
                Keep
            </button>
        </div>

      </div>
    </div>
  );

  const renderCollection = () => {
    const handleClose = () => {
        if (mode === AppMode.AQUARIUM) {
            setShowAquariumDetail(false);
        } else {
            setMode(AppMode.MENU);
        }
    };

    return (
    <div className="absolute inset-0 z-50 bg-slate-50 overflow-y-auto pointer-events-auto">
        <div className="p-6 pb-24 max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-slate-50/90 backdrop-blur py-4 z-10">
                <h2 className="text-4xl font-bold text-slate-800 font-hand">FishDex</h2>
                <button onClick={handleClose} className="p-2 bg-white rounded-full shadow border hover:bg-gray-100">
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
                                    <span className="text-xs font-bold text-slate-400 mt-2">{fish.rarity}</span>
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
  };

  const renderAquarium = () => (
      <div className="absolute inset-0 z-40 flex flex-col pointer-events-none">
          {/* AQUARIUM CANVAS RENDERED IN BACKGROUND OF THIS MODE */}
          <div className="absolute inset-0 pointer-events-auto">
            <AquariumCanvas fishList={aquariumFish} />
          </div>

          {/* UI OVERLAY */}
          <div className="relative z-50 p-6 flex justify-between items-start pointer-events-none">
              <button 
                onClick={() => setShowAquariumDetail(true)}
                className="bg-white/90 backdrop-blur p-4 rounded-3xl shadow-lg border-2 border-slate-200 flex flex-col items-start gap-1 pointer-events-auto hover:bg-white active:scale-95 transition text-left"
              >
                 <h2 className="font-hand font-bold text-2xl text-slate-700">My Aquarium</h2>
                 <p className="font-hand text-slate-500 text-sm">Long press to feed/attract</p>
                 <div className="flex items-center gap-2 mt-2">
                     <div className="flex items-center gap-1 text-slate-600 font-bold font-hand text-sm bg-slate-100 px-3 py-1 rounded-full">
                         <FishIcon size={14}/> {aquariumFish.length} Fish
                     </div>
                     <span className="text-sky-500 font-hand font-bold text-xs">View Detail →</span>
                 </div>
              </button>

              <div className="flex gap-4 pointer-events-auto">
                 {/* Coin Display in Aquarium too */}
                 <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300 text-yellow-700 font-bold font-hand shadow-sm">
                    <Coins size={20} /> 
                    <span className="text-xl">{coins}</span>
                 </div>

                 <button onClick={() => setMode(AppMode.MENU)} 
                      className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg border-2 border-slate-200 text-slate-700 hover:bg-white active:scale-95 transition">
                      <LogOut size={24} />
                  </button>
              </div>
          </div>

          {showAquariumDetail && renderCollection()}
      </div>
  );

  const renderZenMode = () => (
    <div className="absolute inset-0 z-40 flex flex-col pointer-events-none">
        <div className="relative z-50 p-6 flex justify-end pointer-events-auto">
            <button onClick={() => setMode(AppMode.MENU)} 
                className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg border-2 border-slate-200 text-slate-700 hover:bg-white active:scale-95 transition">
                <LogOut size={24} />
            </button>
        </div>
    </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-100 text-slate-800 select-none">
      
      {/* Contextual Canvas Rendering */}
      {mode === AppMode.FOCUSING ? (
           <SimulationCanvas 
             tilt={orientation.tilt} 
             atmosphere={atmosphere}
             isFishing={true} 
             caughtFishColor={null}
          />
      ) : mode === AppMode.REWARD ? (
           <SimulationCanvas 
             tilt={orientation.tilt} 
             atmosphere={atmosphere}
             isFishing={true} 
             caughtFishColor={caughtFish?.color}
          />
      ) : mode === AppMode.MENU || mode === AppMode.COLLECTION || mode === AppMode.ZEN ? (
           <SimulationCanvas 
             tilt={orientation.tilt} 
             atmosphere={atmosphere}
             isFishing={false} 
             caughtFishColor={null}
          />
      ) : null}

      {/* Aquarium Logic is standalone */}
      {mode === AppMode.AQUARIUM && renderAquarium()}
      {mode === AppMode.ZEN && renderZenMode()}

      {/* Main UI Router */}
      {mode === AppMode.MENU && renderMenu()}
      {mode === AppMode.FOCUSING && renderFocusing()}
      {mode === AppMode.REWARD && renderReward()}
      {mode === AppMode.COLLECTION && renderCollection()}

    </div>
  );
};

export default App;
