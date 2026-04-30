// PBLive — 把 SimulationCanvas 的实时模拟塞进 LandscapePhone，画风对齐绘本

function PBLiveSim() {
  const defaults = /*EDITMODE-BEGIN*/{
    "hour": 12,
    "wind": 4,
    "weather": "SUNNY",
    "fishing": false
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = useTweaks(defaults);

  const hourLabel = (h) => {
    const hh = Math.floor(h);
    const mm = Math.round((h-hh)*60);
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  };

  const isNight = tweaks.hour < 6 || tweaks.hour >= 19;
  const textColor = isNight ? PB.cloud : PB.ink;
  const accent = isNight ? PB.moon : PB.shipRed;

  const wxLabel = ({SUNNY:'晴', RAINY:'雨', STORM:'暴风', SNOW:'雪'})[tweaks.weather];

  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <PBSimCanvas hour={tweaks.hour} wind={tweaks.wind} weather={tweaks.weather} fishing={tweaks.fishing}/>

      <div style={{ position:'absolute', left: 56, top: 50, color: textColor,
        fontFamily:"'Noto Serif SC', 'Source Han Serif SC', serif", fontSize: 14, lineHeight: 1.7,
        textShadow: isNight ? '0 1px 2px rgba(0,0,0,0.4)' : 'none', pointerEvents:'none' }}>
        <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 2, marginBottom: 4 }}>第 27 日 · 实时模拟</div>
        {tweaks.fishing
          ? <>小船把鱼线<br/>抛进了海里。<br/><span style={{ fontStyle:'italic', opacity:0.75 }}>"会等到什么呢？"</span></>
          : <>小船在海上慢慢地开。<br/><span style={{ fontStyle:'italic', opacity:0.75 }}>"今天的风刚刚好。"</span></>
        }
      </div>

      <div style={{ position:'absolute', right: 40, top: 22, textAlign:'right', color: textColor,
        fontFamily:"'Noto Serif SC', serif", textShadow: isNight ? '0 1px 2px rgba(0,0,0,0.4)' : 'none' }}>
        <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2 }}>{hourLabel(tweaks.hour)} · {wxLabel} · 风 {tweaks.wind}</div>
        <div style={{ fontSize: 30, fontWeight: 600, lineHeight: 1, marginTop: 4 }}>
          12<span style={{ fontSize: 14, opacity: 0.6 }}>分</span>34<span style={{ fontSize: 14, opacity: 0.6 }}>秒</span>
        </div>
        <div style={{ width: 140, height: 2, background: isNight ? '#FAF6E822' : '#1A244022', marginTop: 6, marginLeft:'auto' }}>
          <div style={{ width:'38%', height:'100%', background: accent }}/>
        </div>
      </div>

      <div style={{ position:'absolute', left: 56, bottom: 26, color: textColor, opacity: 0.55,
        fontFamily:"'Noto Serif SC', serif", fontSize: 11, letterSpacing: 2,
        textShadow: isNight ? '0 1px 2px rgba(0,0,0,0.4)' : 'none', pointerEvents:'none' }}>
        — 拨动 Tweaks 让小船在不同的时间和天气里走 —
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="时间" />
        <TweakSlider label="时刻" value={tweaks.hour} min={0} max={24} step={0.5} unit="h"
          onChange={v=>setTweak('hour', v)}/>
        <TweakSection label="海况" />
        <TweakSlider label="风速" value={tweaks.wind} min={0} max={50} step={1} unit=" km/h"
          onChange={v=>setTweak('wind', v)}/>
        <TweakRadio label="天气" value={tweaks.weather}
          options={[
            {value:'SUNNY', label:'晴'},
            {value:'RAINY', label:'雨'},
            {value:'STORM', label:'暴风'},
            {value:'SNOW',  label:'雪'},
          ]}
          onChange={v=>setTweak('weather', v)}/>
        <TweakSection label="动作" />
        <TweakToggle label="放下鱼竿" value={tweaks.fishing} onChange={v=>setTweak('fishing', v)}/>
      </TweaksPanel>
    </div>
  );
}

Object.assign(window, { PBLiveSim });
