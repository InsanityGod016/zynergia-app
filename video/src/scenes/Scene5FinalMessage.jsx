import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img} from 'remotion';
import {colors, font} from '../tokens';

const LINES = [
  {text: 'Organiza tu negocio.', color: colors.textPrimary},
  {text: 'Haz seguimiento a todos.', color: colors.textPrimary},
  {text: 'Crece tu red.', color: colors.blue},
];

export const Scene5FinalMessage = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Three lines stagger in (40 frames apart)
  const lineEntries = LINES.map((_, i) => {
    const start = i * 40;
    const opacity = interpolate(frame, [start, start + 30], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const translateY = interpolate(frame, [start, start + 30], [40, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {opacity, translateY};
  });

  // Lines fade out
  const linesFadeOut = interpolate(frame, [140, 180], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Logo entrance
  const logoScale = spring({
    frame: frame - 190,
    fps,
    config: {damping: 12, stiffness: 180},
  });
  const logoOpacity = interpolate(frame, [190, 210], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // "Zynergia" text
  const nameOpacity = interpolate(frame, [200, 230], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // CTA text
  const ctaOpacity = interpolate(frame, [250, 280], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Three staggered lines */}
      <div
        style={{
          opacity: linesFadeOut,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          position: 'absolute',
        }}
      >
        {LINES.map((line, i) => (
          <div
            key={line.text}
            style={{
              opacity: lineEntries[i].opacity,
              transform: `translateY(${lineEntries[i].translateY}px)`,
              fontFamily: font.family,
              fontWeight: font.bold,
              fontSize: 64,
              color: line.color,
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            {line.text}
          </div>
        ))}
      </div>

      {/* Logo + name + CTA */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {/* Logo */}
        <Img
          src={staticFile('logo.png')}
          style={{
            width: 120,
            height: 120,
            objectFit: 'contain',
          }}
        />

        {/* App name */}
        <div
          style={{
            opacity: nameOpacity,
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 72,
            color: colors.textPrimary,
          }}
        >
          Zynergia
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: ctaOpacity,
            fontFamily: font.family,
            fontWeight: font.semi,
            fontSize: 40,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: 10,
          }}
        >
          Empieza gratis
        </div>
      </div>
    </AbsoluteFill>
  );
};
