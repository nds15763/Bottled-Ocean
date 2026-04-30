// Picture-book Kit — 共用零件，模拟油画棒/色粉绘本质感
// 所有画面都从这里取件，保证画风一致

// ---------- 调色板（严格对照绘本图采色） ----------
const PB = {
  skyDay:    '#4FA3D8',   // 晴日天蓝（饱和但带粉感）
  skyDayHi:  '#7FBEE2',   // 天空高光带
  skyDusk:   '#E94B2B',   // 暮色朱红
  skyDuskHi: '#F08054',
  oceanDay:  '#2E5DA5',   // 白天海蓝
  oceanDeep: '#1B3F7A',
  oceanDusk: '#7B3D8E',   // 暮色海紫
  oceanNight:'#142C5E',   // 夜海
  skyNight:  '#0E1F4D',   // 夜空
  cloud:     '#FAF6E8',   // 云不是纯白，是奶白
  cloudShade:'#D9D2BC',
  shipBody:  '#FAF6E8',   // 船身奶白
  shipRed:   '#D7392C',   // 船底朱红
  shipFlag:  '#D7392C',
  shipStack: '#000000',   // 烟囱顶
  shipStackBody: '#D7392C',
  shipWindow:'#5A8FBF',
  ink:       '#1A2440',   // 文字深蓝墨
  sun:       '#E94B2B',   // 朱红太阳
  sunBig:    '#F2B233',   // 大太阳（早晨）
  moon:      '#F0D060',
  star:      '#F0D060',
  rainbow:   ['#D7392C','#E27430','#E8A92F','#3F7E3A','#2A5DA8','#3A2C7A'],
  paper:     '#F1ECDB',   // 纸色
};

// ---------- SVG defs：纹理 / 抖动 / 滤镜 ----------
function PBDefs() {
  return (
    <svg width="0" height="0" style={{ position:'absolute' }} aria-hidden>
      <defs>
        {/* 油画棒颗粒：用湍流当遮罩，叠在每个色块上 */}
        <filter id="pb-grain" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="2" seed="3" stitchTiles="stitch"/>
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"/>
          <feComposite in2="SourceGraphic" operator="in"/>
          <feBlend in="SourceGraphic" mode="multiply"/>
        </filter>
        {/* 边缘抖动：让色块轮廓不齐 */}
        <filter id="pb-edge" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7"/>
          <feDisplacementMap in="SourceGraphic" scale="3"/>
        </filter>
        {/* 厚边抖动（用在大色块边界） */}
        <filter id="pb-edge-strong" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="11"/>
          <feDisplacementMap in="SourceGraphic" scale="6"/>
        </filter>
        {/* 蜡笔笔触：低频湍流 + 色彩偏移，叠在云朵上 */}
        <filter id="pb-chalk" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" seed="5"/>
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.35 0"/>
          <feComposite in2="SourceGraphic" operator="in"/>
          <feBlend in="SourceGraphic" mode="screen"/>
        </filter>
        {/* 海水短笔触图案：横向小色块 */}
        <pattern id="pb-water-day" x="0" y="0" width="36" height="14" patternUnits="userSpaceOnUse">
          <rect width="36" height="14" fill={PB.oceanDay}/>
          <rect x="2"  y="3"  width="10" height="2.2" fill="#7AA8D8" opacity="0.9"/>
          <rect x="18" y="9"  width="8"  height="2"   fill="#A6BFE0" opacity="0.7"/>
          <rect x="26" y="2"  width="6"  height="2"   fill="#5C84BB" opacity="0.6"/>
        </pattern>
        <pattern id="pb-water-dusk" x="0" y="0" width="36" height="14" patternUnits="userSpaceOnUse">
          <rect width="36" height="14" fill={PB.oceanDusk}/>
          <rect x="2"  y="3"  width="10" height="2.2" fill="#A86BB8" opacity="0.9"/>
          <rect x="18" y="9"  width="8"  height="2"   fill="#C695D2" opacity="0.7"/>
          <rect x="26" y="2"  width="6"  height="2"   fill="#5E2B70" opacity="0.6"/>
        </pattern>
        <pattern id="pb-water-night" x="0" y="0" width="36" height="14" patternUnits="userSpaceOnUse">
          <rect width="36" height="14" fill={PB.oceanNight}/>
          <rect x="2"  y="3"  width="10" height="2.2" fill="#3D5C9A" opacity="0.85"/>
          <rect x="18" y="9"  width="8"  height="2"   fill="#5E7BB2" opacity="0.7"/>
          <rect x="26" y="2"  width="6"  height="2"   fill="#0A1B3F" opacity="0.7"/>
        </pattern>
      </defs>
    </svg>
  );
}

