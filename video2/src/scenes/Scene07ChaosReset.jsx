import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–30    All elements visible (frozen state from Scene06), start drifting toward center
  f30–60   Elements compress toward center, accelerating (magnetic pull)
  f60–80   Elements collapse to center point, scale down + fade out
  f80–120  Empty white screen — clean slate

  CAMERA: 1.00 → 1.05 (slight zoom in during collapse)
*/

// ── Canvas center ──
const CX = 540;
const CY = 960;

// ── Chat bubbles (same as Scene06, frozen state: dimmed 10% + white overlay) ──

const CHAT_BUBBLES = [
  {name: 'Carlos', msg: '¿Qué te pareció el producto?', left: 80, top: 580, tailSide: 'left', w: 620},
  {name: 'María', msg: 'Oye lo del negocio', left: 520, top: 820, tailSide: 'right', w: 620},
  {name: 'Luis', msg: '¿Cuándo es el Zoom?', left: 100, top: 1100, tailSide: 'left', w: 620},
  {name: 'Pedro', msg: '¿Me mandas la info?', left: 480, top: 380, tailSide: 'right', w: 620},
  {name: 'Ana', msg: '¿Tienes un minuto?', left: 60, top: 260, tailSide: 'left', w: 620},
  {name: 'Sofía', msg: '¿Ya me enviaste el link?', left: 540, top: 1260, tailSide: 'right', w: 620},
  {name: 'Diego', msg: 'Necesito hablar contigo', left: 300, top: 1460, tailSide: 'left', w: 620},
];

// ── Reminder cards ──

const REMINDERS = [
  {text: 'Seguimiento Ana', icon: '📋', yPos: 580, w: 900},
  {text: 'Invitar a Luis al Zoom', icon: '📹', yPos: 840, w: 900},
  {text: 'Recompra Carlos', icon: '🔄', yPos: 1100, w: 900},
];

const tailRadius = (side) =>
  side === 'left'
    ? '32px 32px 32px 6px'
    : '32px 32px 6px 32px';

// ── Collapsing chat bubble ──

const CollapsingBubble = ({name, msg, left, top, tailSide, w, pullProgress, collapseScale, fadeOpacity}) => {
  // Calculate center of this element
  const elCenterX = left + w / 2;
  const elCenterY = top + 70; // approximate vertical center of bubble

  // Pull toward canvas center
  const currentX = interpolate(pullProgress, [0, 1], [left, CX - w / 2]);
  const currentY = interpolate(pullProgress, [0, 1], [top, CY - 70]);

  return (
    <div
      style={{
        position: 'absolute',
        left: currentX,
        top: currentY,
        opacity: fadeOpacity * 0.10, // starts at Scene06 frozen opacity
        transform: `scale(${collapseScale})`,
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      }}
    >
      <div
        style={{
          width: w,
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
};

// ── Collapsing reminder card ──

const CollapsingReminder = ({text, icon, yPos, w, pullProgress, collapseScale, fadeOpacity}) => {
  const currentX = 540; // stays centered horizontally
  const currentY = interpolate(pullProgress, [0, 1], [yPos, CY - 80]);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: currentY,
        transform: `translateX(-50%) scale(${collapseScale})`,
        opacity: fadeOpacity * 0.10,
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      }}
    >
      <div
        style={{
          width: w,
          backgroundColor: '#FEF2F2',
          border: '1.5px solid rgba(239,68,68,0.12)',
          borderRadius: 32,
          padding: '44px 50px',
          boxShadow: '0 4px 24px rgba(239,68,68,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
        }}
      >
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
        <div style={{flex: 1}}>
          <div style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 38, color: colors.dark, lineHeight: 1.3}}>
            {text}
          </div>
        </div>
        <div style={{backgroundColor: colors.red, borderRadius: 18, padding: '12px 28px', flexShrink: 0}}>
          <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 28, color: colors.white}}>
            Pendiente
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main Scene ──

export const Scene07ChaosReset = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Camera: slight zoom in during collapse 1.00 → 1.05 ──
  const cameraScale = interpolate(frame, [0, 70], [1.00, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Magnetic pull: spring-driven progress 0→1 over f0–60 ──
  const pullSpring = spring({
    frame,
    fps,
    config: {
      damping: 18,
      stiffness: 40,
      mass: 1.2,
    },
  });

  // Eased pull progress — slow start, accelerating
  const pullProgress = interpolate(pullSpring, [0, 1], [0, 1]);

  // ── Collapse scale: elements shrink as they reach center ──
  const collapseScale = interpolate(frame, [30, 70], [1, 0.15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Fade out: elements disappear at center ──
  const fadeOpacity = interpolate(frame, [50, 75], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Text from Scene06 also collapses ──
  const textFade = interpolate(frame, [0, 30], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textScale = interpolate(frame, [0, 30], [1, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Don't render collapsed elements after fade completes
  const showElements = frame < 80;

  // ── White overlay from Scene06 (starts visible, fades with elements) ──
  const overlayOpacity = interpolate(frame, [0, 60], [0.6, 0], {
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
      {showElements && (
        <>
          {/* Chat bubbles — pulled to center */}
          {CHAT_BUBBLES.map((b) => (
            <CollapsingBubble
              key={b.name}
              {...b}
              pullProgress={pullProgress}
              collapseScale={collapseScale}
              fadeOpacity={fadeOpacity}
            />
          ))}

          {/* Reminder cards — pulled to center */}
          {REMINDERS.map((r) => (
            <CollapsingReminder
              key={r.text}
              {...r}
              pullProgress={pullProgress}
              collapseScale={collapseScale}
              fadeOpacity={fadeOpacity}
            />
          ))}

          {/* White overlay carried from Scene06 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255,255,255,0.6)',
              opacity: overlayOpacity,
            }}
          />

          {/* Text from Scene06 — collapses and fades */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) scale(${textScale})`,
              opacity: textFade,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <div
              style={{
                fontFamily: font.family,
                fontWeight: font.bold,
                fontSize: 56,
                color: colors.dark,
                letterSpacing: -1,
                lineHeight: 1.2,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              El problema no es vender.
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: font.family,
                  fontWeight: font.bold,
                  fontSize: 56,
                  color: colors.dark,
                  letterSpacing: -1,
                  lineHeight: 1.2,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                Es recordar todo.
              </div>
              <div
                style={{
                  marginTop: 16,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.blue,
                  width: 520,
                  alignSelf: 'center',
                }}
              />
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
