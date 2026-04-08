import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0       all 7 bubbles visible dimmed in background
  f10      WhatsApp icon scales in (center, spring)
  f30      badge appears: 1
  f48      badge: 4    + shake
  f66      badge: 12   + shake
  f84      badge: 28   + shake
  f102     badge: 57   + shake

  CAMERA: stays ~0.90
  SHAKE: each counter bump shakes the entire bubble layer
*/

// ── All background bubbles (positions from Scene02 + Scene03) ──

const ALL_BUBBLES = [
  {name: 'Carlos', msg: '¿Qué te pareció el producto?', left: 80, top: 580, tailSide: 'left'},
  {name: 'María', msg: 'Oye lo del negocio', left: 520, top: 820, tailSide: 'right'},
  {name: 'Luis', msg: '¿Cuándo es el Zoom?', left: 100, top: 1100, tailSide: 'left'},
  {name: 'Pedro', msg: '¿Me mandas la info?', left: 480, top: 380, tailSide: 'right'},
  {name: 'Ana', msg: '¿Tienes un minuto?', left: 60, top: 260, tailSide: 'left'},
  {name: 'Sofía', msg: '¿Ya me enviaste el link?', left: 540, top: 1260, tailSide: 'right'},
  {name: 'Diego', msg: 'Necesito hablar contigo', left: 300, top: 1460, tailSide: 'left'},
];

// ── Counter steps ──

const COUNTS = [
  {val: 1, frame: 30},
  {val: 4, frame: 48},
  {val: 12, frame: 66},
  {val: 28, frame: 84},
  {val: 57, frame: 102},
];

const tailRadius = (side) =>
  side === 'left'
    ? '32px 32px 32px 6px'
    : '32px 32px 6px 32px';

// ── Background bubble (static, dimmed) ──

const BgBubble = ({name, msg, left, top, tailSide, shakeX, shakeY}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      opacity: 0.4,
      transform: `translate(${shakeX}px, ${shakeY}px)`,
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
        boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
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

// ── Main Scene ──

export const Scene04Notifications = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Camera: hold around 0.90 ──
  const cameraScale = 0.90;

  // ── WhatsApp icon entry: spring scale ──
  const iconSpring = spring({
    frame: frame - 10,
    fps,
    config: {damping: 10, stiffness: 140, mass: 0.8},
  });

  const iconOpacity = interpolate(frame, [10, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Current counter value ──
  let currentCount = 0;
  let currentCountIdx = -1;
  for (let i = 0; i < COUNTS.length; i++) {
    if (frame >= COUNTS[i].frame) {
      currentCount = COUNTS[i].val;
      currentCountIdx = i;
    }
  }

  // ── Badge bounce: spring on each count change ──
  let badgeBounce = 1;
  if (currentCountIdx >= 0) {
    const countFrame = COUNTS[currentCountIdx].frame;
    badgeBounce = spring({
      frame: frame - countFrame,
      fps,
      config: {damping: 8, stiffness: 300, mass: 0.5},
    });
    // Map 0→1 spring to 1.4→1 scale (overshoot bounce)
    badgeBounce = interpolate(badgeBounce, [0, 1], [1.5, 1]);
  }

  // ── Shake effect: triggered by each counter bump ──
  // Decays rapidly after each bump
  let shakeIntensity = 0;
  for (const c of COUNTS) {
    if (frame >= c.frame && frame < c.frame + 12) {
      const decay = interpolate(frame, [c.frame, c.frame + 12], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      // Intensity grows with higher counts
      const magnitude = c.val > 20 ? 6 : c.val > 10 ? 4 : 2.5;
      shakeIntensity = decay * magnitude;
    }
  }

  // Pseudo-random shake per frame using sin at different frequencies
  const shakeX = Math.sin(frame * 1.7) * shakeIntensity;
  const shakeY = Math.cos(frame * 2.3) * shakeIntensity;

  // ── Badge visibility ──
  const badgeOpacity = interpolate(frame, [30, 34], [0, 1], {
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
      {/* Background bubbles — dimmed, shaken */}
      {ALL_BUBBLES.map((b) => (
        <BgBubble key={b.name} {...b} shakeX={shakeX} shakeY={shakeY} />
      ))}

      {/* WhatsApp icon — centered */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${iconSpring})`,
          opacity: iconOpacity,
          willChange: 'transform',
        }}
      >
        {/* Soft glow behind icon */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 700,
            height: 700,
            borderRadius: 350,
            backgroundColor: colors.green,
            filter: 'blur(120px)',
            opacity: 0.18,
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Icon container */}
        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: 110,
            backgroundColor: colors.green,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 32px 80px rgba(37,211,102,0.4)',
            position: 'relative',
          }}
        >
          {/* WhatsApp SVG */}
          <svg width="240" height="240" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.252-.149-2.868.852.852-2.868-.168-.268A8 8 0 1112 20z" />
          </svg>

          {/* Notification badge */}
          {currentCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: -28,
                right: -28,
                opacity: badgeOpacity,
                transform: `scale(${badgeBounce})`,
                transformOrigin: 'center center',
                backgroundColor: colors.red,
                borderRadius: 40,
                padding: '12px 28px',
                minWidth: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(239,68,68,0.45)',
              }}
            >
              <span
                style={{
                  fontFamily: font.family,
                  fontWeight: font.bold,
                  fontSize: 52,
                  color: colors.white,
                  lineHeight: 1,
                }}
              >
                {currentCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
