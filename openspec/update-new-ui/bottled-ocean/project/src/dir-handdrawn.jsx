// Direction A — Bright Hand-drawn (rebuilt + brighter, with weather variants)
// SYSTEM: Patrick Hand display, Nunito UI. Cheerful sky-blue palette per the real app:
// sky-blue title #2BA0E0, navy ink #1F3A5F, sunny gradient sky → white puffy clouds → navy ocean.
// Three weather variants share components: SUNNY, SUNSET, NIGHT, RAINY.

const A_TITLE = '#2BA0E0';
const A_INK   = '#1F3A5F';
const A_PAPER = '#FFFEF8';
const A_OCEAN1= '#5BA8D9';
const A_OCEAN2= '#1E4F80';
const A_SUN   = '#FF6B5C';   // bright coral sun (matches photo 2)
const A_MOON  = '#FFD96A';

// ---- Sky scenes (background only) ------------------------------------------

function SkySunny() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden',
      background: 'linear-gradient(180deg, #B8E4FA 0%, #7CC4ED 55%, #5BA8D9 60%, #1E4F80 100%)' }}>
      {/* Big bright coral sun */}
      <div style={{
        position:'absolute', top: 80, left: 380, width: 64, height: 64,
        borderRadius:'50%', background: A_SUN,
        boxShadow: '0 0 0 10px rgba(255,107,92,0.18), 0 0 0 22px rgba(255,107,92,0.08)',
      }}/>
      {/* sun rays */}
      <svg width="170" height="170" style={{ position:'absolute', top: 27, left: 327 }} viewBox="0 0 170 170">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const x1 = 85 + Math.cos(a) * 50, y1 = 85 + Math.sin(a) * 50;
          const x2 = 85 + Math.cos(a) * 70, y2 = 85 + Math.sin(a) * 70;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={A_SUN} strokeWidth="3" strokeLinecap="round"/>;
        })}
      </svg>
      <Clouds/>
      <Ocean wavy/>
      <Boat x={70} y={232}/>
    </div>
  );
}

function SkyNight() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden',
      background: 'linear-gradient(180deg, #0E1B3A 0%, #182F5C 50%, #1E4F80 60%, #0F2B4D 100%)' }}>
      {/* stars */}
      <svg style={{ position:'absolute', inset:0 }} width="100%" height="100%" viewBox="0 0 874 402" preserveAspectRatio="none">
        {Array.from({ length: 50 }).map((_, i) => {
          const x = (i*73 + 17) % 874, y = (i*41 + 7) % 220;
          const r = i%4===0 ? 1.6 : 0.9;
          return <circle key={i} cx={x} cy={y} r={r} fill="#FFE89A" opacity={0.85}/>;
        })}
        {/* tiny crosses for star sparkle */}
        {[[120,60],[420,40],[640,80],[760,50],[300,90]].map(([x,y],i)=>(
          <g key={'s'+i} stroke="#FFE89A" strokeWidth="1.2" strokeLinecap="round">
            <line x1={x-5} y1={y} x2={x+5} y2={y}/><line x1={x} y1={y-5} x2={x} y2={y+5}/>
          </g>
        ))}
      </svg>
      {/* crescent moon */}
      <div style={{ position:'absolute', top: 60, left: 380, width: 56, height: 56 }}>
        <svg viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill={A_MOON}/>
          <circle cx="38" cy="22" r="22" fill="#0E1B3A"/>
        </svg>
      </div>
      <Clouds dim/>
      <Ocean dark/>
      <Boat x={70} y={232} dark/>
    </div>
  );
}

function SkyRainy() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden',
      background: 'linear-gradient(180deg, #B6C3D2 0%, #8FA3B8 55%, #5C7E9C 60%, #2B4660 100%)' }}>
      <Clouds heavy/>
      {/* rain streaks */}
      <svg style={{ position:'absolute', inset:0 }} width="100%" height="100%" viewBox="0 0 874 402" preserveAspectRatio="none">
        {Array.from({ length: 80 }).map((_,i) => {
          const x = (i*43+5) % 874, y = (i*31+10) % 240;
          return <line key={i} x1={x} y1={y} x2={x-4} y2={y+12} stroke="#E8F0F7" strokeWidth="1.3" opacity="0.7"/>;
        })}
      </svg>
      <Ocean rough/>
      <Boat x={70} y={232}/>
    </div>
  );
}

