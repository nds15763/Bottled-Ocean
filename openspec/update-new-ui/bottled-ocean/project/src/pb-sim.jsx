// PBSimCanvas — 绘本风实时模拟（pb-sim v2）
// 输入：hour 0-24, wind 0-50, weather: SUNNY/RAINY/STORM/SNOW, fishing bool
// + 可选：shipX (船的水平位置), shipScale, showShip, showFishing
// 雨/暴风/雪 全部画对：雨密度&倾角随风、暴风强浪+闪电+雨幕、雪片大小随机&微风飘

const PBPAL = {
  cloud:'#FAF6E8', cloudShade:'#D9D2BC',
  shipBody:'#FAF6E8', shipRed:'#D7392C', shipStack:'#0E0E12', shipWindow:'#5A8FBF',
  ink:'#1A2440', sun:'#E94B2B', sunBig:'#F2B233', moon:'#F0D060', star:'#F0D060',
  oceanDay1:'#5BA8D9', oceanDay2:'#2E5DA5', oceanDay3:'#1B3F7A',
  oceanNight1:'#2D5089', oceanNight2:'#16315E', oceanNight3:'#0A1F45',
  oceanDusk1:'#A861B8', oceanDusk2:'#7B3D8E', oceanDusk3:'#4F2566',
  oceanStorm1:'#5A6E80', oceanStorm2:'#3A4D60', oceanStorm3:'#1F3040',
  oceanRain1:'#6E8AA8', oceanRain2:'#4A6585', oceanRain3:'#2F4666',
  oceanSnow1:'#A8C5DC', oceanSnow2:'#7BA0BD', oceanSnow3:'#52789A',
  skyDayHi:'#7FBEE2', skyDay:'#4FA3D8',
  skyDuskHi:'#F08054', skyDusk:'#E94B2B',
  skyDawnHi:'#F4B98E', skyDawn:'#C8639A',
  skyNightHi:'#142C5E', skyNight:'#0A1738',
  skyStormHi:'#5C6878', skyStorm:'#2A3340',
  skyRainHi:'#9AA8B6', skyRain:'#5C6E80',
  skySnowHi:'#DEE6EE', skySnowDay:'#A6B5C4',
  skySnowNightHi:'#3A485A', skySnowNight:'#1B2735',
};

function pblerp(a,b,t){ return a+(b-a)*t; }
function pblerpHex(a,b,t){
  const pa=parseInt(a.slice(1),16), pb=parseInt(b.slice(1),16);
  const r=Math.round(pblerp((pa>>16)&255,(pb>>16)&255,t));
  const g=Math.round(pblerp((pa>>8)&255,(pb>>8)&255,t));
  const bl=Math.round(pblerp(pa&255,pb&255,t));
  return '#'+((1<<24)+(r<<16)+(g<<8)+bl).toString(16).slice(1);
}