// ---------- 颗粒覆盖层（贴在场景最上面） ----------
function PBGrain({ opacity = 0.18 }) {
  return (
    <div style={{
      position:'absolute', inset:0, pointerEvents:'none',
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      mixBlendMode: 'multiply',
      opacity,
    }}/>
  );
}
// 亮粉感（用在云、太阳上叠一层"白粉")
function PBChalk({ opacity = 0.4 }) {
  return (
    <div style={{
      position:'absolute', inset:0, pointerEvents:'none',
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='2.4' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      mixBlendMode: 'screen',
      opacity,
    }}/>
  );
}

// ---------- 云：奶白椭圆叠出来的不规则团 ----------
function PBCloud({ x, y, s = 1, opacity = 1, dim = false }) {
  const fill = dim ? '#C8C0A8' : PB.cloud;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity} filter="url(#pb-edge)">
      <ellipse cx="22" cy="32" rx="22" ry="14" fill={fill}/>
      <ellipse cx="46" cy="22" rx="26" ry="17" fill={fill}/>
      <ellipse cx="72" cy="30" rx="22" ry="14" fill={fill}/>
      <ellipse cx="56" cy="38" rx="30" ry="11" fill={fill}/>
      {/* 云内的暗面 */}
      <ellipse cx="40" cy="40" rx="22" ry="6" fill={PB.cloudShade} opacity="0.45"/>
    </g>
  );
}

// ---------- 小船：严格还原绘本里的小船 ----------
// 比例：船底红梯形，船身奶白矩形，烟囱（红身黑顶），红旗，两个蓝圆窗，锚
function PBBoat({ x, y, scale = 1, withSmoke = true, smokeColor, sleeping = false, withBubbles = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* 烟囱 烟 */}
      {withSmoke && (
        <g opacity="0.95" filter="url(#pb-edge)">
          <ellipse cx="38" cy="-2"  rx="9" ry="5" fill={smokeColor || PB.cloud}/>
          <ellipse cx="44" cy="-12" rx="7" ry="4" fill={smokeColor || PB.cloud} opacity="0.85"/>
          <ellipse cx="52" cy="-20" rx="5" ry="3" fill={smokeColor || PB.cloud} opacity="0.7"/>
        </g>
      )}
      {/* 睡觉 zzz */}
      {sleeping && (
        <g fill={PB.cloud} opacity="0.85" style={{ fontFamily:"'Patrick Hand', cursive", fontSize: 14 }}>
          <text x="36" y="-2">z</text>
          <text x="44" y="-10">z</text>
          <text x="52" y="-18">z</text>
        </g>
      )}
      {/* 旗杆 + 旗 */}
      <line x1="14" y1="20" x2="14" y2="2" stroke={PB.ink} strokeWidth="1.6"/>
      <path d="M14 4 L26 7 L14 11 Z" fill={PB.shipFlag} filter="url(#pb-edge)"/>
      {/* 烟囱 */}
      <rect x="34" y="6" width="10" height="20" fill={PB.shipStackBody} filter="url(#pb-edge)"/>
      <rect x="33" y="3" width="12" height="6"  fill={PB.shipStack}/>
      {/* 船身（奶白矩形 + 抖动边） */}
      <path d="M4 22 L62 22 L62 38 L4 38 Z" fill={PB.shipBody} filter="url(#pb-edge)"/>
      {/* 船底（朱红梯形） */}
      <path d="M2 38 L64 38 L56 50 L10 50 Z" fill={PB.shipRed} filter="url(#pb-edge)"/>
      {/* 圆窗 */}
      <circle cx="20" cy="30" r="3.4" fill={PB.shipWindow}/>
      <circle cx="30" cy="30" r="3.4" fill={PB.shipWindow}/>
      <circle cx="50" cy="30" r="3.4" fill={PB.shipWindow}/>
      {/* 锚符号（船身上） */}
      <g stroke={PB.ink} strokeWidth="1.3" fill="none" strokeLinecap="round">
        <line x1="40" y1="42" x2="40" y2="48"/>
        <path d="M36 47 q4 3 8 0"/>
        <line x1="37" y1="43" x2="43" y2="43"/>
      </g>
      {/* 船头水花 */}
      <path d="M-4 46 q4 -2 8 0 t 8 0" stroke={PB.cloud} strokeWidth="2" fill="none" opacity="0.9"/>
      {/* 气泡（瓶中信） */}
      {withBubbles && (
        <g fill={PB.cloud} filter="url(#pb-edge)">
          <circle cx="-12" cy="14" r="3.5" opacity="0.85"/>
          <circle cx="-22" cy="6" r="3"   opacity="0.75"/>
          <circle cx="-30" cy="-2" r="2.5" opacity="0.65"/>
        </g>
      )}
    </g>
  );
}

