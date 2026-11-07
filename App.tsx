import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import SimulationCanvas from './components/SimulationCanvas';
import { generateFishLore } from './services/geminiService';
import { fetchLocalWeather } from './services/weatherService';
import { AppMode, WeatherType, Fish, AtmosphereState } from './types';
import { FISH_DB, getRandomFish } from './utils/gameData';
import { getMoonPhase } from './utils/moonPhase';
import { Clock, BookOpen, Settings, ChevronDown, LogOut, X, MapPin, CloudRain, Wind, Thermometer, Anchor, Sun, Moon, CloudDrizzle, CloudLightning, Snowflake, Flower, CalendarDays } from 'lucide-react';

function localDateInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

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
  const [debugDate, setDebugDate] = useState(localDateInputValue);
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
          
          // Detect platform for appropriate error messages
          const platform = (() => {
              const ua = navigator.userAgent;
              if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
              if (/Android/i.test(ua)) return 'Android';
              return 'Browser';
          })();
          
          // Platform-specific error handling
          let msg = "Unknown error";
          if (err.message?.includes('permission') || err.message?.includes('denied')) {
              if (platform === 'iOS') {
                  msg = "Permission Denied. Please enable Location in iOS Settings for this app.";
              } else if (platform === 'Android') {
                  msg = "Permission Denied. Please enable Location in Android Settings for this app.";
              } else {
                  msg = "Permission Denied. Please enable Location in your browser settings.";
              }
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

        // Day/Night logic based on slider (5:00-20:00 allows Golden Dawn & After-Rain Dusk!)
        const isDay = debugHour >= 5 && debugHour < 20;
        
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
  const startFocus = async (min: number) => {
    // 请求陀螺仪权限（iOS/Android）
    if (!permissionGranted && !isDesktop) {
      await requestPermission();
    }
    
    setFocusDuration(min);
    setTimeLeft(min * 60);
    setMode(AppMode.FOCUSING);
    setShowQuitConfirm(false);
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
  };

  const handleQuit = () => {
      setMode(AppMode.MENU);
      setShowQuitConfirm(false);
  };

  const applySeaPreset = (preset: 'SUNNY' | 'RAINY' | 'STORM' | 'DUSK') => {
    setWeatherEnabled(false);
    if (preset === 'SUNNY') {
      setDebugWeather(WeatherType.SUNNY);
      setDebugHour(11.5);
      setDebugWind(2);
      setAtmosphere({
        type: WeatherType.SUNNY,
        localHour: 11.5,
        waveAmp: 2,
        waveSpeed: 0.12,
        windSpeed: 2,
        temperature: 23,
        hasRainbow: false,
        isDay: true,
        lightning: false,
      });
    } else if (preset === 'RAINY') {
      setDebugWeather(WeatherType.RAINY);
      setDebugHour(15.0);
      setDebugWind(22);
      setAtmosphere({
        type: WeatherType.RAINY,
        localHour: 15.0,
        waveAmp: 22,
        waveSpeed: 0.56,
        windSpeed: 22,
        temperature: 17,
        hasRainbow: false,
        isDay: true,
        lightning: false,
      });
    } else if (preset === 'STORM') {
      setDebugWeather(WeatherType.STORM);
      setDebugHour(16.0);
      setDebugWind(38);
      setAtmosphere({
        type: WeatherType.STORM,
        localHour: 16.0,
        waveAmp: 45,
        waveSpeed: 1.0,
        windSpeed: 38,
        temperature: 15,
        hasRainbow: false,
        isDay: true,
        lightning: true,
      });
    } else {
      setDebugWeather(WeatherType.SUNNY);
      setDebugHour(18.2);
      setDebugWind(4);
      setAtmosphere({
        type: WeatherType.SUNNY,
        localHour: 18.2,
        waveAmp: 4,
        waveSpeed: 0.15,
        windSpeed: 4,
        temperature: 19,
        hasRainbow: false,
        isDay: true,
        lightning: false,
      });
    }
  };

  const selectedMoonPhase = getMoonPhase(new Date(`${debugDate}T12:00:00`));

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // --- UI RENDERERS (Refined Nordic Coastal Editorial Theme) ---

  const renderMenu = () => (
    <div className="absolute inset-0 flex flex-col landscape:flex-row items-center justify-between p-6 landscape:px-14 animate-fade-in pointer-events-auto z-50 overflow-y-auto landscape:overflow-hidden">
      
      {/* Left Header Area: Quiet Editorial Title */}
      <div className="text-center landscape:text-left space-y-2.5 mt-6 landscape:mt-0 landscape:max-w-md landscape:flex landscape:flex-col landscape:items-start landscape:self-start landscape:pt-10">
        <div className="inline-flex items-center gap-2 text-[#F4EDE0]/85 text-xs tracking-[0.22em] uppercase font-bold">
          <Anchor size={13} className="text-[#FBE29A]" />
          <span>Bottled Ocean</span>
        </div>
        <h1 className="text-4xl md:text-5xl landscape:text-5xl font-bold text-[#FAF4E8] tracking-wide drop-shadow-[0_2px_10px_rgba(12,30,48,0.35)]">
          Focus Fishing
        </h1>
        <div className="w-16 h-[1.5px] bg-[#F4EDE0]/45 mx-auto landscape:mx-0"></div>
        <p className="text-[#E6EEF4]/90 text-sm landscape:text-base font-medium tracking-wide drop-shadow-[0_1px_6px_rgba(12,30,48,0.35)]">
          Put your phone in a bottle · Drift with wind &amp; tide
        </p>
      </div>

      {/* Right Controls Column: Nordic Midnight-Slate Glass Cards */}
      <div className="flex flex-col gap-3.5 w-full max-w-sm landscape:w-80 landscape:justify-center">
        
        <div className="nordic-panel p-5 landscape:p-4">
          <h3 className="text-sm uppercase tracking-[0.14em] font-bold text-[#B8CEDD] mb-3 flex items-center gap-2">
            <Clock size={15} className="text-[#E6AF52]" /> Select Focus Time
          </h3>
          <div className="flex justify-between gap-2.5">
            {[15, 30, 45].map((m) => (
              <button
                key={m}
                onClick={() => startFocus(m)}
                className="flex-1 nordic-btn font-bold py-3 landscape:py-2.5 text-lg tracking-wide active:scale-95"
              >
                {m}<span className="text-xs font-normal text-[#B8CEDD] ml-0.5">m</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode(AppMode.COLLECTION)}
            className="nordic-panel p-3.5 landscape:p-3 flex items-center gap-3 hover:bg-[#1A3B56]/90 transition active:scale-[0.98] text-left"
          >
            <div className="p-2 rounded-lg bg-[#F4EDE0]/10 border border-[#F4EDE0]/20">
              <BookOpen className="text-[#E6AF52]" size={19} />
            </div>
            <div>
              <div className="font-bold text-[#F4EDE0] text-sm leading-tight">FishDex</div>
              <div className="text-[11px] text-[#9CB6C9]">{collection.length}/{FISH_DB.length} logged</div>
            </div>
          </button>

          <button
            onClick={async () => {
              if (!permissionGranted && !isDesktop) {
                await requestPermission();
              }
              setMode(AppMode.ZEN);
            }}
            className="nordic-panel p-3.5 landscape:p-3 flex items-center gap-3 hover:bg-[#1A3B56]/90 transition active:scale-[0.98] text-left"
          >
            <div className="p-2 rounded-lg bg-[#F4EDE0]/10 border border-[#F4EDE0]/20">
              <Flower className="text-[#88C4B8]" size={19} />
            </div>
            <div>
              <div className="font-bold text-[#F4EDE0] text-sm leading-tight">Zen Mode</div>
              <div className="text-[11px] text-[#9CB6C9]">Sea &amp; storm</div>
            </div>
          </button>
        </div>

        {/* Weather Sync & Sea Mood Card */}
        <div className="nordic-panel p-3.5 landscape:p-3 space-y-2.5 w-full">
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'SUNNY' as const, label: 'Calm', active: !weatherEnabled && atmosphere.type === WeatherType.SUNNY && atmosphere.localHour < 17 },
              { id: 'RAINY' as const, label: 'Rain', active: !weatherEnabled && atmosphere.type === WeatherType.RAINY },
              { id: 'STORM' as const, label: 'Storm', active: !weatherEnabled && atmosphere.type === WeatherType.STORM },
              { id: 'DUSK' as const, label: 'Dusk', active: !weatherEnabled && atmosphere.type === WeatherType.SUNNY && atmosphere.localHour >= 17 },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applySeaPreset(p.id)}
                className={`py-1.5 rounded-md text-[11px] font-bold tracking-wide transition border ${
                  p.active
                    ? 'bg-[#E6AF52]/25 border-[#E6AF52] text-[#FBE29A]'
                    : 'bg-[#F4EDE0]/5 border-[#F4EDE0]/15 text-[#B8CEDD] hover:bg-[#F4EDE0]/12'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {!weatherEnabled ? (
            <button
              onClick={handleEnableWeather}
              className="w-full pt-2 border-t border-[#F4EDE0]/15 flex items-center justify-between group text-left transition"
            >
              <div className="flex flex-col">
                <span className="font-bold text-xs text-[#F4EDE0] group-hover:text-[#FBE29A] transition">
                  Sync Real Weather
                </span>
                <span className="text-[10px] text-[#9CB6C9]">Live local wind, rain &amp; daylight</span>
              </div>
              <div className="p-1.5 rounded-md bg-[#F4EDE0]/10 border border-[#F4EDE0]/20 text-[#9CC7E4] group-hover:text-[#F4EDE0] transition">
                <CloudRain size={15} />
              </div>
            </button>
          ) : (
            <div className="w-full pt-2 border-t border-[#F4EDE0]/15 flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-[#88C4B8]/20 border border-[#88C4B8]/40 text-[#9AD6CA]">
                <MapPin size={14} />
              </div>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="font-bold text-xs text-[#F4EDE0] whitespace-nowrap">Ocean Synced</span>
                <span className="text-[10px] text-[#9CB6C9] truncate">{locationName}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="landscape:hidden h-4"></div>
    </div>
  );

  const renderFocusing = () => (
    <>
      {/* Minimalist Nordic Slate HUD */}
      <div className="absolute top-6 right-6 z-40 pointer-events-auto flex flex-col animate-fade-in nordic-panel overflow-hidden w-48">
        <div className="pt-4 pb-3 flex flex-col items-center w-full">
          <span className="text-4xl font-bold text-[#F4EDE0] tracking-wider tabular-nums leading-none mb-1.5">
            {formatTime(timeLeft)}
          </span>
          <div className="flex items-center gap-1.5 text-[#9CB6C9] text-[11px] uppercase tracking-widest">
            <Clock size={11} /> {currentTime}
          </div>
        </div>

        <button
          onClick={() => setShowQuitConfirm(true)}
          className="w-full bg-[#C8533E]/20 hover:bg-[#C8533E]/35 text-[#F2B8AD] py-2 text-xs uppercase tracking-widest font-bold transition border-t border-[#F4EDE0]/20 flex items-center justify-center gap-1.5"
        >
          <LogOut size={13} /> Stop Voyage
        </button>
      </div>

      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0B1928]/55 backdrop-blur-sm p-4 animate-fade-in pointer-events-auto">
          <div className="nordic-panel p-6 max-w-sm w-full text-center flex flex-col items-center">
            <div className="bg-[#E6AF52]/15 p-3 rounded-full border border-[#E6AF52]/40 text-[#E6AF52] mb-3">
              <Anchor size={26} />
            </div>

            <h2 className="text-xl font-bold text-[#F4EDE0] mb-1.5">Reel in the line?</h2>
            <p className="text-sm text-[#A9C1D4] mb-5 leading-relaxed">
              If you head back to port now, the catch will slip back into the deep.
            </p>

            <div className="flex gap-2.5 w-full">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 nordic-btn font-bold py-2.5 text-sm"
              >
                Stay at Sea
              </button>
              <button
                onClick={handleQuit}
                className="flex-1 bg-[#B84A39] hover:bg-[#C95543] text-[#F4EDE0] font-bold py-2.5 rounded-[9px] text-sm border border-[#F4EDE0]/25 transition"
              >
                Give Up
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderReward = () => (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0B1928]/55 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
      <div className="nordic-panel p-6 w-80 text-center flex flex-col items-center animate-bounce-in">
        <div className="mb-3.5 px-6 py-4 rounded-xl bg-[#0F2438]/65 border border-[#F4EDE0]/15 w-full flex justify-center">
          {caughtFish?.spriteUrl ? (
            <img src={caughtFish.spriteUrl} alt={caughtFish.name} className="w-28 h-16 object-contain" />
          ) : (
            <span className="text-5xl">{caughtFish?.icon}</span>
          )}
        </div>

        <h2 className="text-2xl font-bold text-[#F4EDE0] mb-1">{caughtFish?.name}</h2>
        <div className="inline-block px-3 py-0.5 bg-[#E6AF52]/20 text-[#F4CF82] rounded-full text-[10px] font-bold uppercase tracking-[0.18em] border border-[#E6AF52]/40 mb-4">
          {caughtFish?.rarity}
        </div>

        <div className="bg-[#0F2438]/55 p-3.5 rounded-xl border border-[#F4EDE0]/15 text-left w-full">
          <p className="text-sm text-[#D6E3EC] leading-relaxed italic">
            {loadingLore ? 'The fisherman is writing in his logbook...' : `"${lore}"`}
          </p>
        </div>

        <button
          onClick={() => setMode(AppMode.MENU)}
          className="w-full nordic-btn-primary font-bold py-2.5 text-sm tracking-wide mt-5"
        >
          Keep in Logbook
        </button>
      </div>
    </div>
  );

  const renderCollection = () => (
    <div className="absolute inset-0 z-50 bg-[#142C42]/95 backdrop-blur-md overflow-y-auto pointer-events-auto text-[#F4EDE0]">
      <div className="p-6 pb-20 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#142C42]/95 backdrop-blur py-3 z-10 border-b border-[#F4EDE0]/20">
          <div>
            <h2 className="text-2xl font-bold text-[#F4EDE0] tracking-wide">My FishDex</h2>
            <p className="text-xs text-[#9CB6C9] tracking-wider uppercase mt-0.5">
              Coastal Logbook · {collection.length} / {FISH_DB.length}
            </p>
          </div>
          <button onClick={() => setMode(AppMode.MENU)} className="p-2 nordic-btn">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 landscape:grid-cols-4 gap-3.5">
          {FISH_DB.map((fish) => {
            const caught = collection.includes(fish.id);
            return (
              <div
                key={fish.id}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center p-4 text-center transition-all relative overflow-hidden ${
                  caught
                    ? 'nordic-panel bg-[#1B3A56]/80'
                    : 'bg-[#0F2234]/55 border border-dashed border-[#F4EDE0]/18'
                }`}
              >
                {caught ? (
                  <>
                    <img
                      src={fish.spriteUrl}
                      alt={fish.name}
                      className="w-24 h-14 object-contain mb-2.5 transition hover:scale-105"
                    />
                    <p className="font-bold text-sm text-[#F4EDE0] leading-tight">{fish.name}</p>
                    <span className="text-[10px] uppercase font-bold text-[#E6AF52] mt-1 tracking-widest">
                      {fish.rarity}
                    </span>
                  </>
                ) : (
                  <>
                    <img
                      src={fish.spriteUrl}
                      alt="Unknown"
                      className="w-20 h-12 object-contain opacity-15 brightness-0 invert"
                    />
                    <span className="text-[11px] text-[#7391A8] mt-2 tracking-widest">UNSEEN</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderZen = () => (
    <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-end items-center pb-6 transition-all">
      {zenPanelOpen ? (
        <div className="nordic-panel p-5 pointer-events-auto w-full max-w-lg mx-4 animate-bounce-in absolute bottom-6">
          <div className="flex justify-between items-center mb-4 border-b border-[#F4EDE0]/15 pb-3">
            <h3 className="font-bold text-base tracking-wide text-[#F4EDE0] flex items-center gap-2">
              <Settings className="text-[#E6AF52]" size={18} />
              Environment Control
            </h3>
            <button
              onClick={() => setZenPanelOpen(false)}
              className="p-1.5 nordic-btn rounded-full"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Calendar date for lunar phase debugging */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold tracking-wider uppercase text-[#B8CEDD]">
                <span>Date</span>
                <span className="text-[#F4EDE0]/80 normal-case tracking-normal">{selectedMoonPhase.name} · {Math.round(selectedMoonPhase.illumination * 100)}%</span>
              </div>
              <div className="relative">
                <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E6AF52] pointer-events-none" />
                <input
                  type="date"
                  value={debugDate}
                  onChange={(e) => setDebugDate(e.target.value)}
                  className="w-full bg-[#0F2438] border border-[#F4EDE0]/15 rounded-lg pl-10 pr-3 py-2 text-sm text-[#F4EDE0] outline-none focus:border-[#E6AF52]"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            {/* Time Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold tracking-wider uppercase text-[#B8CEDD]">
                <span>Time of Day</span>
                <span className="text-[#F4EDE0]">{debugHour.toFixed(1)} h</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.1"
                value={debugHour}
                onChange={(e) => setDebugHour(parseFloat(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-[#142538] via-[#488EB8] to-[#8C6850] rounded-lg appearance-none cursor-pointer accent-[#FBE29A]"
              />
            </div>

            {/* Wind Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold tracking-wider uppercase text-[#B8CEDD]">
                <span>Wind Speed</span>
                <span className="text-[#F4EDE0]">{debugWind} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={debugWind}
                onChange={(e) => setDebugWind(parseInt(e.target.value))}
                className="w-full h-2 bg-[#0F2438] rounded-lg appearance-none cursor-pointer accent-[#7FB0CE]"
              />
            </div>

            {/* Weather Type */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { type: WeatherType.SUNNY, label: 'Sun', Icon: Sun },
                { type: WeatherType.RAINY, label: 'Rain', Icon: CloudDrizzle },
                { type: WeatherType.STORM, label: 'Storm', Icon: CloudLightning },
                { type: WeatherType.NIGHT, label: 'Night', Icon: Moon },
                { type: WeatherType.SNOW, label: 'Snow', Icon: Snowflake },
              ].map(({ type, label, Icon }) => {
                const active = debugWeather === type;
                return (
                  <button
                    key={type}
                    onClick={() => setDebugWeather(type)}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition border text-[11px] font-bold ${
                      active
                        ? 'bg-[#E6AF52]/25 border-[#E6AF52] text-[#FBE29A]'
                        : 'bg-[#F4EDE0]/5 border-[#F4EDE0]/15 text-[#A9C1D4] hover:bg-[#F4EDE0]/12'
                    }`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="nordic-panel px-5 py-2.5 rounded-full pointer-events-auto flex items-center gap-5 cursor-pointer hover:bg-[#1B3D5A]/90 transition-all absolute bottom-6"
          onClick={() => setZenPanelOpen(true)}
        >
          <span className="font-bold text-[#F4EDE0] text-sm tracking-wide">Zen Mode</span>

          <div className="hidden sm:flex items-center gap-3 text-[#B8CEDD] text-xs border-l border-[#F4EDE0]/20 pl-4">
            <div className="flex items-center gap-1.5">
              {atmosphere.isDay ? (
                <Sun size={14} className="text-[#FBE29A]" />
              ) : (
                <Moon size={14} className="text-[#B8CEDD]" />
              )}
              <span className="font-bold">{debugHour.toFixed(1)}h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind size={14} className="text-[#88C4B8]" />
              <span className="font-bold">{debugWind} km/h</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-[#F4EDE0]/20 pl-4">
            <div className="p-1.5 nordic-btn rounded-full">
              <Settings size={15} />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMode(AppMode.MENU);
              }}
              className="p-1.5 bg-[#C8533E]/25 hover:bg-[#C8533E]/45 text-[#F4C2B8] border border-[#C8533E]/40 rounded-full transition"
            >
              <LogOut size={15} />
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
         date={new Date(`${debugDate}T12:00:00`)}
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
