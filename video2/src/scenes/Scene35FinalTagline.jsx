import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Img, staticFile, Easing} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 90 frames = 3s)
  f0       Logo already settled (continues from Scene34)
  f0–27    "Deja de intentar recordarlo todo." fades in + slides up
  f27–54   "Zynergia lo hace por ti." fades in + slides up
  f54–90   Blue underline draws left → right beneath second line
*/

const BLUE = '#004AFE';
const LOGO_SIZE   = 320;
const LOGO_RADIUS = 20; // % — app icon corners

export const Scene35FinalTagline = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Line 1: "Deja de intentar recordarlo todo." ──
  const line1Sp      = spring({frame, fps, config: {damping: 14, stiffness: 100, mass: 0.8}});
  const line1Opacity = interpolate(frame, [0, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const line1Y       = interpolate(line1Sp, [0, 1], [32, 0]);

  // ── Line 2: "Zynergia lo hace por ti." ──
  const line2Sp      = spring({frame: Math.max(0, frame - 27), fps, config: {damping: 13, stiffness: 100, mass: 0.8}});
  const line2Opacity = interpolate(frame, [27, 48], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const line2Y       = frame >= 27 ? interpolate(line2Sp, [0, 1], [32, 0]) : 32;

  // ── Underline ──
  const underlineSp       = spring({frame: Math.max(0, frame - 54), fps, config: {damping: 20, stiffness: 80, mass: 0.6}});
  const underlineProgress = frame >= 54 ? interpolate(underlineSp, [0, 1], [0, 1]) : 0;

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
          gap: 56,
          padding: '0 80px',
        }}
      >

        {/* ── Logo — settled from previous scene ── */}
        <div
          style={{
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            borderRadius: `${LOGO_RADIUS}%`,
            overflow: 'hidden',
            boxShadow: `0 16px 56px ${BLUE}38`,
            flexShrink: 0,
          }}
        >
          <Img
            src={staticFile('logo.png')}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
        </div>

        {/* ── Text block ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 32,
          }}
        >

          {/* Line 1 */}
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
                fontSize: 48,
                color: colors.dark,
                letterSpacing: -0.8,
                lineHeight: 1.3,
              }}
            >
              Deja de intentar recordarlo todo.
            </span>
          </div>

          {/* Line 2 + underline */}
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
                fontSize: 64,
                color: colors.dark,
                letterSpacing: -1.8,
                lineHeight: 1,
                textAlign: 'center',
              }}
            >
              Zynergia lo hace por ti.
            </span>

            {/* Animated underline */}
            <div style={{height: 6, borderRadius: 3, overflow: 'hidden'}}>
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
      </div>
    </AbsoluteFill>
  );
};
