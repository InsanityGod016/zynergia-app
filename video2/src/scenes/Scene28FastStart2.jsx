import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 180 frames = 6s)
  f0–10    Badge "Fast Start Nivel 2" zooms in
  f10–50   6 customer nodes appear (3 under each partner, staggered)
  f50–90   connection lines draw downward
  f90–120  "Duplicación del equipo" label fades in
  f110–130 $22,800 MXN badge appears
  f120–150 Count-up 0 → 22,800
  f150–180 Hold — badge fully visible

  LAYOUT: 3-tier pyramid
    ○        ← Tú (top, amber)
   / \
  ○   ○      ← Partners (purple, already established)
 /|\ /|\
○○○ ○○○    ← 3 customers per partner (amber outline)
*/

const AMBER = '#d97706';
const PURPLE = '#9333ea';

// Node positions
const CENTER_X = 540;
const TU_Y = 440;
const PARTNER_Y = 740;
const CUSTOMER_Y = 1100;

const PARTNER_XS = [240, 840];

// 4 customers per partner
const CUSTOMER_XS_LEFT  = [60,  155, 250, 345];
const CUSTOMER_XS_RIGHT = [735, 830, 925, 1020];
const ALL_CUSTOMER_XS   = [...CUSTOMER_XS_LEFT, ...CUSTOMER_XS_RIGHT];

const TU_R       = 72;
const PARTNER_R  = 58;
const CUST_R     = 32;  // smaller nodes for 4-per-partner

// ── Count-up ──
const CountUp = ({target, startFrame, endFrame, frame}) => {
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <>{Math.round(progress * target).toLocaleString('es-MX')}</>;
};

