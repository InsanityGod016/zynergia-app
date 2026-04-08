import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–10    Badge "Fast Start Nivel 1" zooms in
  f10–40   2 partner nodes appear one by one
  f40–80   connection lines draw from center to partners
  f80–110  "2 partners activos" label fades in
  f100–120 "$7,600 MXN" badge appears + counts up
  → extend to 150 frames for hold

  LAYOUT: triangle — Tú on top, 2 Partners below
*/

const PURPLE = '#9333ea';
const CENTER_X = 540;
const TOP_Y = 640;          // "Tú" node Y
const PARTNER_Y = 1020;     // partner nodes Y
const PARTNER_XS = [300, 780]; // left & right partners
const NODE_R = 84;
const PARTNER_R = 72;

// ── Count-up ──
const CountUp = ({target, startFrame, endFrame, frame}) => {
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <>{Math.round(progress * target).toLocaleString('es-MX')}</>;
};

// ── Animated connection line ──
const ConnectionLine = ({x1, y1, x2, y2, startFrame, frame}) => {
  const progress = interpolate(frame, [startFrame, startFrame + 28], [0, 1], {
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
        backgroundColor: PURPLE,
        opacity: 0.3,
        borderRadius: 2,
        transformOrigin: 'left center',
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
};

// ── Partner node ──
const PartnerNode = ({x, y, delay, frame, fps}) => {
  const sp = spring({frame: Math.max(0, frame - delay), fps, config: {damping: 11, stiffness: 150, mass: 0.5}});
  const scale = frame >= delay ? interpolate(sp, [0, 1], [0, 1]) : 0;
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        width: PARTNER_R * 2,
        height: PARTNER_R * 2,
        borderRadius: PARTNER_R,
        backgroundColor: '#fff',
        border: `3px solid ${PURPLE}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 4px 20px ${PURPLE}22`,
      }}
    >
      {/* Person icon */}
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  );
};

export const Scene26FastStart1 = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Badge ──
  const badgeSp = spring({frame, fps, config: {damping: 12, stiffness: 130, mass: 0.6}});
  const badgeScale = interpolate(badgeSp, [0, 1], [0.5, 1]);
  const badgeOpacity = interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // ── Center "Tú" node zoom ──
  const centerZoom = interpolate(frame, [0, 40], [1, 1.2], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // ── Label ──
  const labelOpacity = interpolate(frame, [80, 100], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const labelY = interpolate(frame, [80, 100], [20, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // ── Earnings ──
  const earnOpacity = interpolate(frame, [100, 114], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const earnSp = spring({frame: Math.max(0, frame - 100), fps, config: {damping: 12, stiffness: 120, mass: 0.6}});
  const earnScale = interpolate(earnSp, [0, 1], [0.7, 1]);

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>

      {/* ── Badge ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 160,
          transform: `translate(-50%, 0) scale(${badgeScale})`,
          opacity: badgeOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: PURPLE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 28px ${PURPLE}44`,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 52, color: PURPLE, letterSpacing: -1}}>
          Fast Start Nivel 1
        </div>
      </div>

      {/* ── Connection lines ── */}
      {PARTNER_XS.map((px, i) => (
        <ConnectionLine
          key={i}
          x1={CENTER_X}
          y1={TOP_Y + NODE_R}
          x2={px}
          y2={PARTNER_Y - PARTNER_R}
          startFrame={40 + i * 8}
          frame={frame}
        />
      ))}

      {/* ── Center "Tú" node ── */}
      <div
        style={{
          position: 'absolute',
          left: CENTER_X,
          top: TOP_Y,
          transform: `translate(-50%, -50%) scale(${centerZoom})`,
        }}
      >
        <div
          style={{
            width: NODE_R * 2,
            height: NODE_R * 2,
            borderRadius: NODE_R,
            backgroundColor: PURPLE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 32px ${PURPLE}55`,
          }}
        >
          <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 42, color: '#fff', letterSpacing: -0.5}}>
            Tú
          </span>
        </div>
      </div>

      {/* ── Partner nodes ── */}
      {PARTNER_XS.map((px, i) => (
        <PartnerNode key={i} x={px} y={PARTNER_Y} delay={10 + i * 14} frame={frame} fps={fps} />
      ))}

      {/* ── "Partner" label under each node ── */}
      {PARTNER_XS.map((px, i) => {
        const lOpacity = interpolate(frame, [24 + i * 14, 38 + i * 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <div
            key={`lbl-${i}`}
            style={{
              position: 'absolute',
              left: px,
              top: PARTNER_Y + PARTNER_R + 16,
              transform: 'translateX(-50%)',
              opacity: lOpacity,
              fontFamily: font.family,
              fontWeight: font.semi,
              fontSize: 30,
              color: PURPLE,
              whiteSpace: 'nowrap',
            }}
          >
            Partner {i + 1}
          </div>
        );
      })}

      {/* ── "2 partners activos" ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: PARTNER_Y + PARTNER_R + 100,
          transform: `translate(-50%, ${labelY}px)`,
          opacity: labelOpacity,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 46, color: colors.dark, letterSpacing: -0.5}}>
          2 partners activos
        </span>
      </div>

      {/* ── Earnings badge ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: PARTNER_Y + PARTNER_R + 200,
          transform: `translate(-50%, 0) scale(${earnScale})`,
          opacity: earnOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: `${PURPLE}12`,
            border: `2px solid ${PURPLE}33`,
            borderRadius: 24,
            padding: '20px 48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 26, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase'}}>
            Bono Nivel 1
          </span>
          <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 64, color: PURPLE, letterSpacing: -1.5, lineHeight: 1}}>
            $<CountUp target={7600} startFrame={105} endFrame={130} frame={frame} /> MXN
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