function PBSimCanvas({
  hour=12, wind=4, weather='SUNNY', fishing=false,
  shipX=null, shipScale=1, showShip=true, showFishing=true,
  width=874, height=402,
}) {
  const canvasRef = React.useRef(null);
  const stateRef = React.useRef(null);

  // init once
  if(!stateRef.current){
    stateRef.current = {
      t:0, wavePhase:0, lightning:0, rainbowFade:0,
      ship:{ x: shipX==null ? width*0.5 : shipX, y:height*0.6, angle:0 },
      clouds: Array.from({length:6}, (_,i)=>({ x: i*180+Math.random()*100, yPct: 0.04+Math.random()*0.30, scale: 0.7+Math.random()*0.5, type: i%3 })),
      stars: Array.from({length:80}, ()=>({ x:Math.random(), y:Math.random()*0.55, size:1+Math.random()*2.2, op:0.4+Math.random()*0.6 })),
      // 雨：竖向粒子，y 增长
      rain: Array.from({length:240}, ()=>({ x:Math.random()*width, y:Math.random()*height, sp:14+Math.random()*16, len: 10+Math.random()*8 })),
      snow: Array.from({length:90}, ()=>({ x:Math.random()*width, y:Math.random()*height, sp:0.4+Math.random()*1.6, sz:1.2+Math.random()*2.2, ph:Math.random()*Math.PI*2 })),
      splashes: [], // 雨打在水面上的小圈
      fish: { phase:'IDLE', startT:0, lastCycle:0, target:120, bx:50, by:-30 },
    };
  }

  React.useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = width, H = height;
    let raf;

    // 颗粒贴图
    const grain = document.createElement('canvas');
    grain.width=160; grain.height=160;
    {
      const g = grain.getContext('2d');
      const img = g.createImageData(160,160);
      for(let i=0;i<img.data.length;i+=4){
        const v = (Math.random()*255)|0;
        img.data[i]=img.data[i+1]=img.data[i+2]=v;
        img.data[i+3] = (Math.random()*55)|0;
      }
      g.putImageData(img,0,0);
    }
    const grainPat = ctx.createPattern(grain,'repeat');

    function tick(){
      const s = stateRef.current;
      s.t += 0.016;
      const t = s.t;
      const isStorm = weather==='STORM';
      const isRainy = weather==='RAINY';
      const isSnow  = weather==='SNOW';
      // 暴风波幅大、风强
      const effWind = isStorm ? Math.max(wind, 28) : wind;
      const waveAmp = isStorm ? Math.max(20, effWind*1.0) : Math.max(0.5, wind*0.8);
      const waveSpeed = 0.05 + (effWind/50)*1.15 + (isStorm?0.4:0);
      s.wavePhase += waveSpeed*0.05;
      // 闪电（暴风）
      if(isStorm && Math.random()<0.006) s.lightning = 9;
      if(s.lightning>0) s.lightning--;

      // ===== 时段 =====
      const isDeepNight = hour<5 || hour>=20;
      const isDawn = hour>=5 && hour<7;
      const isDay  = hour>=7 && hour<17;
      const isDusk = hour>=17 && hour<20;

      // ===== 天空配色 =====
      let sky1, sky2;
      if(isStorm){
        if(isDeepNight){ sky1=pblerpHex(PBPAL.skyStormHi,'#1A1F28',0.6); sky2=pblerpHex(PBPAL.skyStorm,'#0A0E14',0.6); }
        else { sky1=PBPAL.skyStormHi; sky2=PBPAL.skyStorm; }
      } else if(isRainy){
        if(isDeepNight){ sky1=pblerpHex(PBPAL.skyRainHi,'#202A36',0.5); sky2=pblerpHex(PBPAL.skyRain,'#0F1620',0.5); }
        else { sky1=PBPAL.skyRainHi; sky2=PBPAL.skyRain; }
      } else if(isSnow){
        if(isDeepNight){ sky1=PBPAL.skySnowNightHi; sky2=PBPAL.skySnowNight; }
        else { sky1=PBPAL.skySnowHi; sky2=PBPAL.skySnowDay; }
      } else if(isDeepNight){ sky1=PBPAL.skyNightHi; sky2=PBPAL.skyNight; }
      else if(isDawn){ const k=(hour-5)/2; sky1=pblerpHex(PBPAL.skyDawnHi,PBPAL.skyDayHi,k); sky2=pblerpHex(PBPAL.skyDawn,PBPAL.skyDay,k); }
      else if(isDay){ sky1=PBPAL.skyDayHi; sky2=PBPAL.skyDay; }
      else if(isDusk){ const k=(hour-17)/3; sky1=pblerpHex(PBPAL.skyDuskHi,PBPAL.skyNightHi,k); sky2=pblerpHex(PBPAL.skyDusk,PBPAL.skyNight,k); }
      if(s.lightning>5){ sky1='#FFFFFF'; sky2='#C8D0DA'; }

      const grad = ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,sky1); grad.addColorStop(1,sky2);
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

      // ===== 星 =====
      if(isDeepNight && !isStorm && !isRainy){
        ctx.fillStyle = PBPAL.star;
        s.stars.forEach((st,i)=>{
          const sx=st.x*W, sy=st.y*H*0.7;
          const tw = 0.7+Math.sin(t*2+i)*0.3;
          ctx.globalAlpha = (isSnow ? st.op*0.5 : st.op)*tw;
          ctx.beginPath();
          ctx.moveTo(sx, sy-st.size);
          ctx.lineTo(sx+st.size*0.4, sy-st.size*0.4);
          ctx.lineTo(sx+st.size, sy);
          ctx.lineTo(sx+st.size*0.4, sy+st.size*0.4);
          ctx.lineTo(sx, sy+st.size);
          ctx.lineTo(sx-st.size*0.4, sy+st.size*0.4);
          ctx.lineTo(sx-st.size, sy);
          ctx.lineTo(sx-st.size*0.4, sy-st.size*0.4);
          ctx.closePath(); ctx.fill();
        });
        ctx.globalAlpha=1;
      }

      // ===== 太阳/月亮 =====
      function drawSunCoral(cx,cy,r){
        ctx.fillStyle=PBPAL.sun;
        for(let i=0;i<12;i++){
          const a=(i/12)*Math.PI*2;
          ctx.save(); ctx.translate(cx,cy); ctx.rotate(a);
          ctx.fillRect(r+2,-2.5,11,5);
          ctx.restore();
        }
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      }
      function drawSunBig(cx,cy,r){
        ctx.fillStyle=PBPAL.sunBig; ctx.globalAlpha=0.35;
        ctx.beginPath(); ctx.arc(cx,cy,r+8,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      }
      function drawCrescent(cx,cy,r){
        ctx.fillStyle=PBPAL.moon;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=sky2;
        ctx.beginPath(); ctx.arc(cx+r*0.45,cy-r*0.25,r*0.92,0,Math.PI*2); ctx.fill();
      }
      // 雨/暴风时不画太阳；雪天可以朦胧太阳
      const showSun = !isStorm && !isRainy && hour>=5 && hour<=19;
      const showMoon = isDeepNight && !isStorm && !isRainy;
      if(showSun){
        const p = (hour-5)/14;
        const cx = W*p;
        const cy = H - Math.sin(p*Math.PI)*(H*0.55) - H*0.12;
        if(isSnow){ ctx.globalAlpha=0.55; drawSunBig(cx,cy,28); ctx.globalAlpha=1; }
        else if(isDusk || isDawn) drawSunBig(cx,cy,38);
        else drawSunCoral(cx,cy,22);
      }
      if(showMoon){
        const p = hour>=18 ? (hour-18)/12 : (hour+6)/12;
        const cx = W*p;
        const cy = H - Math.sin(p*Math.PI)*(H*0.55) - H*0.15;
        if(isSnow){ ctx.globalAlpha=0.7; drawCrescent(cx,cy,22); ctx.globalAlpha=1; }
        else drawCrescent(cx,cy,22);
      }

      // ===== 彩虹（雨刚停的偶发） =====
      const wantRainbow = !isStorm && !isRainy && weather==='SUNNY' && hour>=8 && hour<=17 && Math.sin(t*0.05)>0.92;
      s.rainbowFade = pblerp(s.rainbowFade, wantRainbow?1:0, 0.04);
      if(s.rainbowFade>0.02){
        ctx.save();
        const cx=W*0.5, cy=H*1.0, r=W*0.55;
        const cs=['#D7392C','#E27430','#E8A92F','#3F7E3A','#2A5DA8','#3A2C7A'];
        ctx.lineWidth=8; ctx.globalAlpha=0.65*s.rainbowFade;
        cs.forEach((c,i)=>{ ctx.strokeStyle=c; ctx.beginPath(); ctx.arc(cx,cy,r-i*9,Math.PI,0); ctx.stroke(); });
        ctx.restore();
      }

      // ===== 云 =====
      let cloudFill;
      if(isStorm) cloudFill = isDeepNight ? '#3A4250' : '#6E7A88';
      else if(isRainy) cloudFill = isDeepNight ? '#4A5460' : '#8E97A2';
      else if(isSnow) cloudFill = isDeepNight ? '#5A6878' : '#E2E7EC';
      else cloudFill = PBPAL.cloud;
      const windFactor = effWind/12;
      s.clouds.forEach(c=>{
        c.x -= 0.15 + windFactor*0.7;
        if(c.x<-220) c.x = W+200;
        const cx=c.x, cy=c.yPct*H;
        ctx.save(); ctx.translate(cx,cy); ctx.scale(c.scale,c.scale);
        ctx.fillStyle=cloudFill;
        if(c.type===0){
          ctx.beginPath();
          ctx.ellipse(0,8,22,12,0,0,Math.PI*2);
          ctx.ellipse(24,-2,26,16,0,0,Math.PI*2);
          ctx.ellipse(50,6,22,12,0,0,Math.PI*2);
          ctx.ellipse(28,12,32,9,0,0,Math.PI*2);
          ctx.fill();
        } else if(c.type===1){
          ctx.beginPath();
          ctx.ellipse(-5,4,18,10,0,0,Math.PI*2);
          ctx.ellipse(20,-6,24,14,0,0,Math.PI*2);
          ctx.ellipse(48,2,20,11,0,0,Math.PI*2);
          ctx.ellipse(20,8,28,7,0,0,Math.PI*2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(0,0,30,18,0,0,Math.PI*2);
          ctx.ellipse(36,-12,28,16,0,0,Math.PI*2);
          ctx.ellipse(60,2,26,14,0,0,Math.PI*2);
          ctx.ellipse(30,12,40,10,0,0,Math.PI*2);
          ctx.fill();
        }
        ctx.fillStyle=isStorm?'#1F2530':PBPAL.cloudShade; ctx.globalAlpha=isStorm?0.45:0.35;
        ctx.beginPath(); ctx.ellipse(20,12,30,5,0,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        ctx.restore();
      });

      // ===== 闪电 =====
      if(s.lightning>4){
        ctx.save();
        ctx.strokeStyle='#FFE89A'; ctx.lineWidth=2.4; ctx.shadowBlur=18; ctx.shadowColor='#FFE89A';
        ctx.beginPath();
        let lx=Math.random()*W, ly=0;
        ctx.moveTo(lx,ly);
        while(ly<H*0.6){ lx+=(Math.random()-0.5)*40; ly+=Math.random()*40; ctx.lineTo(lx,ly); }
        ctx.stroke();
        // 分支
        ctx.lineWidth=1.2; ctx.beginPath();
        let bx=lx, by=ly;
        ctx.moveTo(bx,by);
        for(let k=0;k<5;k++){ bx+=(Math.random()-0.5)*30; by+=Math.random()*15; ctx.lineTo(bx,by); }
        ctx.stroke();
        ctx.restore();
      }

      // ===== 海面：三层波 =====
      const oceanY = H*0.62;
      let l1,l2,l3;
      if(isStorm){ l1=PBPAL.oceanStorm1; l2=PBPAL.oceanStorm2; l3=PBPAL.oceanStorm3; }
      else if(isRainy){ l1=PBPAL.oceanRain1; l2=PBPAL.oceanRain2; l3=PBPAL.oceanRain3; }
      else if(isSnow){ l1=PBPAL.oceanSnow1; l2=PBPAL.oceanSnow2; l3=PBPAL.oceanSnow3; }
      else if(isDeepNight){ l1=PBPAL.oceanNight1; l2=PBPAL.oceanNight2; l3=PBPAL.oceanNight3; }
      else if(isDusk){ l1=PBPAL.oceanDusk1; l2=PBPAL.oceanDusk2; l3=PBPAL.oceanDusk3; }
      else { l1=PBPAL.oceanDay1; l2=PBPAL.oceanDay2; l3=PBPAL.oceanDay3; }

      const layers=[
        { c:l1, off:0,  ampMult:1.0, sp:0.8 },
        { c:l2, off:22, ampMult:1.2, sp:1.0 },
        { c:l3, off:48, ampMult:1.0, sp:1.25 },
      ];
      layers.forEach((L,i)=>{
        ctx.fillStyle=L.c;
        ctx.beginPath();
        const baseY = oceanY + L.off;
        const phase = s.wavePhase*L.sp + i;
        const freq = 0.0028;
        ctx.moveTo(-10, H);
        ctx.lineTo(-10, baseY);
        for(let x=-10; x<=W+10; x+=8){
          let y = baseY + Math.sin(x*freq + phase)*waveAmp*L.ampMult;
          if(isStorm) y += Math.sin(x*0.018 + phase*1.6)*waveAmp*0.4;
          ctx.lineTo(x,y);
        }
        ctx.lineTo(W+10, H); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1.2;
        ctx.beginPath();
        for(let x=-10; x<=W+10; x+=8){
          let y = baseY + Math.sin(x*freq + phase)*waveAmp*L.ampMult;
          if(isStorm) y += Math.sin(x*0.018 + phase*1.6)*waveAmp*0.4;
          if(x===-10) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.stroke();

        // 横向短笔触（和云一个方向：右→左）
        // 漂移速度跟随风：风越大笔触跑得越快；最低速也保持轻微漂动
        const streakDrift = (0.6 + (effWind/50)*7) * L.sp;
        const streakOffset = s.t * streakDrift * 60; // s.t 单调增 ⇒ 减号让笔触整体向左
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        for(let k=0;k<14;k++){
          // 用模运算把 (k*73 - offset) 包到 [-20, W+20]
          let sx = ((k*73 - streakOffset) % (W+40) + (W+40)) % (W+40) - 20;
          const sy = baseY + 14 + L.off*0.3 + (k%3)*8 + Math.sin(sx*freq+phase)*waveAmp*L.ampMult;
          ctx.fillRect(sx, sy, 10, 1.6);
        }
        ctx.fillStyle = 'rgba(20,30,60,0.18)';
        for(let k=0;k<14;k++){
          let sx = ((k*97 - streakOffset*1.1) % (W+40) + (W+40)) % (W+40) - 20;
          const sy = baseY + 22 + L.off*0.3 + (k%3)*7 + Math.sin(sx*freq+phase)*waveAmp*L.ampMult;
          ctx.fillRect(sx, sy, 8, 1.4);
        }

        if(i===1 && showShip){
          const ship = s.ship;
          if(shipX!=null) ship.x = shipX;
          const wp = ship.x*freq + s.wavePhase*L.sp + 1;
          ship.y = baseY + Math.sin(wp)*waveAmp*L.ampMult - 18;
          const slope = waveAmp*L.ampMult*freq*Math.cos(wp);
          ship.angle += (Math.atan(slope)-ship.angle)*0.1;
          drawShip(ctx, ship, t, isDeepNight, shipScale);
          if(showFishing) drawFishing(ctx, ship, s.fish, t, shipScale);
        }
      });

      // ===== 雨 =====
      if(isRainy || isStorm){
        const tilt = (isStorm? effWind : wind) * 0.45;
        const dropSpeed = isStorm ? 1.6 : 1.0;
        ctx.strokeStyle = isStorm ? 'rgba(220,232,244,0.85)' : 'rgba(220,232,244,0.65)';
        ctx.lineWidth = isStorm ? 1.6 : 1.2;
        ctx.beginPath();
        s.rain.forEach(r=>{
          r.y += r.sp * dropSpeed; r.x -= tilt*0.3;
          if(r.y > H) {
            // 入水溅起小圈
            if(r.y > oceanY+10 && Math.random()<0.18){
              s.splashes.push({ x:r.x, y:oceanY+10+Math.random()*40, life:0 });
            }
            r.y = -10; r.x = Math.random()*W;
          }
          if(r.x<-10) r.x = W+10;
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x - tilt*0.5, r.y + r.len);
        });
        ctx.stroke();
        // splashes
        ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1;
        for(let i=s.splashes.length-1;i>=0;i--){
          const sp=s.splashes[i]; sp.life+=0.06;
          ctx.globalAlpha = Math.max(0, 1-sp.life);
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.life*4, 0, Math.PI); ctx.stroke();
          if(sp.life>1) s.splashes.splice(i,1);
        }
        ctx.globalAlpha=1;
        // 暴风：雨幕
        if(isStorm){
          ctx.fillStyle='rgba(28,36,48,0.18)';
          ctx.fillRect(0,0,W,H);
        }
      }

      // ===== 雪 =====
      if(isSnow){
        ctx.fillStyle = isDeepNight ? 'rgba(240,244,250,0.85)' : 'rgba(255,255,255,0.92)';
        s.snow.forEach((sn,i)=>{
          sn.y += sn.sp;
          sn.x += Math.sin(t*0.7 + sn.ph)*0.6 - wind*0.04;
          if(sn.y > H){ sn.y=-5; sn.x=Math.random()*W; }
          if(sn.x<-5) sn.x=W+5; if(sn.x>W+5) sn.x=-5;
          ctx.beginPath(); ctx.arc(sn.x, sn.y, sn.sz, 0, Math.PI*2); ctx.fill();
        });
        // 海面薄雪带（在最上层水面叠一条白条）
        ctx.fillStyle='rgba(255,255,255,0.12)';
        ctx.fillRect(0, oceanY-2, W, 4);
      }

      // ===== 颗粒覆盖 =====
      if(grainPat){
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = grainPat;
        ctx.fillRect(0,0,W,H);
        ctx.restore();
      }

      // ===== 钓鱼状态机 =====
      if(fishing && showFishing){
        const f = s.fish;
        if(f.phase==='IDLE'){
          f.phase='CASTING'; f.startT=t; f.lastCycle=t; f.target=80+Math.random()*200;
        }
        if(f.phase==='FISHING' && (t-f.lastCycle)>4.5){
          f.phase='REELING'; f.startT=t;
        }
        if(f.phase==='CASTING'){
          const p = Math.min(1,(t-f.startT)/0.7);
          f.bx = 50 + (f.target)*p;
          const yBase = -30 + (15-(-30))*p;
          f.by = yBase - Math.sin(p*Math.PI)*60;
          if(p>=1){ f.phase='FISHING'; }
        } else if(f.phase==='FISHING'){
          f.bx = 50 + f.target;
          f.by = 15 + Math.sin(t*4)*2.5;
        } else if(f.phase==='REELING'){
          const p = Math.min(1,(t-f.startT)/1.0);
          f.bx = (50+f.target) + (50-(50+f.target))*p;
          f.by = 15 + (-30-15)*Math.pow(p,8);
          if(p>=1){ f.phase='CASTING'; f.startT=t; f.lastCycle=t; f.target=80+Math.random()*200; }
        }
      } else {
        s.fish.phase='IDLE'; s.fish.bx=50; s.fish.by=-30;
      }

      raf = requestAnimationFrame(tick);
    }

    function drawShip(ctx, ship, t, dark, sc){
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.scale(sc, sc);
      // 烟（puff，左飘）
      const fx = -2, fy = -42;
      ctx.fillStyle = 'rgba(250,246,232,0.9)';
      const isStormNow = weather==='STORM';
      const w2 = isStormNow ? Math.max(wind, 28) : wind;
      for(let i=0;i<4;i++){
        const cycle=2.4;
        const pt=(t*1.4+i*(cycle/4))%cycle;
        const drift = -(w2*2.2)*pt;
        const rise  = -16*pt;
        const a = Math.max(0, 1-pt/1.5);
        const ssz = 1+pt*1.2;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(fx+drift, fy+rise, 4.5*ssz, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;

      ctx.fillStyle = PBPAL.shipBody;
      ctx.beginPath();
      ctx.moveTo(-44,-12); ctx.lineTo(44,-12);
      ctx.quadraticCurveTo(54,-12,46,8);
      ctx.lineTo(36,16); ctx.lineTo(-36,16);
      ctx.quadraticCurveTo(-46,8,-44,-12);
      ctx.fill();
      ctx.fillStyle = PBPAL.shipRed;
      ctx.beginPath();
      ctx.moveTo(-36,16); ctx.lineTo(36,16); ctx.lineTo(42,8); ctx.lineTo(-42,8);
      ctx.fill();
      ctx.fillStyle = PBPAL.shipBody;
      ctx.fillRect(-32,-30, 50, 18);
      ctx.fillStyle = PBPAL.shipWindow;
      [-22,-10,2].forEach(wx=>{ ctx.beginPath(); ctx.arc(wx,-21,3.6,0,Math.PI*2); ctx.fill(); });
      ctx.fillStyle = PBPAL.shipRed;
      ctx.fillRect(-7,-44, 12, 14);
      ctx.fillStyle = PBPAL.shipStack;
      ctx.fillRect(-8,-48, 14, 5);
      ctx.strokeStyle = PBPAL.ink; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(-32,-30); ctx.lineTo(-32,-46); ctx.stroke();
      ctx.fillStyle = PBPAL.shipRed;
      ctx.beginPath(); ctx.moveTo(-32,-46); ctx.lineTo(-46,-40); ctx.lineTo(-32,-34); ctx.fill();
      ctx.strokeStyle=PBPAL.ink; ctx.lineWidth=1.2; ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(28,-3); ctx.lineTo(28,5);
      ctx.moveTo(24,3); ctx.quadraticCurveTo(28,8,32,3);
      ctx.moveTo(25,-1); ctx.lineTo(31,-1);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(28,-6,1.4,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    function drawFishing(ctx, ship, f, t, sc){
      if(f.phase==='IDLE') return;
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.scale(sc, sc);
      ctx.strokeStyle = PBPAL.ink; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(28,-12); ctx.lineTo(50,-30); ctx.stroke();
      ctx.strokeStyle='rgba(250,246,232,0.95)'; ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(50,-30);
      if(f.phase==='FISHING'){
        ctx.quadraticCurveTo(50+(f.bx-50)/2, f.by+18, f.bx, f.by);
      } else {
        ctx.lineTo(f.bx, f.by);
      }
      ctx.stroke();
      ctx.fillStyle = PBPAL.shipRed;
      ctx.beginPath(); ctx.arc(f.bx, f.by, 3.2, 0, Math.PI*2); ctx.fill();
      if(f.phase==='REELING' && f.by < -10){
        ctx.save();
        ctx.translate(f.bx, f.by+6);
        ctx.fillStyle = PBPAL.shipRed;
        ctx.beginPath(); ctx.ellipse(0,0,10,5,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(14,-4); ctx.lineTo(14,4); ctx.closePath(); ctx.fill();
        ctx.fillStyle=PBPAL.ink;
        ctx.beginPath(); ctx.arc(-4,-1,0.9,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    raf = requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  }, [hour, wind, weather, fishing, shipX, shipScale, showShip, showFishing, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display:'block', width:'100%', height:'100%' }}/>;
}

Object.assign(window, { PBSimCanvas, PBPAL });
