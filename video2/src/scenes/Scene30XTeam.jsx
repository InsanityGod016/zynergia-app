import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 90 frames = 3s)
  f0–40    Node zooms in from scale 0 → 1 (spring)
  f40–80   Glow rings fade in, text + badge appear
  f80–90   Hold

  LAYOUT
    Centered hero node (200px dia) — blue #004AFE
    Days badge below node
    "X-Team" title
    "Equipo en crecimiento" subtitle
*/

const BLUE = '#004AFE';
const NODE_R = 100;          // 200px diameter — largest node in the video
const CENTER_X = 540;
const NODE_Y = 680;

// ── Glow ring (static, fades in) ──
const GlowRing = ({ring, opacity}) => {
  const size = NODE_R * 2 + ring * 90;
  return (
    <div
      style={{
        position: 'absolute',
        left: CENTER_X,
        top: NODE_Y,
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${Math.max(1, 3 - ring + 1)}px solid ${BLUE}`,
        opacity: opacity * (0.45 - ring * 0.1),
        pointerEvents: 'none',
      }}
    />
  );
};

export const Scene30XTeam = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Node zoom-in ──
  const nodeSp = spring({frame, fps, config: {damping: 13, stiffness: 120, mass: 0.7}});
  const nodeScale = interpolate(nodeSp, [0, 1], [0, 1]);
  const nodeOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Glow rings ──
  const glowOpacity = interpolate(frame, [40, 62], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Radial halo behind node ──
  const haloOpacity = interpolate(frame, [40, 70], [0, 0.18], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Badge ──
  const badgeOpacity = interpolate(frame, [44, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const badgeSp = spring({frame: Math.max(0, frame - 44), fps, config: {damping: 12, stiffness: 130, mass: 0.5}});
  const badgeY = frame >= 44 ? interpolate(badgeSp, [0, 1], [16, 0]) : 16;

  // ── Text ──
  const textOpacity = interpolate(frame, [54, 72], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textSp = spring({frame: Math.max(0, frame - 54), fps, config: {damping: 12, stiffness: 120, mass: 0.6}});
  const textY = frame >= 54 ? interpolate(textSp, [0, 1], [28, 0]) : 28;

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>

      {/* ── Radial background halo ── */}
      <div
        style={{
          position: 'absolute',
          left: CENTER_X,
          top: NODE_Y,
          transform: 'translate(-50%, -50%)',
          width: 560,
          height: 560,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BLUE} 0%, transparent 70%)`,
          opacity: haloOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* ── Glow rings ── */}
      {[0, 1, 2].map((ring) => (
        <GlowRing key={ring} ring={ring} opacity={glowOpacity} />
      ))}

      {/* ── Main node ── */}
      <div
        style={{
          position: 'absolute',
          left: CENTER_X,
          top: NODE_Y,
          transform: `translate(-50%, -50%) scale(${nodeScale})`,
          opacity: nodeOpacity,
          width: NODE_R * 2,
          height: NODE_R * 2,
          borderRadius: NODE_R,
          backgroundColor: BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 16px 56px ${BLUE}55, 0 4px 20px ${BLUE}33`,
        }}
      >
        {/* Trophy icon */}
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="8 21 12 21 16 21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M7 4H17V13C17 15.76 14.76 18 12 18C9.24 18 7 15.76 7 13V4Z"/>
          <path d="M7 6H3C3 6 3 12 7 13"/>
          <path d="M17 6H21C21 6 21 12 17 13"/>
        </svg>
      </div>

      {/* ── Days badge ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: NODE_Y + NODE_R + 36,
          transform: `translateX(-50%) translateY(${badgeY}px)`,
          opacity: badgeOpacity,
          display: 'inline-flex',
          backgroundColor: `${BLUE}14`,
          border: `1.5px solid ${BLUE}33`,
          borderRadius: 100,
          paddingLeft: 28,
          paddingRight: 28,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 28, color: BLUE, whiteSpace: 'nowrap'}}>
          Días 110–120
        </span>
      </div>

      {/* ── X-Team title ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: NODE_Y + NODE_R + 120,
          transform: `translateX(-50%) translateY(${textY}px)`,
          opacity: textOpacity,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 96, color: BLUE, letterSpacing: -2.5, lineHeight: 1}}>
          X-Team
        </div>
      </div>

      {/* ── Subtitle ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: NODE_Y + NODE_R + 240,
          transform: `translateX(-50%) translateY(${textY}px)`,
          opacity: textOpacity,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 42, color: colors.muted, letterSpacing: -0.5}}>
          Equipo en crecimiento
        </span>
      </div>

    </AbsoluteFill>
  );
};