// ---------- 太阳 / 月亮 ----------
function PBSunCoral({ cx, cy, r = 28 }) {
  return (
    <g filter="url(#pb-edge)">
      <circle cx={cx} cy={cy} r={r} fill={PB.sun}/>
      {/* 短刺刺光芒（对照第一张图） */}
      {Array.from({length:12}).map((_,i)=>{
        const a = (i/12)*Math.PI*2;
        const x1 = cx + Math.cos(a)*(r+4);
        const y1 = cy + Math.sin(a)*(r+4);
        const x2 = cx + Math.cos(a)*(r+13);
        const y2 = cy + Math.sin(a)*(r+13);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={PB.sun} strokeWidth="4" strokeLinecap="round"/>;
      })}
    </g>
  );
}
function PBSunBig({ cx, cy, r = 56 }) {
  return (
    <g filter="url(#pb-edge)">
      <circle cx={cx} cy={cy} r={r+4} fill={PB.sunBig} opacity="0.35"/>
      <circle cx={cx} cy={cy} r={r}   fill={PB.sunBig}/>
    </g>
  );
}
function PBMoonCrescent({ cx, cy, r = 22 }) {
  return (
    <g filter="url(#pb-edge)">
      <circle cx={cx} cy={cy} r={r} fill={PB.moon}/>
      <circle cx={cx + r*0.45} cy={cy - r*0.25} r={r*0.92} fill={PB.skyNight}/>
    </g>
  );
}
function PBStars({ count = 50, w = 874, h = 240, seed = 1 }) {
  const stars = [];
  let s = seed;
  const rnd = () => { s = (s*9301+49297)%233280; return s/233280; };
  for (let i = 0; i < count; i++) {
    const x = rnd()*w, y = rnd()*h;
    const big = rnd() > 0.85;
    stars.push(
      <g key={i} fill={PB.star} opacity={big ? 0.95 : 0.75} filter="url(#pb-edge)">
        {big ? (
          <path d={`M${x} ${y-4} L${x+1.2} ${y-1.2} L${x+4} ${y} L${x+1.2} ${y+1.2} L${x} ${y+4} L${x-1.2} ${y+1.2} L${x-4} ${y} L${x-1.2} ${y-1.2} Z`}/>
        ) : (
          <circle cx={x} cy={y} r={big ? 1.8 : 1}/>
        )}
      </g>
    );
  }
  return <g>{stars}</g>;
}

// ---------- 海面（带短横笔触） ----------
function PBSea({ variant = 'day', y = 240, h = 162, w = 874 }) {
  const fill = variant === 'day' ? 'url(#pb-water-day)'
             : variant === 'dusk' ? 'url(#pb-water-dusk)'
             : 'url(#pb-water-night)';
  return (
    <g filter="url(#pb-edge-strong)">
      <rect x="-4" y={y} width={w+8} height={h} fill={fill}/>
    </g>
  );
}

