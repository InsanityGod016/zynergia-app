import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 165 frames = 5.5s)
  f0–10    Q-Team badge zooms in
  f10–40   4 customer nodes appear one by one (every ~8 frames)
  f40–80   connection lines animate outward from center
  f80–105  label "4 clientes en recompra" fades in
  f100–115 earnings badge appears
  f105–130 "$1,900 MXN" counts up 0 → 1900
  f130–165 Hold — number fully visible for ~1.2s

  LAYOUT: center "Tú" node, 4 customers below in a row
*/

const BLUE = '#004AFE';
const CENTER_X = 540;
const CENTER_Y = 700;

const CUSTOMER_Y = 1100;
const CUSTOMER_XS = [140, 350, 560, 770]; // horizontal positions of 4 nodes
const NODE_R = 68;   // center node radius
const CUST_R = 54;   // customer node radius

// ── Mini product box icon ──
const ProductIcon = ({x, y, delay, frame}) => {
  const opacity = interpolate(frame, [delay + 8, delay + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: x + CUST_R + 10,
        top: y - 18,
        opacity,
        backgroundColor: `${BLUE}14`,
        border: `1.5px solid ${BLUE}33`,
        borderRadius: 10,
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    </div>
  );
};

// ── Customer node ──
const CustomerNode = ({x, y, delay, frame, fps}) => {
  const nodeSpring = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {damping: 11, stiffness: 150, mass: 0.5},
  });
  const scale = frame >= delay ? interpolate(nodeSpring, [0, 1], [0, 1]) : 0;
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
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
          border: `3px solid ${BLUE}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 16px ${BLUE}22`,
        }}
      >
        {/* Person icon */}
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      {/* Product icon beside each customer */}
      <ProductIcon x={x} y={y} delay={delay + 4} frame={frame} />
    </>
  );
};

// ── Animated connection line ──
const ConnectionLine = ({x1, y1, x2, y2, startFrame, frame}) => {
  const progress = interpolate(frame, [startFrame, startFrame + 30], [0, 1], {
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
        backgroundColor: BLUE,
        opacity: 0.25,
        borderRadius: 2,
        transformOrigin: 'left center',
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
};

// ── Count-up number ──
const CountUp = ({target, startFrame, endFrame, frame}) => {
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const value = Math.round(progress * target);
  return <>{value.toLocaleString('es-MX')}</>;
};

export const Scene24QTeamZoom = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Q-Team badge ──
  const badgeSpring = spring({frame, fps, config: {damping: 12, stiffness: 130, mass: 0.6}});
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.5, 1]);
  const badgeOpacity = interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // ── Center node zoom 1→1.3 ──
  const centerZoom = interpolate(frame, [0, 40], [1, 1.25], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Customer delays
  const custDelays = [10, 18, 26, 34];

  // ── Label ──
  const labelOpacity = interpolate(frame, [80, 100], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const labelY = interpolate(frame, [80, 100], [20, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // ── Earnings ──
  const earningsOpacity = interpolate(frame, [100, 112], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const earningsSpring = spring({
    frame: Math.max(0, frame - 100),
    fps,
    config: {damping: 12, stiffness: 120, mass: 0.6},
  });
  const earningsScale = interpolate(earningsSpring, [0, 1], [0.7, 1]);

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>

      {/* ── Q-Team badge at top ── */}
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
            backgroundColor: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 28px ${BLUE}44`,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 60,
            color: BLUE,
            letterSpacing: -1,
          }}
        >
          Q-Team
        </div>
      </div>

      {/* ── Connection lines (draw from center to each customer) ── */}
      {CUSTOMER_XS.map((cx, i) => (
        <ConnectionLine
          key={i}
          x1={CENTER_X}
          y1={CENTER_Y + NODE_R}
          x2={cx}
          y2={CUSTOMER_Y - CUST_R}
          startFrame={40}
          frame={frame}
        />
      ))}

      {/* ── Center "Tú" node ── */}
      <div
        style={{
          position: 'absolute',
          left: CENTER_X,
          top: CENTER_Y,
          transform: `translate(-50%, -50%) scale(${centerZoom})`,
        }}
      >
        <div
          style={{
            width: NODE_R * 2,
            height: NODE_R * 2,
            borderRadius: NODE_R,
            backgroundColor: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 32px ${BLUE}55`,
          }}
        >
          <span
            style={{
              fontFamily: font.family,
              fontWeight: font.bold,
              fontSize: 42,
              color: '#fff',
              letterSpacing: -0.5,
            }}
          >
            Tú
          </span>
        </div>
      </div>

      {/* ── Customer nodes ── */}
      {CUSTOMER_XS.map((cx, i) => (
        <CustomerNode
          key={i}
          x={cx}
          y={CUSTOMER_Y}
          delay={custDelays[i]}
          frame={frame}
          fps={fps}
        />
      ))}

      {/* ── Label "4 clientes en recompra" ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: CUSTOMER_Y + CUST_R + 80,
          transform: `translate(-50%, ${labelY}px)`,
          opacity: labelOpacity,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            fontFamily: font.family,
            fontWeight: font.semi,
            fontSize: 46,
            color: colors.dark,
            letterSpacing: -0.5,
          }}
        >
          4 clientes en recompra
        </span>
      </div>

      {/* ── Earnings badge ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: CUSTOMER_Y + CUST_R + 180,
          transform: `translate(-50%, 0) scale(${earningsScale})`,
          opacity: earningsOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            backgroundColor: `${BLUE}12`,
            border: `2px solid ${BLUE}33`,
            borderRadius: 24,
            padding: '20px 48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              fontFamily: font.family,
              fontWeight: font.regular,
              fontSize: 26,
              color: colors.muted,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Bono Q-Team
          </span>
          <span
            style={{
              fontFamily: font.family,
              fontWeight: font.bold,
              fontSize: 64,
              color: BLUE,
              letterSpacing: -1.5,
              lineHeight: 1,
            }}
          >
            $<CountUp target={1900} startFrame={105} endFrame={130} frame={frame} /> MXN
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