function Clouds({ dim, heavy }) {
  const fill = '#FFFFFF';
  const op = dim ? 0.7 : 1;
  return (
    <>
      <Cloud x={120} y={55} s={1.1} fill={fill} op={op}/>
      <Cloud x={250} y={95} s={0.8} fill={fill} op={op}/>
      <Cloud x={620} y={70} s={1.0} fill={fill} op={op}/>
      <Cloud x={760} y={120} s={0.7} fill={fill} op={op}/>
      {heavy && <>
        <Cloud x={420} y={110} s={1.3} fill="#E5EBF2" op={1}/>
        <Cloud x={520} y={60} s={1.1} fill="#E5EBF2" op={1}/>
      </>}
    </>
  );
}

function Cloud({ x, y, s = 1, fill='#fff', op = 1 }) {
  return (
    <svg style={{ position:'absolute', left: x, top: y }} width={90*s} height={50*s} viewBox="0 0 90 50">
      <ellipse cx="22" cy="32" rx="20" ry="14" fill={fill} opacity={op}/>
      <ellipse cx="44" cy="22" rx="22" ry="16" fill={fill} opacity={op}/>
      <ellipse cx="66" cy="30" rx="20" ry="14" fill={fill} opacity={op}/>
      <ellipse cx="40" cy="36" rx="28" ry="10" fill={fill} opacity={op}/>
    </svg>
  );
}

function Ocean({ wavy, dark, rough }) {
  const c1 = dark ? '#21527E' : (rough ? '#3B6789' : '#5BA8D9');
  const c2 = dark ? '#0F2B4D' : (rough ? '#1E3F5C' : '#1E4F80');
  const c3 = dark ? '#071A33' : (rough ? '#0E2438' : '#0F2B4D');
  return (
    <svg width="100%" height="100%" viewBox="0 0 874 402" preserveAspectRatio="none"
      style={{ position:'absolute', inset: 0 }}>
      <path d="M0,225 Q140,212 280,225 T560,222 T874,228 L874,402 L0,402 Z" fill={c1}/>
      <path d="M0,250 Q140,238 280,255 T560,250 T874,258 L874,402 L0,402 Z" fill={c2}/>
      <path d="M0,290 Q150,275 300,295 T600,288 T874,300 L874,402 L0,402 Z" fill={c3}/>
      {/* whitecaps */}
      {(wavy || rough) && (
        <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" fill="none">
          <path d="M40 232 q10 -4 20 0 M180 235 q10 -4 20 0 M340 232 q10 -4 20 0
                   M520 236 q10 -4 20 0 M700 232 q10 -4 20 0
                   M120 268 q10 -4 20 0 M460 270 q10 -4 20 0 M780 264 q10 -4 20 0"/>
        </g>
      )}
    </svg>
  );
}

function Boat({ x, y, dark }) {
  return (
    <svg style={{ position:'absolute', left: x, top: y }} width="58" height="42" viewBox="0 0 58 42">
      <path d="M2 28 L56 28 L48 36 L10 36 Z" fill="#FF6B5C"/>
      <path d="M22 28 L22 6 L46 28 Z" fill="#FFFFFF"/>
      <line x1="22" y1="6" x2="22" y2="28" stroke={A_INK} strokeWidth="1.2"/>
      <circle cx="32" cy="32" r="2" fill="#FFD96A"/>
      <circle cx="40" cy="32" r="2" fill="#FFD96A"/>
      {/* anchor squiggle */}
      <path d="M6 39 q4 -2 8 0 t 8 0 t 8 0 t 8 0 t 8 0" stroke="#fff" strokeWidth="1.4" fill="none" opacity={dark?0.6:0.8}/>
    </svg>
  );
}

// Reusable hand-drawn card
function HCard({ children, rotate = 0, style = {} }) {
  return (
    <div style={{
      background: A_PAPER, border: `2px solid ${A_INK}1F`, borderRadius: 16,
      boxShadow: '4px 4px 0 rgba(0,0,0,0.12)',
      padding: '12px 14px', transform: `rotate(${rotate}deg)`, ...style,
    }}>{children}</div>
  );
}