// ---------- 大浪（暴风雨那页用） ----------
function PBBigWave({ x, y, w = 360, h = 180 }) {
  return (
    <g transform={`translate(${x} ${y})`} filter="url(#pb-edge-strong)">
      <path d={`M0 ${h} Q ${w*0.1} ${h*0.2}, ${w*0.55} ${h*0.35} Q ${w*0.85} ${h*0.4}, ${w*0.7} ${h*0.05} Q ${w*0.5} ${h*0.55}, ${w*0.2} ${h*0.7} Q ${w*0.05} ${h*0.85}, 0 ${h}`}
        fill={PB.oceanDeep}/>
      <path d={`M0 ${h} Q ${w*0.1} ${h*0.35}, ${w*0.55} ${h*0.5} Q ${w*0.85} ${h*0.55}, ${w*0.7} ${h*0.2} Q ${w*0.5} ${h*0.7}, ${w*0.2} ${h*0.85} L 0 ${h}`}
        fill={PB.oceanDusk} opacity="0.6"/>
    </g>
  );
}

// ---------- 远处的小岛（鲸鱼/尖顶/猪头） ----------
function PBIslandWhale({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#pb-edge)">
      <ellipse cx="50" cy="36" rx="50" ry="14" fill="#3F7E3A"/>
      <path d="M0 36 Q 50 -8, 100 36 Z" fill="#3F7E3A"/>
      {/* 椰子树 */}
      <line x1="68" y1="20" x2="68" y2="34" stroke="#5A4422" strokeWidth="2"/>
      <path d="M60 20 Q 68 12, 76 20 Q 70 14, 68 8 Q 66 14, 60 20" fill="#3F7E3A"/>
    </g>
  );
}
function PBIslandPeak({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#pb-edge)">
      <path d="M0 50 L 30 0 L 60 50 Z" fill="#3F7E3A"/>
    </g>
  );
}

// ---------- 鲸鱼 / 鱼 / 贝壳（收获用）----------
function PBFish({ x, y, s = 1, color = '#E94B2B' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#pb-edge)">
      <ellipse cx="0" cy="0" rx="24" ry="12" fill={color}/>
      <path d="M22 0 L 38 -10 L 38 10 Z" fill={color}/>
      <circle cx="-10" cy="-2" r="1.6" fill={PB.ink}/>
      {/* 条纹 */}
      <path d="M2 -8 q 0 8 0 16" stroke={PB.cloud} strokeWidth="1.5" fill="none" opacity="0.6"/>
    </g>
  );
}
function PBShell({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#pb-edge)">
      <path d="M0 20 Q -22 -8, 0 -16 Q 22 -8, 0 20 Z" fill="#F0B5A0"/>
      <path d="M-1 18 L -1 -14" stroke="#C97A65" strokeWidth="1.3"/>
      <path d="M-8 12 Q 0 -2, 8 12" stroke="#C97A65" strokeWidth="1" fill="none"/>
    </g>
  );
}
function PBBottle({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#pb-edge)">
      <rect x="-18" y="-4" width="36" height="22" rx="4" fill="#A6CEDC" opacity="0.8"/>
      <rect x="-6" y="-12" width="12" height="10" fill="#A6CEDC" opacity="0.9"/>
      <rect x="-5" y="-15" width="10" height="4" fill="#5A4422"/>
      {/* 卷起的纸条 */}
      <rect x="-10" y="2" width="20" height="10" fill="#F1ECDB"/>
      <line x1="-7" y1="6" x2="7" y2="6" stroke={PB.ink} strokeWidth="0.7"/>
      <line x1="-7" y1="9" x2="4" y2="9" stroke={PB.ink} strokeWidth="0.7"/>
    </g>
  );
}

Object.assign(window, {
  PB, PBDefs, PBGrain, PBChalk,
  PBCloud, PBBoat,
  PBSunCoral, PBSunBig, PBMoonCrescent, PBStars,
  PBSea, PBBigWave,
  PBIslandWhale, PBIslandPeak,
  PBFish, PBShell, PBBottle,
});
