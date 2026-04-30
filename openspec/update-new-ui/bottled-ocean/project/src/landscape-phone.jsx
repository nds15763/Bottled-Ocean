// LandscapePhone — native landscape iPhone shell (no rotation tricks).
// 874×402 outer, content fills the inner stage directly.

function LandscapePhone({ children, dark = false }) {
  const W = 874, H = 402;
  return (
    <div style={{
      width: W, height: H, borderRadius: 48, overflow: 'hidden',
      position: 'relative', background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
    }}>
      {/* Dynamic island — landscape iPhone has it on the LEFT edge, vertically centered */}
      <div style={{
        position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
        width: 37, height: 126, borderRadius: 24, background: '#000', zIndex: 50,
      }}/>
      {/* Home indicator — RIGHT edge, vertically centered */}
      <div style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        width: 5, height: 139, borderRadius: 100,
        background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)',
        zIndex: 60,
      }}/>
      {/* Content stage */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

const STAGE_W = 874;
const STAGE_H = 402;

Object.assign(window, { LandscapePhone, STAGE_W, STAGE_H });
