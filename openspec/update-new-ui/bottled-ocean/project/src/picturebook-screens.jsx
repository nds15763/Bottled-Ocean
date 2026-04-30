// Picturebook screens — 全部以 PBSimCanvas 当活背景
// 文字/HUD 用 SongTi（绘本旁白），不再有静态 SVG 海面与小船

function PBHUD({ x, y, color, size=14, italic=false, opacity=1, align='left', children }) {
  return (
    <div style={{
      position:'absolute', left: typeof x==='number'?x:undefined, top:y,
      right: typeof x==='string' && x==='right' ? 40 : undefined,
      color, fontFamily:"'Noto Serif SC','Source Han Serif SC',serif",
      fontSize:size, lineHeight:1.7, fontStyle: italic?'italic':'normal',
      textAlign: align, whiteSpace:'pre-line', pointerEvents:'none', opacity,
      letterSpacing:0.4,
      textShadow: color==='#FAF6E8' ? '0 1px 2px rgba(0,0,0,0.45)' : 'none',
    }}>{children}</div>
  );
}

// 通用：用 PBSimCanvas 当背景的容器
function PBStage({ hour=12, wind=4, weather='SUNNY', fishing=false,
                   shipX=null, shipScale=1, showShip=true, showFishing=true, children }) {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <PBSimCanvas hour={hour} wind={wind} weather={weather} fishing={fishing}
        shipX={shipX} shipScale={shipScale} showShip={showShip} showFishing={showFishing}
        width={874} height={402}/>
      {children}
    </div>
  );
}

// ====== 1. 封面 · 选时长 (晴日早晨) ======
function PBMenuHarbor() {
  const ink = '#1A2440', red = '#D7392C';
  return (
    <PBStage hour={8.5} wind={2} weather="SUNNY" shipX={300} shipScale={1.4}>
      <PBHUD x={56} y={48} color={ink} size={20}>
        小船的一日{'\n'}
        <span style={{fontSize:13, opacity:0.65}}>把手机放进瓶子里</span>
      </PBHUD>
      <div style={{ position:'absolute', right:60, top:108, display:'flex', flexDirection:'column', gap:14,
        fontFamily:"'Noto Serif SC',serif", color:ink }}>
        {[
          { m:25, hint:'一段海风' },
          { m:45, hint:'越过几座小岛' },
          { m:90, hint:'抵达远方港口' },
        ].map((it,i)=>(
          <div key={it.m} style={{ display:'flex', alignItems:'baseline', gap:12,
            cursor:'pointer' }}>
            <span style={{ fontSize:42, fontWeight:700, color: i===1?red:ink, lineHeight:1 }}>{it.m}</span>
            <span style={{ fontSize:12, opacity:0.65 }}>分钟</span>
            <span style={{ fontSize:13, opacity:0.6, marginLeft:4 }}>· {it.hint}</span>
          </div>
        ))}
      </div>
      <PBHUD x={56} y={356} color={ink} size={11} opacity={0.55}>
        北京 · 晴 22° · 港口附近无浪
      </PBHUD>
      <PBHUD x={56} y={372} color={ink} size={11} opacity={0.4}>
        — 第 27 日 —
      </PBHUD>
    </PBStage>
  );
}

// ====== 2. 进行中 · 晴日出海 ======
function PBFocusOpenSea() {
  return (
    <PBStage hour={11} wind={6} weather="SUNNY" shipX={170} shipScale={1.0}>
      <PBHUD x={56} y={56} color="#1A2440" size={15}>
        小船精神百倍地出发了。{'\n'}
        目的地是一座大港口城市。{'\n'}
        那是它从没有去过的地方。
      </PBHUD>
      <PBHUD x={560} y={300} color="#1A2440" size={13} opacity={0.85}>
        在辽阔的海面上，{'\n'}
        小船鼓足劲朝前开。{'\n'}
        <span style={{fontStyle:'italic', opacity:0.75}}>"海风吹得真舒服呀！"</span>
      </PBHUD>
      <div style={{ position:'absolute', right:40, top:22, textAlign:'right', color:'#1A2440',
        fontFamily:"'Noto Serif SC',serif" }}>
        <div style={{ fontSize:11, opacity:0.55, letterSpacing:2 }}>已开了</div>
        <div style={{ fontSize:32, fontWeight:600, lineHeight:1 }}>
          12<span style={{fontSize:16,opacity:0.6}}>分</span>34<span style={{fontSize:16,opacity:0.6}}>秒</span>
        </div>
        <div style={{ width:140, height:2, background:'#1A244022', marginTop:6, marginLeft:'auto' }}>
          <div style={{ width:'38%', height:'100%', background:'#D7392C' }}/>
        </div>
      </div>
    </PBStage>
  );
}

