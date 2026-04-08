import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–40    Camera zooms in (scale 1→1.35) while customer nodes spring in staggered
  f40–80   Connection lines draw outward from center node
  f80–96   "10 clientes activos" text fades in
  f90–118  $2,850 MXN count-up 0→2850
  f118–120 Hold

  LAYOUT
    Fixed header:  X-Team badge (not zoomed)
    Zoom layer:    Tú node (center) → 2 rows of 5 customers below
*/

const BLUE = '#004AFE';

// Node sizes
const TU_R    = 76;
const CUST_R  = 40;

// Positions (inside zoom container)
const CENTER_X      = 540;
const TU_Y          = 540;
const CUSTOMER_XS   = [228, 384, 540, 696, 852];
const CUSTOMER_Y1   = 880;
const CUSTOMER_Y2   = 1100;

const ALL_CUSTOMERS = [
  ...CUSTOMER_XS.map((x) => ({x, y: CUSTOMER_Y1})),
  ...CUSTOMER_XS.map((x) => ({x, y: CUSTOMER_Y2})),
];

// Stagger: 10 nodes over f0–27 (every 3 frames)
const CUST_DELAYS = ALL_CUSTOMERS.map((_, i) => i * 3);

// ── Count-up ──
const CountUp = ({target, startFrame, endFrame, frame}) => {
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <>{Math.round(progress * target).toLocaleString('en-US')}</>;
};

// ── Animated connection line ──
const ConnectionLine = ({x1, y1, x2, y2, startFrame, frame}) => {
  const progress = interpolate(frame, [startFrame, startFrame + 22], [0, 1], {
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
        height: 2,
        backgroundColor: BLUE,
        opacity: 0.22,
        borderRadius: 1,
        transformOrigin: 'left center',
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
};

// ── Product icon badge ──
const ProductIcon = ({x, y, delay, frame}) => {
  const opacity = interpolate(frame, [delay + 5, delay + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: x + CUST_R + 10,
        top: y - 14,
        opacity,
        backgroundColor: `${BLUE}12`,
        border: `1.5px solid ${BLUE}28`,
        borderRadius: 7,
        padding: '3px 7px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={BLUE}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    </div>
  );
};

// ── Customer node ──
const CustomerNode = ({x, y, delay, frame, fps}) => {
  const sp = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {damping: 11, stiffness: 155, mass: 0.5},
  });
  const scale   = frame >= delay ? interpolate(sp, [0, 1], [0, 1]) : 0;
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(-50%, -50%) scale(${scale})`,
          opacity,
          width: CUST_R * 2,
          height: CUST_R * 2,
          borderRadius: CUST_R,
          backgroundColor: '#fff',
          border: `2.5px solid ${BLUE}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 16px ${BLUE}1a`,
        }}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke={BLUE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <ProductIcon x={x} y={y} delay={delay + 4} frame={frame} />
    </>
  );
};

export const Scene30XTeamClients = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Camera zoom in: scale 1→1.35 over f0–40, hold ──
  const zoomScale = interpolate(frame, [0, 40], [1, 1.35], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Header badge (fixed, not zoomed) ──
  const headerOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── "10 clientes activos" ──
  const textOpacity = interpolate(frame, [80, 96], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textSp = spring({
    frame: Math.max(0, frame - 80),
    fps,
    config: {damping: 12, stiffness: 120, mass: 0.6},
  });
  const textY = frame >= 80 ? interpolate(textSp, [0, 1], [24, 0]) : 24;

  // ── Earnings ──
  const earnOpacity = interpolate(frame, [90, 104], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const earnSp = spring({
    frame: Math.max(0, frame - 90),
    fps,
    config: {damping: 12, stiffness: 120, mass: 0.6},
  });
  const earnScale = frame >= 90 ? interpolate(earnSp, [0, 1], [0.72, 1]) : 0.72;

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>

      {/* ── Fixed header — X-Team badge (not zoomed) ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 130,
          transform: 'translateX(-50%)',
          opacity: headerOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 20,
            backgroundColor: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 28px ${BLUE}44`,
          }}
        >
          {/* Trophy icon */}
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8 21 12 21 16 21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
            <path d="M7 4H17V13C17 15.76 14.76 18 12 18C9.24 18 7 15.76 7 13V4Z"/>
            <path d="M7 6H3C3 6 3 12 7 13"/>
            <path d="M17 6H21C21 6 21 12 17 13"/>
          </svg>
        </div>
        <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 56, color: BLUE, letterSpacing: -1}}>
          X-Team
        </span>
      </div>

      {/* ── Zoom layer — network visualization ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${zoomScale})`,
          transformOrigin: `${CENTER_X}px 900px`,
          opacity: sceneOpacity,
        }}
      >
        {/* Connection lines: center → each customer */}
        {ALL_CUSTOMERS.map((c, i) => (
          <ConnectionLine
            key={`cl-${i}`}
            x1={CENTER_X}
            y1={TU_Y + TU_R}
            x2={c.x}
            y2={c.y - CUST_R}
            startFrame={40 + i * 4}
            frame={frame}
          />
        ))}

        {/* Central "Tú" node */}
        <div
          style={{
            position: 'absolute',
            left: CENTER_X,
            top: TU_Y,
            transform: 'translate(-50%, -50%)',
            width: TU_R * 2,
            height: TU_R * 2,
            borderRadius: TU_R,
            backgroundColor: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 10px 40px ${BLUE}50`,
          }}
        >
          <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 40, color: '#fff', letterSpacing: -0.5}}>
            Tú
          </span>
        </div>

        {/* 10 customer nodes */}
        {ALL_CUSTOMERS.map((c, i) => (
          <CustomerNode
            key={i}
            x={c.x}
            y={c.y}
            delay={CUST_DELAYS[i]}
            frame={frame}
            fps={fps}
          />
        ))}

        {/* "10 clientes activos" */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: CUSTOMER_Y2 + CUST_R + 56,
            transform: `translateX(-50%) translateY(${textY}px)`,
            opacity: textOpacity,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 46, color: colors.dark, letterSpacing: -0.5}}>
            10 clientes activos
          </span>
        </div>

        {/* Earnings badge */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: CUSTOMER_Y2 + CUST_R + 152,
            transform: `translateX(-50%) scale(${earnScale})`,
            opacity: earnOpacity,
          }}
        >
          <div
            style={{
              backgroundColor: `${BLUE}0f`,
              border: `2px solid ${BLUE}30`,
              borderRadius: 24,
              padding: '20px 52px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 26, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase'}}>
              Bono X-Team
            </span>
            <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 68, color: BLUE, letterSpacing: -1.5, lineHeight: 1}}>
              $<CountUp target={2850} startFrame={95} endFrame={116} frame={frame} /> MXN
            </span>
          </div>
        </div>
      </div>

    </AbsoluteFill>
  );
};