// Title block (white outlined Patrick-Hand title like the photo)
function HTitle({ light }) {
  return (
    <div style={{ minWidth: 0 }}>
      <h1 style={{
        fontFamily:"'Patrick Hand', cursive", fontSize: 56, lineHeight: 0.95,
        margin: 0, letterSpacing: -0.5, color: A_TITLE, transform:'rotate(-2deg)',
        transformOrigin: 'left center',
        textShadow: light
          ? '0 2px 0 rgba(0,0,0,0.05)'
          : '2px 2px 0 #FFFFFFCC',
      }}>Focus<br/>Fishing</h1>
      <div style={{
        fontFamily:"'Patrick Hand', cursive", fontSize: 17, color: light ? '#fff' : A_INK,
        opacity: light ? 0.9 : 0.75, display:'flex', alignItems:'center', gap: 8, marginTop: 8,
      }}>
        <span>⚓︎</span> put your phone in a bottle
      </div>
    </div>
  );
}

// Cast time card
function HCastCard() {
  return (
    <HCard rotate={1} style={{ minWidth: 280 }}>
      <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 18, color: A_INK,
        display:'flex', alignItems:'center', gap: 6, marginBottom: 8 }}>
        <span>⏱</span> Select Focus Time
      </div>
      <div style={{ display:'flex', gap: 8 }}>
        {[15, 30, 45].map((m, i) => (
          <button key={m} style={{
            flex: 1, padding: '10px 0',
            fontFamily:"'Patrick Hand', cursive", fontSize: 22,
            background: i===2 ? '#D6EEFB' : '#EAF6FD',
            color: A_TITLE, border: `2px solid #BBDDF1`,
            borderRadius: 12, cursor:'pointer',
          }}>{m}m</button>
        ))}
      </div>
    </HCard>
  );
}

function HMiniCards() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
      <HCard rotate={-1} style={{ display:'flex', alignItems:'center', gap: 10 }}>
        <span style={{ fontSize: 22, color:'#FF6B5C' }}>📖</span>
        <div>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 18, color: A_INK, lineHeight: 1 }}>FishDex</div>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 13, color: A_INK, opacity: 0.55 }}>14 / 42</div>
        </div>
      </HCard>
      <HCard rotate={1} style={{ display:'flex', alignItems:'center', gap: 10 }}>
        <span style={{ fontSize: 22, color:'#3FBE8E' }}>🍀</span>
        <div>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 18, color: A_INK, lineHeight: 1 }}>Zen Mode</div>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 13, color: A_INK, opacity: 0.55 }}>3 swimming</div>
        </div>
      </HCard>
    </div>
  );
}

function HWeatherChip({ label = 'Ocean Synced', sub = '40.0°N · 116.3°E' }) {
  return (
    <HCard rotate={0} style={{ display:'flex', alignItems:'center', gap: 10, padding: '8px 12px', whiteSpace:'nowrap' }}>
      <span style={{
        width: 26, height: 26, borderRadius: 13, background:'#D8F1E4', flexShrink: 0,
        display:'flex', alignItems:'center', justifyContent:'center', color:'#2EAA76', fontSize: 14,
      }}>📍</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 15, color:'#2EAA76', lineHeight: 1 }}>{label}</div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10.5, color: A_INK, opacity: 0.55, marginTop: 2 }}>{sub}</div>
      </div>
    </HCard>
  );
}

// MENU layouts (one per weather)
function AMenuLayout({ Sky, light }) {
  return (
    <div style={{ position:'absolute', inset:0, fontFamily:'Nunito, sans-serif' }}>
      <Sky/>
      <div style={{
        position:'absolute', inset: 0, padding: '32px 70px 28px 80px',
        display:'grid', gridTemplateColumns:'minmax(0, 1fr) 320px', gap: 28, alignItems:'center',
      }}>
        <div style={{ alignSelf:'center' }}>
          <HTitle light={light}/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
          <HCastCard/>
          <HMiniCards/>
          <HWeatherChip/>
        </div>
      </div>
    </div>
  );
}

function AMenu()        { return <AMenuLayout Sky={SkySunny}/>; }
function AMenuNight()   { return <AMenuLayout Sky={SkyNight} light/>; }
function AMenuRainy()   { return <AMenuLayout Sky={SkyRainy}/>; }

