import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–40    First line fades in + slides up
  f40–80   Second line fades in + slides up
  f80–120  Blue underline draws beneath second line

  LAYOUT: Two lines centered on white bg — same style as Scene17
*/

export const Scene22ReorderMessageFinal = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── First line ──
  const line1Spring = spring({
    frame,
    fps,
    config: {damping: 16, stiffness: 100, mass: 0.7},
  });
  const line1Opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line1Y = interpolate(line1Spring, [0, 1], [40, 0]);

  // ── Second line ──
  const line2Spring = spring({
    frame: Math.max(0, frame - 40),
    fps,
    config: {damping: 16, stiffness: 100, mass: 0.7},
  });
  const line2Opacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line2Y = interpolate(line2Spring, [0, 1], [40, 0]);

  // ── Underline draws ──
  const underlineProgress = interpolate(frame, [80, 115], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 36,
        }}
      >
        {/* First line */}
        <div
          style={{
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px)`,
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 64,
            color: colors.dark,
            letterSpacing: -1.5,
            lineHeight: 1.2,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          Nunca pierdas una recompra.
        </div>

        {/* Second line + underline */}
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
              fontWeight: font.semi,
              fontSize: 56,
              color: colors.muted,
              letterSpacing: -1,
              lineHeight: 1.3,
              textAlign: 'center',
              paddingBottom: 14,
              whiteSpace: 'nowrap',
            }}
          >
            Zynergia lo recuerda por ti.
          </div>

          {/* Blue underline */}
          <div
            style={{
              width: 580,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.blue,
              transformOrigin: 'left center',
              transform: `scaleX(${underlineProgress})`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