// ====== 3. 进行中 · 暮色 ======
function PBFocusDusk() {
  return (
    <PBStage hour={18.3} wind={5} weather="SUNNY" shipX={170} shipScale={1.0}>
      <PBHUD x={56} y={56} color="#1A2440" size={14}>
        快到傍晚了。{'\n'}
        <span style={{fontStyle:'italic', opacity:0.85}}>"大港口城市，还很远吗？"</span>
      </PBHUD>
      <div style={{ position:'absolute', right:40, top:22, textAlign:'right', color:'#1A2440',
        fontFamily:"'Noto Serif SC',serif" }}>
        <div style={{ fontSize:11, opacity:0.55, letterSpacing:2 }}>暮色航行</div>
        <div style={{ fontSize:32, fontWeight:600, lineHeight:1 }}>
          1<span style={{fontSize:16,opacity:0.6}}>时</span>04<span style={{fontSize:16,opacity:0.6}}>分</span>
        </div>
        <div style={{ width:140, height:2, background:'#1A244022', marginTop:6, marginLeft:'auto' }}>
          <div style={{ width:'85%', height:'100%', background:'#D7392C' }}/>
        </div>
      </div>
    </PBStage>
  );
}

// ====== 4. 进行中 · 星夜停泊 ======
function PBFocusStarryNight() {
  return (
    <PBStage hour={22} wind={1} weather="SUNNY" shipX={520} shipScale={0.9}>
      <PBHUD x={300} y={130} color="#FAF6E8" size={15} italic opacity={0.92}>
        "在这儿休息一下吧。"
      </PBHUD>
      <PBHUD x={520} y={328} color="#FAF6E8" size={12} opacity={0.75}>
        哗哗哗……{'\n'}
        听着海浪的声音，{'\n'}
        小船进入了梦乡。
      </PBHUD>
      <div style={{ position:'absolute', right:40, top:22, textAlign:'right', color:'#FAF6E8',
        fontFamily:"'Noto Serif SC',serif", textShadow:'0 1px 2px rgba(0,0,0,0.45)' }}>
        <div style={{ fontSize:11, opacity:0.6, letterSpacing:2 }}>夜航</div>
        <div style={{ fontSize:32, fontWeight:600, lineHeight:1 }}>
          43<span style={{fontSize:16,opacity:0.6}}>分</span>02<span style={{fontSize:16,opacity:0.6}}>秒</span>
        </div>
        <div style={{ width:140, height:2, background:'#FAF6E822', marginTop:6, marginLeft:'auto' }}>
          <div style={{ width:'72%', height:'100%', background:'#F0D060' }}/>
        </div>
      </div>
    </PBStage>
  );
}

// ====== 5. 进行中 · 雨天 ======
function PBFocusRainy() {
  return (
    <PBStage hour={14} wind={14} weather="RAINY" shipX={200} shipScale={1.0}>
      <PBHUD x={56} y={56} color="#1A2440" size={14}>
        下雨了。{'\n'}
        小船的红船底，{'\n'}
        被雨打得"咚咚咚"响。
      </PBHUD>
      <PBHUD x={520} y={310} color="#1A2440" size={12} italic opacity={0.8}>
        "雨天的海，{'\n'}
        是另一种海。"
      </PBHUD>
      <div style={{ position:'absolute', right:40, top:22, textAlign:'right', color:'#1A2440',
        fontFamily:"'Noto Serif SC',serif" }}>
        <div style={{ fontSize:11, opacity:0.55, letterSpacing:2 }}>雨天航行</div>
        <div style={{ fontSize:32, fontWeight:600, lineHeight:1 }}>
          21<span style={{fontSize:16,opacity:0.6}}>分</span>18<span style={{fontSize:16,opacity:0.6}}>秒</span>
        </div>
        <div style={{ width:140, height:2, background:'#1A244022', marginTop:6, marginLeft:'auto' }}>
          <div style={{ width:'58%', height:'100%', background:'#D7392C' }}/>
        </div>
      </div>
    </PBStage>
  );
}

