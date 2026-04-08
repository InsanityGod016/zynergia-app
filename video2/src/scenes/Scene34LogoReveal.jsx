import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Img, staticFile, Easing} from 'remotion';

/*
  TIMELINE (30fps, 60 frames = 2s)
  f0–20    Blue circle (24px dot) scales up, still circular
  f20–40   Border radius morphs 50% → 20% (circle → app icon shape)
           Logo image cross-fades in over the blue background
  f40–60   Spring settle — slight overshoot then rest at 420px

  TECHNIQUE
    Container starts as the exact same 24px blue circle from Scene33.
    Growing size + border-radius transition gives the "morphing" feel.
    logo.png (blue bg) sits inside; opacity 0→1 during the morph phase.
*/

const BLUE = '#004AFE';
const DOT_SIZE  = 24;
const LOGO_SIZE = 420;

export const Scene34LogoReveal = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Phase 1 (f0–20): pure blue circle grows ──
  const growProgress = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const baseSize = interpolate(growProgress, [0, 1], [DOT_SIZE, LOGO_SIZE * 0.72]);

  // ── Phase 2 (f20–40): morph circle → rounded square, reach full size ──
  const morphProgress = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  const containerSize    = frame < 20 ? baseSize : interpolate(morphProgress, [0, 1], [baseSize, LOGO_SIZE]);
  const borderRadiusPct  = interpolate(frame, [12, 40], [50, 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  // Logo cross-fade during morph
  const logoOpacity = interpolate(frame, [22, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Phase 3 (f40–60): spring settle ──
  const settleSp = spring({
    frame: Math.max(0, frame - 38),
    fps,
    config: {damping: 10, stiffness: 160, mass: 0.5},
  });
  const settleScale = frame >= 38 ? interpolate(settleSp, [0, 1], [0.88, 1]) : 1;

  return (
    <AbsoluteFill style={{backgroundColor: '#ffffff'}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${settleScale})`,
        }}
      >
        {/* Container: starts as blue circle, morphs into app icon */}
        <div
          style={{
            width: containerSize,
            height: containerSize,
            borderRadius: `${borderRadiusPct}%`,
            backgroundColor: BLUE,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 16px 56px ${BLUE}38`,
          }}
        >
          <Img
            src={staticFile('logo.png')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: logoOpacity,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
