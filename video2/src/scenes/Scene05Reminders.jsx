import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0       all 7 chat bubbles visible dimmed, WA icon dimmed center
  f15      first reminder card slides up from bottom
  f35      second reminder card slides up
  f55      third reminder card slides up
  f75–120  hold — screen feels crowded

  CAMERA: 0.90
  LAYOUT: chats in upper half (dimmed), reminders in lower half
*/

// ── Background chat bubbles (same positions, deeply dimmed) ──

const BG_BUBBLES = [
  {name: 'Carlos', msg: '¿Qué te pareció el producto?', left: 80, top: 580, tailSide: 'left'},
  {name: 'María', msg: 'Oye lo del negocio', left: 520, top: 820, tailSide: 'right'},
  {name: 'Luis', msg: '¿Cuándo es el Zoom?', left: 100, top: 1100, tailSide: 'left'},
  {name: 'Pedro', msg: '¿Me mandas la info?', left: 480, top: 380, tailSide: 'right'},
  {name: 'Ana', msg: '¿Tienes un minuto?', left: 60, top: 260, tailSide: 'left'},
  {name: 'Sofía', msg: '¿Ya me enviaste el link?', left: 540, top: 1260, tailSide: 'right'},
  {name: 'Diego', msg: 'Necesito hablar contigo', left: 300, top: 1460, tailSide: 'left'},
];

// ── Reminder cards ──

const REMINDERS = [
  {text: 'Seguimiento Ana', icon: '📋', startFrame: 15},
  {text: 'Invitar a Luis al Zoom', icon: '📹', startFrame: 35},
  {text: 'Recompra Carlos', icon: '🔄', startFrame: 55},
];

const tailRadius = (side) =>
  side === 'left'
    ? '32px 32px 32px 6px'
    : '32px 32px 6px 32px';

// ── Background bubble ──

const BgBubble = ({name, msg, left, top, tailSide}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      opacity: 0.25,
    }}
  >
    <div
      style={{
        width: 620,
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: tailRadius(tailSide),
        padding: '36px 42px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 30, color: colors.blue, marginBottom: 14, letterSpacing: -0.3}}>
        {name}
      </div>
      <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 34, color: colors.dark, lineHeight: 1.45, letterSpacing: -0.2}}>
        {msg}
      </div>
    </div>
  </div>
);

// ── Reminder card ──

const ReminderCard = ({text, icon, startFrame, index, frame, fps}) => {
  const sp = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 13,
      stiffness: 100,
      mass: 0.7,
    },
  });

  const slideY = interpolate(sp, [0, 1], [500, 0]);
  const opacity = interpolate(frame, [startFrame, startFrame + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shadowDepth = interpolate(sp, [0, 1], [4, 24]);

  if (frame < startFrame) return null;

  // Position: centered horizontally, stacked from upper-mid area
  const yPos = 580 + index * 260;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: yPos,
        transform: `translateX(-50%) translateY(${slideY}px)`,
        opacity,
        willChange: 'transform',
      }}
    >
      <div
        style={{
          width: 900,
          backgroundColor: '#FEF2F2',
          border: '1.5px solid rgba(239,68,68,0.12)',
          borderRadius: 32,
          padding: '44px 50px',
          boxShadow: `0 ${shadowDepth * 0.4}px ${shadowDepth}px rgba(239,68,68,0.08)`,
          display: 'flex',
          alignItems: 'center',
          gap: 28,
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 24,
            backgroundColor: 'rgba(239,68,68,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 44,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* Text */}
        <div style={{flex: 1}}>
          <div
            style={{
              fontFamily: font.family,
              fontWeight: font.semi,
              fontSize: 38,
              color: colors.dark,
              lineHeight: 1.3,
            }}
          >
            {text}
          </div>
        </div>

        {/* Overdue badge */}
        <div
          style={{
            backgroundColor: colors.red,
            borderRadius: 18,
            padding: '12px 28px',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: font.family,
              fontWeight: font.bold,
              fontSize: 28,
              color: colors.white,
            }}
          >
            Pendiente
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main Scene ──

export const Scene05Reminders = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const cameraScale = 0.90;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        transform: `scale(${cameraScale})`,
        transformOrigin: 'center center',
      }}
    >
      {/* Reminder cards — slide up from bottom */}
      {REMINDERS.map((r, i) => (
        <ReminderCard key={r.text} {...r} index={i} frame={frame} fps={fps} />
      ))}
    </AbsoluteFill>
  );
};