// ====== 6. 进行中 · 暴风雨 ======
function PBFocusStorm() {
  return (
    <PBStage hour={16} wind={36} weather="STORM" shipX={250} shipScale={1.0}>
      <PBHUD x={56} y={56} color="#FAF6E8" size={14}>
        起风了！{'\n'}
        浪一下子高过了船头。
      </PBHUD>
      <PBHUD x={520} y={300} color="#FAF6E8" size={13} italic opacity={0.92}>
        "别怕别怕，{'\n'}
        我会稳稳地开过去。"
      </PBHUD>
      <div style={{ position:'absolute', right:40, top:22, textAlign:'right', color:'#FAF6E8',
        fontFamily:"'Noto Serif SC',serif", textShadow:'0 1px 2px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize:11, opacity:0.7, letterSpacing:2 }}>顶风</div>
        <div style={{ fontSize:32, fontWeight:600, lineHeight:1 }}>
          08<span style={{fontSize:16,opacity:0.7}}>分</span>52<span style={{fontSize:16,opacity:0.7}}>秒</span>
        </div>
        <div style={{ width:140, height:2, background:'#FAF6E833', marginTop:6, marginLeft:'auto' }}>
          <div style={{ width:'22%', height:'100%', background:'#F0D060' }}/>
        </div>
      </div>
    </PBStage>
  );
}

// ====== 7. 进行中 · 雪天 ======
function PBFocusSnow() {
  return (
    <PBStage hour={9} wind={3} weather="SNOW" shipX={180} shipScale={1.0}>
      <PBHUD x={56} y={56} color="#1A2440" size={14}>
        天上下起了雪，{'\n'}
        海面安安静静的。
      </PBHUD>
      <PBHUD x={520} y={310} color="#1A2440" size={12} italic opacity={0.8}>
        "雪落在海里，{'\n'}
        就化成海了。"
      </PBHUD>
      <div style={{ position:'absolute', right:40, top:22, textAlign:'right', color:'#1A2440',
        fontFamily:"'Noto Serif SC',serif" }}>
        <div style={{ fontSize:11, opacity:0.55, letterSpacing:2 }}>雪日航行</div>
        <div style={{ fontSize:32, fontWeight:600, lineHeight:1 }}>
          05<span style={{fontSize:16,opacity:0.6}}>分</span>40<span style={{fontSize:16,opacity:0.6}}>秒</span>
        </div>
        <div style={{ width:140, height:2, background:'#1A244022', marginTop:6, marginLeft:'auto' }}>
          <div style={{ width:'14%', height:'100%', background:'#D7392C' }}/>
        </div>
      </div>
    </PBStage>
  );
}

// ====== 8. 收获 · 钓鱼（活的，钓鱼状态机在跑）======
function PBRewardFish() {
  return (
    <PBStage hour={11} wind={3} weather="SUNNY" fishing={true} shipX={200} shipScale={1.05}>
      <PBHUD x={520} y={56} color="#1A2440" size={11} opacity={0.55}>
        —— 第 27 日 · 海风正好 ——
      </PBHUD>
      <div style={{ position:'absolute', left:520, top:78, width:300, color:'#1A2440',
        fontFamily:"'Noto Serif SC',serif", fontSize:14, lineHeight:1.7 }}>
        在第 <span style={{color:'#D7392C'}}>23 分钟</span>，<br/>
        小船把鱼线抛进海里。<br/><br/>
        一条<span style={{color:'#D7392C'}}>朱砂条纹鱼</span>，<br/>
        从远海游过来，<br/>
        被它钓了上来。
      </div>
      <div style={{ position:'absolute', left:520, top:300, display:'flex', gap:24,
        fontFamily:"'Noto Serif SC',serif", fontSize:13, color:'#1A2440' }}>
        <span style={{ borderBottom:'1.5px solid #1A2440', paddingBottom:2, cursor:'pointer' }}>收进图鉴</span>
        <span style={{ opacity:0.5, cursor:'pointer' }}>放回海里</span>
      </div>
    </PBStage>
  );
}

// ====== 9. 收获 · 拾贝（雨刚停的清晨）======
function PBRewardShell() {
  return (
    <PBStage hour={7.5} wind={1} weather="SUNNY" shipX={150} shipScale={1.05}>
      {/* 在画布上叠一只贝壳 */}
      <svg width="874" height="402" viewBox="0 0 874 402"
        style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        <g transform="translate(330 308)">
          <path d="M0 22 Q -24 -10, 0 -18 Q 24 -10, 0 22 Z" fill="#F0B5A0"/>
          <path d="M-1 20 L -1 -16" stroke="#C97A65" strokeWidth="1.4"/>
          <path d="M-9 12 Q 0 -2, 9 12" stroke="#C97A65" strokeWidth="1" fill="none"/>
          <ellipse cx="0" cy="26" rx="22" ry="3" fill="#FAF6E8" opacity="0.5"/>
        </g>
      </svg>
      <PBHUD x={520} y={56} color="#1A2440" size={11} opacity={0.55}>
        —— 第 27 日 · 浪过之后 ——
      </PBHUD>
      <div style={{ position:'absolute', left:520, top:78, width:300, color:'#1A2440',
        fontFamily:"'Noto Serif SC',serif", fontSize:14, lineHeight:1.7 }}>
        雨停了，浪也歇了。<br/>
        小船低头一看，<br/>
        水面漂着一只<span style={{color:'#D7392C'}}>粉色的贝壳</span>。<br/><br/>
        <span style={{opacity:0.7, fontStyle:'italic'}}>"是被风从哪里送来的呢？"</span>
      </div>
      <div style={{ position:'absolute', left:520, top:300, display:'flex', gap:24,
        fontFamily:"'Noto Serif SC',serif", fontSize:13, color:'#1A2440' }}>
        <span style={{ borderBottom:'1.5px solid #1A2440', paddingBottom:2, cursor:'pointer' }}>收进图鉴</span>
        <span style={{ opacity:0.5, cursor:'pointer' }}>放回海里</span>
      </div>
    </PBStage>
  );
}

// ====== 10. 收获 · 解锁岛 ======
function PBRewardIsland() {
  return (
    <PBStage hour={10} wind={3} weather="SUNNY" shipX={530} shipScale={0.85}>
      {/* 叠几座岛 */}
      <svg width="874" height="402" viewBox="0 0 874 402"
        style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {/* 远小岛 */}
        <g opacity="0.7" transform="translate(40 254) scale(0.45)">
          <ellipse cx="50" cy="36" rx="50" ry="14" fill="#3F7E3A"/>
          <path d="M0 36 Q 50 -8, 100 36 Z" fill="#3F7E3A"/>
        </g>
        <g opacity="0.7" transform="translate(140 248) scale(0.55)">
          <path d="M0 50 L 30 0 L 60 50 Z" fill="#3F7E3A"/>
        </g>
        {/* 新岛：乌龟形 */}
        <g transform="translate(260 250)">
          <ellipse cx="60" cy="44" rx="64" ry="10" fill="#3F7E3A"/>
          <path d="M-4 44 Q 60 -10, 124 44 Z" fill="#3F7E3A"/>
          <ellipse cx="48" cy="34" rx="3" ry="3" fill="#1A2440"/>
          <ellipse cx="72" cy="34" rx="3" ry="3" fill="#1A2440"/>
          <path d="M44 42 Q 60 50, 76 42" stroke="#1A2440" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
        </g>
      </svg>
      <PBHUD x={520} y={56} color="#1A2440" size={11} opacity={0.55}>
        —— 第 27 日 · 又一座岛 ——
      </PBHUD>
      <div style={{ position:'absolute', left:520, top:78, width:300, color:'#1A2440',
        fontFamily:"'Noto Serif SC',serif", fontSize:14, lineHeight:1.7 }}>
        越过了鲸鱼小岛、<br/>
        尖顶小岛、猪头小岛——<br/><br/>
        今天小船遇到了<br/>
        <span style={{color:'#D7392C'}}>一座新的小岛</span>。<br/>
        像一只睡着的乌龟。
      </div>
      <div style={{ position:'absolute', left:520, top:300, display:'flex', gap:24,
        fontFamily:"'Noto Serif SC',serif", fontSize:13, color:'#1A2440' }}>
        <span style={{ borderBottom:'1.5px solid #1A2440', paddingBottom:2, cursor:'pointer' }}>收进图鉴</span>
        <span style={{ opacity:0.5, cursor:'pointer' }}>放回海里</span>
      </div>
    </PBStage>
  );
}

// ====== 11. 长期目标 · 抵港 ======
function PBHarborGoal() {
  return (
    <PBStage hour={9.5} wind={2} weather="SUNNY" shipX={120} shipScale={0.6}>
      {/* 港口城市叠在右半 */}
      <svg width="874" height="402" viewBox="0 0 874 402"
        style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {/* 山 */}
        <path d="M520 230 Q 600 140, 700 230 L 700 252 L 520 252 Z" fill="#3F7E3A"/>
        {/* 楼群 */}
        <g>
          <rect x="540" y="200" width="22" height="52" fill="#FAF6E8"/>
          <rect x="566" y="178" width="18" height="74" fill="#D7392C"/>
          <rect x="588" y="190" width="22" height="62" fill="#F0D060"/>
          <rect x="614" y="166" width="20" height="86" fill="#FAF6E8"/>
          <rect x="638" y="206" width="18" height="46" fill="#5A8FBF"/>
          <rect x="660" y="184" width="22" height="68" fill="#FAF6E8"/>
          <rect x="686" y="200" width="18" height="52" fill="#D7392C"/>
          <rect x="708" y="178" width="22" height="74" fill="#F0D060"/>
          <rect x="734" y="210" width="18" height="42" fill="#FAF6E8"/>
          <rect x="756" y="190" width="20" height="62" fill="#5A8FBF"/>
          <rect x="780" y="206" width="18" height="46" fill="#D7392C"/>
          <rect x="802" y="178" width="22" height="74" fill="#FAF6E8"/>
          <rect x="828" y="200" width="20" height="52" fill="#F0D060"/>
          <rect x="852" y="210" width="18" height="42" fill="#5A8FBF"/>
        </g>
        {/* 楼上的小窗 */}
        <g fill="#1A2440" opacity="0.45">
          {[...Array(40)].map((_,i)=>{
            const xs=[550,572,580,594,602,620,628,665,672,716,724,762,808,816,832,860];
            const ys=[210,220,230,188,198,208,218,228];
            const x = xs[i%xs.length] + (i*7)%14;
            const y = ys[i%ys.length] + (i*5)%18;
            return <rect key={i} x={x} y={y} width="2" height="3"/>;
          })}
        </g>
        {/* 码头 */}
        <rect x="640" y="252" width="220" height="14" fill="#9C9080"/>
        {/* 港口里的小船（用静态 svg，远景就好） */}
        {[
          {x:560,y:262,s:0.45},{x:640,y:268,s:0.55},{x:760,y:262,s:0.5}
        ].map((b,i)=>(
          <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
            <rect x="0" y="0" width="40" height="10" fill="#FAF6E8"/>
            <path d="M-2 10 L 42 10 L 36 18 L 4 18 Z" fill="#D7392C"/>
            <rect x="22" y="-10" width="6" height="10" fill="#D7392C"/>
            <rect x="21" y="-12" width="8" height="3" fill="#000"/>
          </g>
        ))}
      </svg>
      <PBHUD x={56} y={56} color="#1A2440" size={15}>
        小船开了 <span style={{color:'#D7392C', fontSize:22}}>27</span> 天，{'\n'}
        终于看见港口城市了。{'\n'}
        <span style={{opacity:0.7, fontStyle:'italic'}}>"哇！好多船呀！"</span>
      </PBHUD>
      <div style={{ position:'absolute', left:56, bottom:28, color:'#1A2440',
        fontFamily:"'Noto Serif SC',serif", fontSize:11, opacity:0.6, letterSpacing:2 }}>
        累计 <span style={{ fontSize:14, opacity:1 }}>2,140</span> 分钟 ·
        拾贝 <span style={{color:'#D7392C'}}>14</span> ·
        鱼 <span style={{color:'#D7392C'}}>9</span> ·
        岛 <span style={{color:'#D7392C'}}>5</span>
      </div>
    </PBStage>
  );
}

Object.assign(window, {
  PBMenuHarbor,
  PBFocusOpenSea, PBFocusDusk, PBFocusStarryNight,
  PBFocusRainy, PBFocusStorm, PBFocusSnow,
  PBRewardFish, PBRewardShell, PBRewardIsland,
  PBHarborGoal,
});
