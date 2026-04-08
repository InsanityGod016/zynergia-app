import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 150 frames = 5s)
  f0–30    Carlos bubble already visible (carried from Scene01)
  f30–80   María slides in from right
  f80–130  Luis slides in from bottom
  f130–180 Pedro slides in from top (scene holds to f150)

  CAMERA: slow zoom out 1.05 → 0.95
  LAYOUT: loose circular composition, not a vertical stack
*/

// ── Bubble positions: circular distribution around center ──
// Canvas is 1080×1920. Center ≈ (540, 960).
// Carlos: upper-left   María: right   Luis: lower-left   Pedro: upper-right

const BUBBLES = [
  {
    name: 'Carlos',
    msg: '¿Qué te pareció el producto?',
    time: '10:32 AM',
    startFrame: -1, // already visible
    left: 80,
    top: 580,
    tailSide: 'left',   // border-radius tail
    from: {x: 0, y: 0}, // no movement, already settled
  },
  {
    name: 'María',
    msg: 'Oye lo del negocio',
    time: '10:45 AM',
    startFrame: 30,
    left: 520,
    top: 820,
    tailSide: 'right',
    from: {x: 500, y: 0},
  },
  {
    name: 'Luis',
    msg: '¿Cuándo es el Zoom?',
    time: '11:02 AM',
    startFrame: 80,
    left: 100,
    top: 1100,
    tailSide: 'left',
    from: {x: 0, y: 500},
  },
  {
    name: 'Pedro',
    msg: '¿Me mandas la info?',
    time: '11:18 AM',
    startFrame: 130,
    left: 480,
    top: 380,
    tailSide: 'right',
    from: {x: 0, y: -500},
  },
];

const tailRadius = (side) =>
  side === 'left'
    ? '32px 32px 32px 6px'
    : '32px 32px 6px 32px';

// ── Single Bubble Renderer ──

const ChatBubble = ({name, msg, time, startFrame, left, top, tailSide, from, frame, fps}) => {
  // Carlos (startFrame -1) is already present — no animation
  const isStatic = startFrame < 0;

  let slideX = 0;
  let slideY = 0;
  let opacity = 1;
  let shadowDepth = 20;
  let shadowAlpha = 0.08;

  if (!isStatic) {
    const sp = spring({
      frame: frame - startFrame,
      fps,
      config: {
        damping: 12,
        stiffness: 90,
        mass: 0.7,
      },
    });

    slideX = interpolate(sp, [0, 1], [from.x, 0]);
    slideY = interpolate(sp, [0, 1], [from.y, 0]);

    opacity = interpolate(frame, [startFrame, startFrame + 6], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    shadowDepth = interpolate(sp, [0, 1], [4, 20]);
    shadowAlpha = interpolate(sp, [0, 1], [0.02, 0.08]);
  }

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
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 30,
            color: colors.blue,
            marginBottom: 14,
            letterSpacing: -0.3,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.regular,
            fontSize: 34,
            color: colors.dark,
            lineHeight: 1.45,
            letterSpacing: -0.2,
          }}
        >
          {msg}
        </div>
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.regular,
            fontSize: 20,
            color: '#94A3B8',
            marginTop: 16,
            textAlign: 'right',
          }}
        >
          {time}
        </div>
      </div>
    </div>
  );
};

// ── Main Scene ──

export const Scene02MoreMessages = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Camera: zoom out 1.05 → 0.95 ──
  const cameraScale = interpolate(frame, [0, 150], [1.05, 0.95], {
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
      {BUBBLES.map((b) => (
        <ChatBubble key={b.name} {...b} frame={frame} fps={fps} />
      ))}
    </AbsoluteFill>
  );
};
