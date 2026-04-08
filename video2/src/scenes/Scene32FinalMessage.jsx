import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–40    First text block fades in + slides up
  f40–80   "Paso a paso." fades in + slides up
  f80–120  Blue underline draws left → right beneath "Paso a paso."
  f120     Hold
*/

const BLUE = '#004AFE';

export const Scene32FinalMessage = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── First text block ──
  const line1Sp      = spring({frame, fps, config: {damping: 14, stiffness: 100, mass: 0.8}});
  const line1Opacity = interpolate(frame, [0, 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const line1Y       = interpolate(line1Sp, [0, 1], [36, 0]);

  // ── "Paso a paso." ──
  const line2Sp      = spring({frame: Math.max(0, frame - 40), fps, config: {damping: 13, stiffness: 100, mass: 0.8}});
  const line2Opacity = interpolate(frame, [40, 64], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const line2Y       = frame >= 40 ? interpolate(line2Sp, [0, 1], [32, 0]) : 32;

  // ── Underline ──
  const underlineSp       = spring({frame: Math.max(0, frame - 80), fps, config: {damping: 20, stiffness: 80, mass: 0.6}});
  const underlineProgress = frame >= 80 ? interpolate(underlineSp, [0, 1], [0, 1]) : 0;

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 88px',
          gap: 48,
        }}
      >

        {/* ── First block ── */}
        <div
          style={{
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px)`,
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: font.family,
              fontWeight: font.regular,
              fontSize: 50,
              color: colors.dark,
              letterSpacing: -0.8,
              lineHeight: 1.35,
            }}
          >
            Zynergia te muestra exactamente qué hacer{'\n'}
            para cobrar tus bonos.
          </span>
        </div>

        {/* ── "Paso a paso." + underline ── */}
        <div
          style={{
            opacity: line2Opacity,
            transform: `translateY(${line2Y}px)`,
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 14,
          }}
        >
          <span
            style={{
              fontFamily: font.family,
              fontWeight: font.bold,
              fontSize: 88,
              color: colors.dark,
              letterSpacing: -2.5,
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            Paso a paso.
          </span>

          {/* Animated underline */}
          <div
            style={{
              height: 6,
              borderRadius: 3,
              overflow: 'hidden',
              backgroundColor: 'transparent',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${underlineProgress * 100}%`,
                backgroundColor: BLUE,
                borderRadius: 3,
              }}
            />
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};
