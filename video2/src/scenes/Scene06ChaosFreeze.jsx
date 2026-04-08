import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–59    All previous UI elements visible + vibrating (mental overload)
  f60      FREEZE — everything stops, elements dim to 20%
  f65–80   Line 1 fades in: "El problema no es vender."
  f80–95   Line 2 fades in: "Es recordar todo."
  f95–110  Blue underline draws under line 2
  f110–120 Hold

  CAMERA: 0.90 → 1.00 (zoom back in)
*/

// ── Chat bubbles (carried from previous scenes) ──

const CHAT_BUBBLES = [
  {name: 'Carlos', msg: '¿Qué te pareció el producto?', left: 80, top: 580, tailSide: 'left'},
  {name: 'María', msg: 'Oye lo del negocio', left: 520, top: 820, tailSide: 'right'},
  {name: 'Luis', msg: '¿Cuándo es el Zoom?', left: 100, top: 1100, tailSide: 'left'},
  {name: 'Pedro', msg: '¿Me mandas la info?', left: 480, top: 380, tailSide: 'right'},
  {name: 'Ana', msg: '¿Tienes un minuto?', left: 60, top: 260, tailSide: 'left'},
  {name: 'Sofía', msg: '¿Ya me enviaste el link?', left: 540, top: 1260, tailSide: 'right'},
  {name: 'Diego', msg: 'Necesito hablar contigo', left: 300, top: 1460, tailSide: 'left'},
];

// ── Reminder cards (carried from Scene05) ──

const REMINDERS = [
  {text: 'Seguimiento Ana', icon: '📋', yPos: 580},
  {text: 'Invitar a Luis al Zoom', icon: '📹', yPos: 840},
  {text: 'Recompra Carlos', icon: '🔄', yPos: 1100},
];

const tailRadius = (side) =>
  side === 'left'
    ? '32px 32px 32px 6px'
    : '32px 32px 6px 32px';

// ── Chat bubble with vibration ──

const ChaosBubble = ({name, msg, left, top, tailSide, shakeX, shakeY, dimOpacity}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      opacity: dimOpacity,
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

// ── Reminder card with vibration ──

const ChaosReminder = ({text, icon, yPos, shakeX, shakeY, dimOpacity}) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      top: yPos,
      transform: `translateX(-50%) translate(${shakeX}px, ${shakeY}px)`,
      opacity: dimOpacity,
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

// ── Main Scene ──

export const Scene06ChaosFreeze = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const freezeFrame = 60;
  const isFrozen = frame >= freezeFrame;

  // ── Camera: zoom back in 0.90 → 1.00 ──
  const cameraScale = interpolate(frame, [0, 120], [0.90, 1.00], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Vibration: increases intensity then stops at freeze ──
  let shakeIntensity = 0;
  if (!isFrozen) {
    // Ramp up vibration from gentle to intense over 60 frames
    shakeIntensity = interpolate(frame, [0, 55], [2, 8], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  // Multi-frequency shake for organic feel
  const shakeX = Math.sin(frame * 3.7) * shakeIntensity + Math.sin(frame * 7.3) * shakeIntensity * 0.3;
  const shakeY = Math.cos(frame * 4.1) * shakeIntensity + Math.cos(frame * 6.7) * shakeIntensity * 0.3;

  // ── Elements dim on freeze ──
  const dimOpacity = isFrozen
    ? interpolate(frame, [freezeFrame, freezeFrame + 10], [0.25, 0.10], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0.25;

  // ── Line 1: "El problema no es vender." ──
  const line1Start = 65;
  const line1Spring = spring({
    frame: frame - line1Start,
    fps,
    config: {damping: 14, stiffness: 100, mass: 0.8},
  });
  const line1Opacity = interpolate(frame, [line1Start, line1Start + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line1Y = interpolate(line1Spring, [0, 1], [60, 0]);

  // ── Line 2: "Es recordar todo." ──
  const line2Start = 80;
  const line2Spring = spring({
    frame: frame - line2Start,
    fps,
    config: {damping: 14, stiffness: 100, mass: 0.8},
  });
  const line2Opacity = interpolate(frame, [line2Start, line2Start + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line2Y = interpolate(line2Spring, [0, 1], [60, 0]);

  // ── Underline draw animation ──
  const underlineStart = 95;
  const underlineProgress = interpolate(frame, [underlineStart, underlineStart + 15], [0, 100], {
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
      {/* Chat bubbles — vibrating then frozen */}
      {CHAT_BUBBLES.map((b) => (
        <ChaosBubble key={b.name} {...b} shakeX={shakeX} shakeY={shakeY} dimOpacity={dimOpacity} />
      ))}

      {/* Reminder cards — vibrating then frozen */}
      {REMINDERS.map((r) => (
        <ChaosReminder key={r.text} {...r} shakeX={shakeX * 0.7} shakeY={shakeY * 0.7} dimOpacity={dimOpacity} />
      ))}

      {/* Freeze overlay — subtle white wash to push elements back */}
      {isFrozen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255,255,255,0.6)',
            opacity: interpolate(frame, [freezeFrame, freezeFrame + 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        />
      )}

      {/* Center text block */}
      {frame >= line1Start && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          {/* Line 1 */}
          <div
            style={{
              opacity: line1Opacity,
              transform: `translateY(${line1Y}px)`,
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

          {/* Line 2 + underline */}
          {frame >= line2Start && (
            <div
              style={{
                opacity: line2Opacity,
                transform: `translateY(${line2Y}px)`,
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

              {/* Animated underline */}
              <div
                style={{
                  marginTop: 16,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.blue,
                  width: `${underlineProgress}%`,
                  maxWidth: 520,
                  alignSelf: 'center',
                }}
              />
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
