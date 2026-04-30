import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import PBSimCanvas, { PBWeather, weatherToPB } from './components/PBSimCanvas';
import { generateFishLore } from './services/geminiService';
import { fetchLocalWeather } from './services/weatherService';
import { AppMode, WeatherType, Fish, AtmosphereState } from './types';
import { FISH_DB, getRandomFish } from './utils/gameData';

const INK = '#1A2440';
const RED = '#D7392C';
const CREAM = '#FAF6E8';
const GOLD = '#F0D060';

const SERIF: React.CSSProperties = {
  fontFamily: "'Noto Serif SC', 'Source Han Serif SC', serif",
};

function hourLabel(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function isNightHour(h: number) { return h < 6 || h >= 19; }
function weatherCN(w: WeatherType) {
  return ({ [WeatherType.SUNNY]: '晴', [WeatherType.RAINY]: '雨', [WeatherType.STORM]: '暴风', [WeatherType.SNOW]: '雪', [WeatherType.NIGHT]: '夜' } as Record<WeatherType, string>)[w];
}
function fmtMS(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return { m: String(m).padStart(2, '0'), s: String(sec).padStart(2, '0') };
}

// Day-counter persisted in localStorage so the picture book has a "page number"
function getDayNumber(): number {
  try {
    const raw = localStorage.getItem('bottled_ocean_day');
    const todayKey = new Date().toISOString().slice(0, 10);
    if (raw) {
      const parsed = JSON.parse(raw) as { day: number; date: string };
      if (parsed.date === todayKey) return parsed.day;
      const next = parsed.day + 1;
      localStorage.setItem('bottled_ocean_day', JSON.stringify({ day: next, date: todayKey }));
      return next;
    }
    localStorage.setItem('bottled_ocean_day', JSON.stringify({ day: 1, date: todayKey }));
    return 1;
  } catch {
    return 1;
  }
}

const App: React.FC = () => {
  const { requestPermission, permissionGranted, isDesktop } = useDeviceOrientation();
  const wakeLockRef = useRef<any>(null);

  const [mode, setMode] = useState<AppMode>(AppMode.MENU);

  const [atmosphere, setAtmosphere] = useState<AtmosphereState>({
    type: WeatherType.SUNNY,
    localHour: 9,
    waveAmp: 1,
    waveSpeed: 0.1,
    windSpeed: 4,
    temperature: 22,
    hasRainbow: false,
    isDay: true,
    lightning: false,
  });

  const [locationName, setLocationName] = useState<string>('');
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [day] = useState<number>(getDayNumber());

  // Zen tweaks (live preview overrides)
  const [zenHour, setZenHour] = useState(12);
  const [zenWind, setZenWind] = useState(4);
  const [zenWeather, setZenWeather] = useState<WeatherType>(WeatherType.SUNNY);
  const [zenFishing, setZenFishing] = useState(false);
  const [zenPanelOpen, setZenPanelOpen] = useState(true);

  // Game
  const [focusDuration, setFocusDuration] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [caughtFish, setCaughtFish] = useState<Fish | null>(null);
  const [lore, setLore] = useState<string>('');
  const [loadingLore, setLoadingLore] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [collection, setCollection] = useState<string[]>([]);

  // boot collection
  useEffect(() => {
    const saved = localStorage.getItem('bottled_ocean_collection');
    if (saved) {
      try { setCollection(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // wall-clock tick
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  // sync atmosphere.localHour with real time when weather is auto-enabled
  useEffect(() => {
    if (!weatherEnabled) return;
    const h = now.getHours() + now.getMinutes() / 60;
    setAtmosphere(a => ({ ...a, localHour: h, isDay: h >= 6 && h < 19 }));
  }, [now, weatherEnabled]);

  // landscape orientation lock once
  useEffect(() => {
    (async () => {
      try {
        const o: any = (screen as any).orientation;
        if (o && o.lock) await o.lock('landscape').catch(() => {});
      } catch { /* noop */ }
    })();
  }, []);

  // wake lock during focus / zen
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => { /* noop */ });
      } catch {
        /* policy may block; ignore */
      }
    }
  }, []);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    (async () => {
      if (mode === AppMode.FOCUSING || mode === AppMode.ZEN) {
        await requestWakeLock();
        const onVis = () => {
          if (document.visibilityState === 'visible' && !wakeLockRef.current) requestWakeLock();
        };
        document.addEventListener('visibilitychange', onVis);
        dispose = () => document.removeEventListener('visibilitychange', onVis);
      } else {
        if (wakeLockRef.current) {
          try { await wakeLockRef.current.release(); } catch { /* noop */ }
          wakeLockRef.current = null;
        }
      }
    })();
    return () => {
      dispose?.();
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch { /* noop */ }
        wakeLockRef.current = null;
      }
    };
  }, [mode, requestWakeLock]);

  // sync local weather (geolocation)
  const handleEnableWeather = async () => {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false, timeout: 15000, maximumAge: 60000,
      });
      const { latitude, longitude } = pos.coords;
      setLocationName(`${latitude.toFixed(1)}°N, ${longitude.toFixed(1)}°E`);
      const w = await fetchLocalWeather(latitude, longitude);
      setAtmosphere(w);
      setWeatherEnabled(true);
    } catch (e: any) {
      console.error('Geo error', e);
      const msg = e?.message?.includes('permission') || e?.message?.includes('denied')
        ? '请到系统设置中允许定位权限'
        : (e?.message || '获取位置失败');
      alert(`定位失败：${msg}`);
    }
  };

  // focus timer
  useEffect(() => {
    if (mode !== AppMode.FOCUSING || timeLeft <= 0) return;
    const i = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleSuccess(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [mode, timeLeft]);

  const startFocus = async (min: number) => {
    if (!permissionGranted && !isDesktop) await requestPermission();
    setFocusDuration(min);
    setTimeLeft(min * 60);
    setMode(AppMode.FOCUSING);
    setShowQuitConfirm(false);
  };

  const handleSuccess = async () => {
    const weatherForFish = atmosphere.type;
    const fish = getRandomFish(focusDuration, weatherForFish);
    setCaughtFish(fish);
    setMode(AppMode.REWARD);

    const next = Array.from(new Set([...collection, fish.id]));
    setCollection(next);
    localStorage.setItem('bottled_ocean_collection', JSON.stringify(next));

    setLoadingLore(true);
    try {
      const text = await generateFishLore(fish, weatherForFish);
      setLore(text);
    } catch {
      setLore(`钓上来一条${fish.name}。`);
    } finally {
      setLoadingLore(false);
    }
  };

  const handleQuit = () => {
    setMode(AppMode.MENU);
    setShowQuitConfirm(false);
    setTimeLeft(0);
  };

  // ========== Canvas params ==========

  const canvasParams = ((): { hour: number; wind: number; weather: PBWeather; fishing: boolean; shipX: number | null; shipScale: number } => {
    if (mode === AppMode.ZEN) {
      return {
        hour: zenHour,
        wind: zenWind,
        weather: weatherToPB(zenWeather),
        fishing: zenFishing,
        shipX: null,
        shipScale: 1,
      };
    }
    if (mode === AppMode.MENU) {
      return {
        hour: 8.5,
        wind: 2,
        weather: 'SUNNY',
        fishing: false,
        shipX: null,
        shipScale: 1.1,
      };
    }
    if (mode === AppMode.REWARD) {
      return {
        hour: atmosphere.localHour,
        wind: 3,
        weather: weatherToPB(atmosphere.type),
        fishing: false,
        shipX: null,
        shipScale: 1.05,
      };
    }
    // FOCUSING — drift hour forward by elapsed seconds (1 sec real ≈ 0.5 min in story-time)
    const elapsed = focusDuration * 60 - timeLeft;
    const hourOffset = (elapsed / 60) * 0.5;
    return {
      hour: (atmosphere.localHour + hourOffset) % 24,
      wind: Math.max(2, atmosphere.windSpeed),
      weather: weatherToPB(atmosphere.type),
      fishing: false,
      shipX: null,
      shipScale: 1.0,
    };
  })();

  const isNight = isNightHour(canvasParams.hour) || canvasParams.weather === 'STORM';
  const textColor = isNight ? CREAM : INK;
  const accent = isNight ? GOLD : RED;
  const textShadow = isNight ? '0 1px 2px rgba(0,0,0,0.45)' : 'none';

  // =================== RENDER ===================

  const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="absolute inset-0 overflow-hidden">
      <PBSimCanvas
        hour={canvasParams.hour}
        wind={canvasParams.wind}
        weather={canvasParams.weather}
        fishing={canvasParams.fishing || (mode === AppMode.FOCUSING)}
        shipX={canvasParams.shipX}
        shipScale={canvasParams.shipScale}
      />
      {children}
    </div>
  );

  // Day-mark shown on every screen
  const DayMark = (
    <div
      className="absolute font-serif-cn"
      style={{
        ...SERIF, color: textColor, opacity: 0.5,
        fontSize: 11, letterSpacing: 2,
        left: 56, bottom: 22,
        textShadow,
        pointerEvents: 'none',
      }}
    >
      — 第 {day} 日 —
    </div>
  );

  const renderMenu = () => (
    <>
      <div
        className="absolute"
        style={{ ...SERIF, color: INK, left: 56, top: 48, lineHeight: 1.55, pointerEvents: 'none' }}
      >
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 1 }}>小船的一日</div>
        <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>把手机放进瓶子里</div>
      </div>

      {/* Time picks */}
      <div
        className="absolute"
        style={{ ...SERIF, color: INK, right: 56, top: 96, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {[
          { m: 25, hint: '一段海风' },
          { m: 45, hint: '越过几座小岛' },
          { m: 90, hint: '抵达远方港口' },
        ].map((it, i) => (
          <button
            key={it.m}
            onClick={() => startFocus(it.m)}
            className="group"
            style={{
              background: 'transparent', border: 'none', padding: '4px 6px',
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'baseline', gap: 12,
              color: INK, fontFamily: SERIF.fontFamily,
            }}
          >
            <span style={{ fontSize: 42, fontWeight: 700, color: i === 1 ? RED : INK, lineHeight: 1 }}>{it.m}</span>
            <span style={{ fontSize: 12, opacity: 0.65 }}>分钟</span>
            <span style={{ fontSize: 13, opacity: 0.6, marginLeft: 4 }}>· {it.hint}</span>
          </button>
        ))}
      </div>

      {/* Bottom links: collection / zen / weather sync */}
      <div
        className="absolute"
        style={{
          ...SERIF, left: 56, bottom: 50, color: INK,
          display: 'flex', gap: 22, fontSize: 13, alignItems: 'center',
        }}
      >
        <button
          onClick={() => setMode(AppMode.COLLECTION)}
          style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            color: INK, fontFamily: SERIF.fontFamily,
            borderBottom: '1.5px solid #1A2440', paddingBottom: 2,
          }}
        >
          翻看图鉴
        </button>
        <button
          onClick={async () => {
            if (!permissionGranted && !isDesktop) await requestPermission();
            setMode(AppMode.ZEN);
          }}
          style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            color: INK, opacity: 0.7, fontFamily: SERIF.fontFamily,
          }}
        >
          自由瓶
        </button>
        {!weatherEnabled ? (
          <button
            onClick={handleEnableWeather}
            style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              color: INK, opacity: 0.55, fontFamily: SERIF.fontFamily,
            }}
          >
            同步天气
          </button>
        ) : (
          <span style={{ opacity: 0.55 }}>· 已同步 {locationName}</span>
        )}
      </div>

      {/* Top-right: real now */}
      <div
        className="absolute"
        style={{ ...SERIF, right: 40, top: 22, textAlign: 'right', color: INK, pointerEvents: 'none' }}
      >
        <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 2 }}>
          {weatherEnabled ? `${locationName} · ${weatherCN(atmosphere.type)} ${Math.round(atmosphere.temperature)}°` : '港口附近无浪'}
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>
          {now.toTimeString().slice(0, 5)}
        </div>
      </div>

      {DayMark}
    </>
  );

  const renderFocusing = () => {
    const { m, s } = fmtMS(timeLeft);
    const total = focusDuration * 60;
    const elapsed = total - timeLeft;
    const ratio = total > 0 ? elapsed / total : 0;

    let leftStory: React.ReactNode = (
      <>小船精神百倍地出发了。<br />目的地是一座大港口城市。<br />那是它从没有去过的地方。</>
    );
    let rightStory: React.ReactNode = (
      <>在辽阔的海面上，<br />小船鼓足劲朝前开。<br /><span style={{ fontStyle: 'italic', opacity: 0.75 }}>"海风吹得真舒服呀！"</span></>
    );
    let badge = '已开了';

    const hr = canvasParams.hour;
    if (canvasParams.weather === 'RAINY') {
      leftStory = <>下雨了。<br />小船的红船底，<br />被雨打得"咚咚咚"响。</>;
      rightStory = <span style={{ fontStyle: 'italic', opacity: 0.85 }}>"雨天的海，<br />是另一种海。"</span>;
      badge = '雨天航行';
    } else if (canvasParams.weather === 'STORM') {
      leftStory = <>起风了！<br />浪一下子高过了船头。</>;
      rightStory = <span style={{ fontStyle: 'italic', opacity: 0.92 }}>"别怕别怕，<br />我会稳稳地开过去。"</span>;
      badge = '顶风';
    } else if (canvasParams.weather === 'SNOW') {
      leftStory = <>天上下起了雪，<br />海面安安静静的。</>;
      rightStory = <span style={{ fontStyle: 'italic', opacity: 0.85 }}>"雪落在海里，<br />就化成海了。"</span>;
      badge = '雪日航行';
    } else if (hr >= 17 && hr < 20) {
      leftStory = <>快到傍晚了。<br /><span style={{ fontStyle: 'italic', opacity: 0.85 }}>"大港口城市，还很远吗？"</span></>;
      rightStory = null;
      badge = '暮色航行';
    } else if (hr < 6 || hr >= 20) {
      leftStory = <span style={{ fontStyle: 'italic', opacity: 0.92 }}>"在这儿休息一下吧。"</span>;
      rightStory = <>哗哗哗……<br />听着海浪的声音，<br />小船进入了梦乡。</>;
      badge = '夜航';
    }

    return (
      <>
        {/* Left narration */}
        <div
          className="absolute"
          style={{
            ...SERIF, left: 56, top: 56,
            color: textColor, fontSize: 15, lineHeight: 1.7,
            textShadow, pointerEvents: 'none', maxWidth: 320,
          }}
        >
          {leftStory}
        </div>

        {/* Right narration */}
        {rightStory && (
          <div
            className="absolute"
            style={{
              ...SERIF, left: 520, top: 300,
              color: textColor, fontSize: 13, lineHeight: 1.7, opacity: 0.92,
              textShadow, pointerEvents: 'none', width: 280,
            }}
          >
            {rightStory}
          </div>
        )}

        {/* Top-right HUD: badge + timer + progress bar */}
        <div
          className="absolute"
          style={{ ...SERIF, right: 40, top: 22, textAlign: 'right', color: textColor, textShadow, pointerEvents: 'none' }}
        >
          <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2 }}>{badge}</div>
          <div style={{ fontSize: 32, fontWeight: 600, lineHeight: 1, marginTop: 2 }}>
            {m}<span style={{ fontSize: 16, opacity: 0.6 }}>分</span>{s}<span style={{ fontSize: 16, opacity: 0.6 }}>秒</span>
          </div>
          <div style={{ width: 140, height: 2, background: isNight ? '#FAF6E822' : '#1A244022', marginTop: 6, marginLeft: 'auto' }}>
            <div style={{ width: `${Math.max(2, Math.round(ratio * 100))}%`, height: '100%', background: accent }} />
          </div>
        </div>

        {/* Stop tap target — bottom-right, mostly invisible */}
        <button
          onClick={() => setShowQuitConfirm(true)}
          style={{
            position: 'absolute', right: 40, bottom: 22,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: textColor, opacity: 0.5,
            fontFamily: SERIF.fontFamily, fontSize: 12, letterSpacing: 2, textShadow,
          }}
        >
          靠岸
        </button>

        {DayMark}

        {showQuitConfirm && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(20,28,52,0.45)', backdropFilter: 'blur(2px)', pointerEvents: 'auto', zIndex: 100 }}
          >
            <div
              style={{
                ...SERIF, background: '#F1ECDB', color: INK,
                borderRadius: 10, padding: '28px 32px',
                width: 320, textAlign: 'center',
                boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                border: '1px solid rgba(26,36,64,0.15)',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>要中途靠岸吗？</div>
              <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.7, marginBottom: 22 }}>
                现在掉头，<br />今天就钓不到鱼啦。
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button
                  onClick={() => setShowQuitConfirm(false)}
                  style={{
                    fontFamily: SERIF.fontFamily, background: 'transparent',
                    border: '1px solid #1A2440', color: INK,
                    padding: '8px 22px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  }}
                >继续航行</button>
                <button
                  onClick={handleQuit}
                  style={{
                    fontFamily: SERIF.fontFamily, background: RED, color: CREAM,
                    border: '1px solid ' + RED,
                    padding: '8px 22px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  }}
                >靠岸</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderReward = () => (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: 'rgba(20,28,52,0.35)', backdropFilter: 'blur(1.5px)', zIndex: 60 }}
    >
      <div
        style={{
          ...SERIF, background: '#F1ECDB', color: INK,
          borderRadius: 10, padding: '24px 28px',
          width: 380, textAlign: 'center',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          border: '1px solid rgba(26,36,64,0.15)',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 2, marginBottom: 6 }}>
          —— 第 {day} 日 · 海风正好 ——
        </div>
        <div style={{ fontSize: 56, marginBottom: 6 }}>{caughtFish?.icon ?? '🐟'}</div>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
          {caughtFish?.name ?? '一条小鱼'}
        </div>
        <div style={{ fontSize: 11, color: RED, letterSpacing: 2, marginBottom: 14 }}>
          {caughtFish?.rarity?.toUpperCase()}
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.5)', borderRadius: 6,
            padding: '12px 14px', textAlign: 'left',
            fontSize: 13, lineHeight: 1.7, color: INK, opacity: 0.9,
            fontStyle: 'italic', minHeight: 70,
          }}
        >
          {loadingLore ? '老船长正在小本子上写字……' : `"${lore}"`}
        </div>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 18 }}>
          <button
            onClick={() => setMode(AppMode.MENU)}
            style={{
              fontFamily: SERIF.fontFamily, background: 'transparent',
              border: 'none', borderBottom: '1.5px solid #1A2440',
              color: INK, padding: '4px 6px', cursor: 'pointer', fontSize: 13,
            }}
          >收进图鉴</button>
          <button
            onClick={() => setMode(AppMode.MENU)}
            style={{
              fontFamily: SERIF.fontFamily, background: 'transparent',
              border: 'none', color: INK, opacity: 0.55,
              padding: '4px 6px', cursor: 'pointer', fontSize: 13,
            }}
          >放回海里</button>
        </div>
      </div>
    </div>
  );

  const renderCollection = () => (
    <div
      className="absolute inset-0 overflow-y-auto"
      style={{ background: '#ECEAE3', zIndex: 70 }}
    >
      <div style={{ padding: '28px 56px 80px', maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
          <div>
            <div style={{ ...SERIF, fontSize: 24, fontWeight: 600, color: INK }}>瓶中海 · 图鉴</div>
            <div style={{ ...SERIF, fontSize: 12, color: INK, opacity: 0.55, marginTop: 2 }}>
              已收 {collection.length} / {FISH_DB.length}
            </div>
          </div>
          <button
            onClick={() => setMode(AppMode.MENU)}
            style={{
              fontFamily: SERIF.fontFamily, background: 'transparent',
              border: 'none', borderBottom: '1.5px solid #1A2440',
              color: INK, padding: '2px 4px', cursor: 'pointer', fontSize: 13,
            }}
          >回到港口</button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 14,
          }}
        >
          {FISH_DB.map(fish => {
            const has = collection.includes(fish.id);
            return (
              <div
                key={fish.id}
                style={{
                  background: has ? '#F1ECDB' : 'rgba(26,36,64,0.04)',
                  border: has ? '1px solid rgba(26,36,64,0.15)' : '1px dashed rgba(26,36,64,0.20)',
                  borderRadius: 6, padding: '16px 10px',
                  textAlign: 'center', minHeight: 130,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  ...SERIF,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 6, filter: has ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                  {fish.icon}
                </div>
                {has ? (
                  <>
                    <div style={{ fontSize: 14, color: INK, fontWeight: 500 }}>{fish.name}</div>
                    <div style={{ fontSize: 10, color: RED, letterSpacing: 2, marginTop: 4 }}>
                      {fish.rarity.toUpperCase()}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: INK, opacity: 0.4 }}>—— 未遇见 ——</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderZen = () => (
    <>
      <div
        className="absolute"
        style={{
          ...SERIF, left: 56, top: 50,
          color: textColor, fontSize: 14, lineHeight: 1.7,
          textShadow, pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 2, marginBottom: 4 }}>
          自由瓶 · 实时模拟
        </div>
        {zenFishing
          ? <>小船把鱼线<br />抛进了海里。<br /><span style={{ fontStyle: 'italic', opacity: 0.75 }}>"会等到什么呢？"</span></>
          : <>小船在海上慢慢地开。<br /><span style={{ fontStyle: 'italic', opacity: 0.75 }}>"今天的风刚刚好。"</span></>
        }
      </div>

      <div
        className="absolute"
        style={{ ...SERIF, right: 40, top: 22, textAlign: 'right', color: textColor, textShadow, pointerEvents: 'none' }}
      >
        <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2 }}>
          {hourLabel(zenHour)} · {weatherCN(zenWeather)} · 风 {zenWind}
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
          {now.toTimeString().slice(0, 5)}
        </div>
      </div>

      {zenPanelOpen ? (
        <div
          style={{
            position: 'absolute', right: 24, bottom: 24, width: 260,
            background: 'rgba(250,249,247,0.78)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '0.5px solid rgba(255,255,255,0.6)',
            borderRadius: 14,
            boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 12px 40px rgba(0,0,0,0.18)',
            color: '#29261b',
            font: '11.5px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif',
            zIndex: 50,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 8px 10px 14px' }}>
            <b style={{ fontSize: 12, letterSpacing: 0.1 }}>Tweaks</b>
            <button
              onClick={() => setZenPanelOpen(false)}
              style={{
                appearance: 'none', border: 0, background: 'transparent',
                color: 'rgba(41,38,27,0.55)', width: 22, height: 22,
                borderRadius: 6, cursor: 'pointer', fontSize: 13, lineHeight: 1,
              }}
            >×</button>
          </div>

          <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(41,38,27,0.45)' }}>时间</div>
            <SliderRow label="时刻" value={zenHour} min={0} max={24} step={0.5} unit="h"
              onChange={setZenHour} />

            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(41,38,27,0.45)', paddingTop: 6 }}>海况</div>
            <SliderRow label="风速" value={zenWind} min={0} max={50} step={1} unit=" km/h"
              onChange={setZenWind} />

            <RadioRow label="天气" value={zenWeather}
              options={[
                { value: WeatherType.SUNNY, label: '晴' },
                { value: WeatherType.RAINY, label: '雨' },
                { value: WeatherType.STORM, label: '暴风' },
                { value: WeatherType.SNOW, label: '雪' },
              ]}
              onChange={setZenWeather} />

            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(41,38,27,0.45)', paddingTop: 6 }}>动作</div>
            <ToggleRow label="放下鱼竿" value={zenFishing} onChange={setZenFishing} />

            <button
              onClick={() => setMode(AppMode.MENU)}
              style={{
                marginTop: 8,
                appearance: 'none', width: '100%', height: 28, padding: '0 8px',
                border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 7,
                background: 'rgba(255,255,255,0.6)', color: 'inherit',
                font: 'inherit', cursor: 'pointer',
              }}
            >返回港口</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setZenPanelOpen(true)}
          style={{
            position: 'absolute', right: 24, bottom: 24,
            background: 'rgba(250,249,247,0.78)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '0.5px solid rgba(255,255,255,0.6)',
            borderRadius: 14,
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            padding: '8px 14px',
            color: '#29261b', cursor: 'pointer',
            font: '12px ui-sans-serif, system-ui, sans-serif',
            zIndex: 50,
          }}
        >Tweaks</button>
      )}

      {DayMark}
    </>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden select-none" style={{ background: '#ECEAE3', color: INK }}>
      <Stage>
        {mode === AppMode.MENU && renderMenu()}
        {mode === AppMode.FOCUSING && renderFocusing()}
        {mode === AppMode.ZEN && renderZen()}
      </Stage>

      {mode === AppMode.REWARD && renderReward()}
      {mode === AppMode.COLLECTION && renderCollection()}
    </div>
  );
};

// =================== Tweak controls ===================

interface SliderRowProps {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}
const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: 'rgba(41,38,27,0.72)' }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <span style={{ color: 'rgba(41,38,27,0.5)', fontVariantNumeric: 'tabular-nums' }}>
        {Number.isInteger(value) ? value : value.toFixed(1)}{unit}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{ width: '100%' }}
    />
  </div>
);

interface RadioRowProps<T extends string> {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}
function RadioRow<T extends string>({ label, value, options, onChange }: RadioRowProps<T>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ color: 'rgba(41,38,27,0.72)', fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.05)', padding: 2, borderRadius: 7 }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, appearance: 'none', border: 0, padding: '4px 0',
              borderRadius: 5, font: 'inherit', cursor: 'pointer',
              background: value === opt.value ? 'rgba(255,255,255,0.85)' : 'transparent',
              color: value === opt.value ? '#29261b' : 'rgba(41,38,27,0.65)',
              boxShadow: value === opt.value ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >{opt.label}</button>
        ))}
      </div>
    </div>
  );
}

const ToggleRow: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
    <span style={{ color: 'rgba(41,38,27,0.72)', fontWeight: 500 }}>{label}</span>
    <button
      onClick={() => onChange(!value)}
      style={{
        appearance: 'none', border: 0, padding: 0,
        width: 32, height: 18, borderRadius: 999,
        background: value ? '#1A2440' : 'rgba(0,0,0,0.18)',
        position: 'relative', cursor: 'pointer', transition: 'background 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 16 : 2,
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff', transition: 'left 0.15s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
      }} />
    </button>
  </div>
);

export default App;
