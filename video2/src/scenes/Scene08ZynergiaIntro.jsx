import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Img, staticFile} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–20    Logo scales in 0.7→1.0 with spring
  f20–60   Logo settles with subtle bounce
  f30–50   "Zynergia" text fades in + slides up
  f50–70   Subtitle fades in + slides up
  f70–90   Blue underline draws left→right under subtitle
  f90–120  Hold

  CAMERA: none (clean center composition)
*/

// ── Main Scene ──

export const Scene08ZynergiaIntro = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Logo: spring scale 0.7 → 1.0 ──
  const logoSpring = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 80,
      mass: 0.9,
    },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.7, 1]);
  const logoOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Title: "Zynergia" ──
  const titleStart = 30;
  const titleSpring = spring({
    frame: frame - titleStart,
    fps,
    config: {damping: 14, stiffness: 100, mass: 0.7},
  });
  const titleOpacity = interpolate(frame, [titleStart, titleStart + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);

  // ── Subtitle: "Tu sistema de seguimiento automático" ──
  const subStart = 50;
  const subSpring = spring({
    frame: frame - subStart,
    fps,
    config: {damping: 14, stiffness: 100, mass: 0.7},
  });
  const subOpacity = interpolate(frame, [subStart, subStart + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subY = interpolate(subSpring, [0, 1], [40, 0]);

  // ── Underline draw animation ──
  const underlineStart = 70;
  const underlineProgress = interpolate(frame, [underlineStart, underlineStart + 20], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
      }}
    >
      {/* Centered content block */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            transformOrigin: 'center center',
            marginBottom: 48,
          }}
        >
          <Img
            src={staticFile('zynergia-logo.png')}
            style={{
              width: 400,
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Title: Zynergia */}
        {frame >= titleStart && (
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              fontFamily: font.family,
              fontWeight: font.bold,
              fontSize: 72,
              color: colors.dark,
              letterSpacing: -1.5,
              lineHeight: 1.1,
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            Zynergia
          </div>
        )}

        {/* Subtitle + underline */}
        {frame >= subStart && (
          <div
            style={{
              opacity: subOpacity,
              transform: `translateY(${subY}px)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontFamily: font.family,
                fontWeight: font.medium,
                fontSize: 38,
                color: colors.muted,
                letterSpacing: -0.5,
                lineHeight: 1.3,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              Tu sistema de seguimiento automático
            </div>

            {/* Animated underline */}
            <div
              style={{
                marginTop: 20,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.blue,
                width: `${underlineProgress}%`,
                maxWidth: 620,
                alignSelf: 'center',
              }}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
