import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Easing} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 60 frames = 2s)
  f0–20    Text blocks begin moving toward screen center (translateY)
  f20–42   Characters scale down to near-zero
  f38–60   Blue circle (24px) springs in at center — letters "merge"

  TECHNIQUE
    Both text blocks live in a flex-centered full-screen container.
    Scaling the container with transformOrigin:center collapses all text
    toward a single vanishing point at the screen center.
    The 24px dot then pops in at that exact same point via spring.
*/

const BLUE = '#004AFE';
const DOT = 24;

export const Scene33TextCollapse = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Text container collapse ──
  // Scale 1→~0 over f0–42, ease-in (accelerating collapse)
  const containerScale = interpolate(frame, [0, 42], [1, 0.012], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.ease),
  });

  // Text opacity fades out slightly ahead of full scale-down
  const textOpacity = interpolate(frame, [18, 40], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.ease),
  });

  // ── Blue dot ──
  const dotSp = spring({
    frame: Math.max(0, frame - 38),
    fps,
    config: {damping: 14, stiffness: 220, mass: 0.35},
  });
  const dotScale   = frame >= 38 ? interpolate(dotSp, [0, 1], [0, 1]) : 0;
  const dotOpacity = interpolate(frame, [38, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>

      {/* ── Text blocks — collapse toward screen center ── */}
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
          transform: `scale(${containerScale})`,
          transformOrigin: 'center center',
          opacity: textOpacity,
        }}
      >
        {/* First block */}
        <div style={{textAlign: 'center'}}>
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

        {/* "Paso a paso." with underline already drawn */}
        <div
          style={{
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
          <div style={{height: 6, borderRadius: 3, backgroundColor: BLUE}} />
        </div>
      </div>

      {/* ── Blue dot — appears as text vanishes ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${dotScale})`,
          opacity: dotOpacity,
        }}
      >
        <div
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: BLUE,
            boxShadow: `0 0 12px ${BLUE}66`,
          }}
        />
      </div>

    </AbsoluteFill>
  );
};