// FOCUS — bright sunny version
function AFocus() {
  return (
    <div style={{ position:'absolute', inset: 0, fontFamily:'Nunito, sans-serif' }}>
      <SkySunny/>
      {/* Float */}
      <div style={{ position:'absolute', left: 230, top: 200 }}>
        <svg viewBox="0 0 60 30" width="60" height="30">
          <line x1="30" y1="0" x2="30" y2="14" stroke={A_INK} strokeWidth="1.5"/>
          <circle cx="30" cy="16" r="6" fill={A_SUN} stroke={A_INK} strokeWidth="2"/>
          <path d="M22 22 q8 5 16 0" stroke={A_INK} fill="none" strokeWidth="1.5"/>
        </svg>
      </div>

      {/* HUD timer card */}
      <div style={{
        position:'absolute', right: 56, top: 60, width: 200,
      }}>
        <HCard rotate={1} style={{ textAlign:'center', padding: '14px 16px 12px' }}>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 56, color: A_TITLE, lineHeight: 1 }}>12:34</div>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 13, color: A_INK, opacity: 0.6,
            letterSpacing: 1.5, textTransform:'uppercase', marginTop: 4 }}>line in the water</div>
          <div style={{ marginTop: 10, height: 4, background:`${A_INK}14`, borderRadius: 2, overflow:'hidden' }}>
            <div style={{ width: '38%', height:'100%', background: A_SUN }}/>
          </div>
        </HCard>
      </div>

      {/* Don't-touch badge */}
      <div style={{ position:'absolute', left: 56, bottom: 30 }}>
        <HCard rotate={-1} style={{ display:'flex', alignItems:'center', gap: 8, padding: '8px 12px' }}>
          <span style={{ fontSize: 18 }}>🍾</span>
          <span style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 16, color: A_INK }}>bottle steady · don't touch</span>
        </HCard>
      </div>

      <div style={{
        position:'absolute', left: 320, top: 70,
        fontFamily:"'Patrick Hand', cursive", fontSize: 18, color: A_INK, opacity: 0.65,
        transform:'rotate(-3deg)',
      }}>something's nibbling…</div>
    </div>
  );
}

// REWARD — bright modal on sunny scene
function AReward() {
  return (
    <div style={{ position:'absolute', inset:0, fontFamily:'Nunito, sans-serif' }}>
      <SkySunny/>
      <div style={{ position:'absolute', inset:0, background:'rgba(20,40,80,0.35)', backdropFilter:'blur(2px)' }}/>
      <div style={{
        position:'absolute', left: '50%', top:'50%', transform:'translate(-50%,-50%) rotate(-1deg)',
        width: 480, background: A_PAPER, border:`2px solid ${A_INK}26`, borderRadius: 22,
        boxShadow:'8px 8px 0 rgba(0,0,0,0.18)', padding:'18px 22px',
        display:'grid', gridTemplateColumns:'0.85fr 1.15fr', gap: 18, alignItems:'center',
      }}>
        <div style={{
          background:'#EAF6FD', border:`2px dashed ${A_TITLE}55`, borderRadius: 16,
          aspectRatio: '1/1', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 78,
        }}>🐟</div>
        <div>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 13, color: A_SUN,
            letterSpacing: 1.5, textTransform:'uppercase' }}>rare · 30 min</div>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 36, color: A_TITLE,
            margin:'2px 0 8px', lineHeight: 1 }}>Lantern Snapper</div>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 16, color: A_INK,
            opacity: 0.78, lineHeight: 1.3 }}>"Surfaced at noon, mistaking the buoy for a moon. Released after a long look."</div>
          <div style={{ display:'flex', gap: 8, marginTop: 12 }}>
            <button style={{
              flex: 1, padding:'9px 0', background: A_TITLE, color:'#fff', border:'none',
              borderRadius: 12, fontFamily:"'Patrick Hand', cursive", fontSize: 17,
              boxShadow:'3px 3px 0 rgba(0,0,0,0.15)', cursor:'pointer',
            }}>Keep</button>
            <button style={{
              flex: 1, padding:'9px 0', background:'#EAF6FD', color: A_TITLE,
              border:`2px solid #BBDDF1`, borderRadius: 12, fontFamily:"'Patrick Hand', cursive", fontSize: 17, cursor:'pointer',
            }}>Release</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AMenu, AMenuNight, AMenuRainy, AFocus, AReward });