// ── Animated connection line ──
const ConnectionLine = ({x1, y1, x2, y2, startFrame, color, frame}) => {
  const progress = interpolate(frame, [startFrame, startFrame + 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (progress <= 0) return null;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <div
      style={{
        position: 'absolute',
        left: x1,
        top: y1,
        width: length * progress,
        height: 3,
        backgroundColor: color,
        opacity: 0.28,
        borderRadius: 2,
        transformOrigin: 'left center',
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
};

// ── Product icon badge ──
const ProductIcon = ({x, y, delay, frame}) => {
  const opacity = interpolate(frame, [delay + 6, delay + 16], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: x + CUST_R + 8,
        top: y - 16,
        opacity,
        backgroundColor: `${AMBER}14`,
        border: `1.5px solid ${AMBER}33`,
        borderRadius: 8,
        padding: '4px 8px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    </div>
  );
};

// ── Customer node ──
const CustomerNode = ({x, y, delay, frame, fps}) => {
  const sp = spring({frame: Math.max(0, frame - delay), fps, config: {damping: 11, stiffness: 150, mass: 0.5}});
  const scale = frame >= delay ? interpolate(sp, [0, 1], [0, 1]) : 0;
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x, top: y,
          transform: `translate(-50%, -50%) scale(${scale})`,
          opacity,
          width: CUST_R * 2, height: CUST_R * 2,
          borderRadius: CUST_R,
          backgroundColor: '#fff',
          border: `2.5px solid ${AMBER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 14px ${AMBER}22`,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <ProductIcon x={x} y={y} delay={delay + 4} frame={frame} />
    </>
  );
};

// ── Partner node (static — established from Scene26) ──
const PartnerNode = ({x, y}) => (
  <div
    style={{
      position: 'absolute',
      left: x, top: y,
      transform: 'translate(-50%, -50%)',
      width: PARTNER_R * 2, height: PARTNER_R * 2,
      borderRadius: PARTNER_R,
      backgroundColor: '#fff',
      border: `3px solid ${PURPLE}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 4px 20px ${PURPLE}22`,
    }}
  >
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  </div>
);

export const Scene28FastStart2 = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Badge ──
  const badgeSp = spring({frame, fps, config: {damping: 12, stiffness: 130, mass: 0.6}});
  const badgeScale = interpolate(badgeSp, [0, 1], [0.5, 1]);
  const badgeOpacity = interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Customer stagger delays: first 4 left, then 4 right
  const custDelays = [10, 16, 22, 28, 18, 24, 30, 36];

  // ── Label ──
  const labelOpacity = interpolate(frame, [90, 110], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const labelY = interpolate(frame, [90, 110], [20, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // ── Earnings ──
  const earnOpacity = interpolate(frame, [110, 124], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const earnSp = spring({frame: Math.max(0, frame - 110), fps, config: {damping: 12, stiffness: 120, mass: 0.6}});
  const earnScale = interpolate(earnSp, [0, 1], [0.7, 1]);

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>

      {/* ── Badge ── */}
      <div
        style={{
          position: 'absolute', left: '50%', top: 120,
          transform: `translate(-50%, 0) scale(${badgeScale})`,
          opacity: badgeOpacity,
          display: 'flex', alignItems: 'center', gap: 20,
        }}
      >
        <div
          style={{
            width: 80, height: 80, borderRadius: 20,
            backgroundColor: AMBER,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 28px ${AMBER}44`,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8 21 12 21 16 21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
            <path d="M7 4H17V13C17 15.76 14.76 18 12 18C9.24 18 7 15.76 7 13V4Z"/>
            <path d="M7 6H3C3 6 3 12 7 13"/>
            <path d="M17 6H21C21 6 21 12 17 13"/>
          </svg>
        </div>
        <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 48, color: AMBER, letterSpacing: -1}}>
          Fast Start Nivel 2
        </div>
      </div>

      {/* ── Lines: Tú → Partners ── */}
      {PARTNER_XS.map((px, i) => (
        <ConnectionLine
          key={`tp-${i}`}
          x1={CENTER_X} y1={TU_Y + TU_R}
          x2={px} y2={PARTNER_Y - PARTNER_R}
          startFrame={50} color={PURPLE} frame={frame}
        />
      ))}

      {/* ── Lines: Partners → Customers ── */}
      {CUSTOMER_XS_LEFT.map((cx, i) => (
        <ConnectionLine
          key={`lc-${i}`}
          x1={PARTNER_XS[0]} y1={PARTNER_Y + PARTNER_R}
          x2={cx} y2={CUSTOMER_Y - CUST_R}
          startFrame={50 + i * 5} color={AMBER} frame={frame}
        />
      ))}
      {CUSTOMER_XS_RIGHT.map((cx, i) => (
        <ConnectionLine
          key={`rc-${i}`}
          x1={PARTNER_XS[1]} y1={PARTNER_Y + PARTNER_R}
          x2={cx} y2={CUSTOMER_Y - CUST_R}
          startFrame={55 + i * 5} color={AMBER} frame={frame}
        />
      ))}

      {/* ── Center "Tú" ── */}
      <div
        style={{
          position: 'absolute', left: CENTER_X, top: TU_Y,
          transform: 'translate(-50%, -50%)',
          width: TU_R * 2, height: TU_R * 2,
          borderRadius: TU_R,
          backgroundColor: AMBER,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 32px ${AMBER}55`,
        }}
      >
        <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 42, color: '#fff', letterSpacing: -0.5}}>
          Tú
        </span>
      </div>

      {/* ── Partners ── */}
      {PARTNER_XS.map((px, i) => (
        <PartnerNode key={i} x={px} y={PARTNER_Y} />
      ))}

      {/* ── Customer nodes ── */}
      {ALL_CUSTOMER_XS.map((cx, i) => (
        <CustomerNode key={i} x={cx} y={CUSTOMER_Y} delay={custDelays[i]} frame={frame} fps={fps} />
      ))}

      {/* ── "Duplicación del equipo" + subtitle ── */}
      <div
        style={{
          position: 'absolute', left: '50%',
          top: CUSTOMER_Y + CUST_R + 60,
          transform: `translate(-50%, ${labelY}px)`,
          opacity: labelOpacity,
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}
      >
        <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 44, color: colors.dark, letterSpacing: -0.5, whiteSpace: 'nowrap'}}>
          Duplicación del equipo
        </span>
        <span style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 32, color: colors.muted, letterSpacing: -0.2, whiteSpace: 'nowrap'}}>
          Tus 2 partners consiguen el bono Q-Team — 4 clientes activos
        </span>
      </div>

      {/* ── Earnings badge ── */}
      <div
        style={{
          position: 'absolute', left: '50%',
          top: CUSTOMER_Y + CUST_R + 260,
          transform: `translate(-50%, 0) scale(${earnScale})`,
          opacity: earnOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: `${AMBER}12`,
            border: `2px solid ${AMBER}33`,
            borderRadius: 24,
            padding: '20px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 26, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase'}}>
            Bono Nivel 2
          </span>
          <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 64, color: AMBER, letterSpacing: -1.5, lineHeight: 1}}>
            $<CountUp target={22800} startFrame={120} endFrame={148} frame={frame} /> MXN
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
