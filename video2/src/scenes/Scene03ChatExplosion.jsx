import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0       all 4 previous bubbles already visible (from Scene02)
  f15      Ana slides in from LEFT
  f25      Sofía slides in from RIGHT
  f35      Diego slides in from BOTTOM

  CAMERA: zoom out 0.95 → 0.90
  DEPTH: older bubbles at 0.55 opacity, new ones at full
*/

// ── Previous bubbles (already settled, shown dimmed) ──

const OLD_BUBBLES = [
  {name: 'Carlos', msg: '¿Qué te pareció el producto?', time: '10:32 AM', left: 80, top: 580, tailSide: 'left'},
  {name: 'María', msg: 'Oye lo del negocio', time: '10:45 AM', left: 520, top: 820, tailSide: 'right'},
  {name: 'Luis', msg: '¿Cuándo es el Zoom?', time: '11:02 AM', left: 100, top: 1100, tailSide: 'left'},
  {name: 'Pedro', msg: '¿Me mandas la info?', time: '11:18 AM', left: 480, top: 380, tailSide: 'right'},
];

// ── New bubbles (animated in) ──

const NEW_BUBBLES = [
  {
    name: 'Ana',
    msg: '¿Tienes un minuto?',
    time: '11:34 AM',
    startFrame: 15,
    left: 60,
    top: 260,
    tailSide: 'left',
    from: {x: -550, y: 0},
  },
  {
    name: 'Sofía',
    msg: '¿Ya me enviaste el link?',
    time: '11:41 AM',
    startFrame: 25,
    left: 540,
    top: 1260,
    tailSide: 'right',
    from: {x: 550, y: 0},
  },
  {
    name: 'Diego',
    msg: 'Necesito hablar contigo',
    time: '11:52 AM',
    startFrame: 35,
    left: 300,
    top: 1460,
    tailSide: 'left',
    from: {x: 0, y: 500},
  },
];

const tailRadius = (side) =>
  side === 'left'
    ? '32px 32px 32px 6px'
    : '32px 32px 6px 32px';

// ── Static (old) bubble ──

const OldBubble = ({name, msg, time, left, top, tailSide, dimOpacity}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      opacity: dimOpacity,
    }}
  >
    <div
      style={{
        width: 620,
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: tailRadius(tailSide),
        padding: '36px 42px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 30, color: colors.blue, marginBottom: 14, letterSpacing: -0.3}}>
        {name}
      </div>
      <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 34, color: colors.dark, lineHeight: 1.45, letterSpacing: -0.2}}>
        {msg}
      </div>
      <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 14, color: '#94A3B8', marginTop: 12, textAlign: 'right'}}>
        {time}
      </div>
    </div>
  </div>
);

// ── Animated (new) bubble ──

const NewBubble = ({name, msg, time, startFrame, left, top, tailSide, from, frame, fps}) => {
  const sp = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 13,
      stiffness: 120,
      mass: 0.6,
    },
  });

  const slideX = interpolate(sp, [0, 1], [from.x, 0]);
  const slideY = interpolate(sp, [0, 1], [from.y, 0]);

  const opacity = interpolate(frame, [startFrame, startFrame + 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shadowDepth = interpolate(sp, [0, 1], [4, 22]);
  const shadowAlpha = interpolate(sp, [0, 1], [0.02, 0.09]);

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        opacity,
        transform: `translate(${slideX}px, ${slideY}px)`,
        willChange: 'transform',
      }}
    >
      <div
        style={{
          width: 620,
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: tailRadius(tailSide),
          padding: '36px 42px',
          boxShadow: `0 ${shadowDepth * 0.4}px ${shadowDepth}px rgba(0,0,0,${shadowAlpha})`,
        }}
      >
        <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 30, color: colors.blue, marginBottom: 14, letterSpacing: -0.3}}>
          {name}
        </div>
        <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 34, color: colors.dark, lineHeight: 1.45, letterSpacing: -0.2}}>
          {msg}
        </div>
        <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 14, color: '#94A3B8', marginTop: 12, textAlign: 'right'}}>
          {time}
        </div>
      </div>
    </div>
  );
};

// ── Main Scene ──

export const Scene03ChatExplosion = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Camera: zoom out 0.95 → 0.90 ──
  const cameraScale = interpolate(frame, [0, 120], [0.95, 0.90], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Old bubbles dim as new ones arrive ──
  const dimOpacity = interpolate(frame, [15, 50], [1, 0.55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        transform: `scale(${cameraScale})`,
        transformOrigin: 'center center',
      }}
    >
      {/* Old bubbles — dimmed for depth */}
      {OLD_BUBBLES.map((b) => (
        <OldBubble key={b.name} {...b} dimOpacity={dimOpacity} />
      ))}

      {/* New bubbles — animated, full brightness */}
      {NEW_BUBBLES.map((b) => (
        <NewBubble key={b.name} {...b} frame={frame} fps={fps} />
      ))}
    </AbsoluteFill>
  );
};
