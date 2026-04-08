import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

export const Scene01MessagesStart = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Camera: subtle zoom 1 → 1.05 over full scene ──
  const cameraScale = interpolate(frame, [0, 120], [1, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Bubble entry: spring slide from left ──
  // Starts at frame 15, uses spring for organic overshoot
  const slideProgress = spring({
    frame: frame - 15,
    fps,
    config: {
      damping: 11,
      stiffness: 80,
      mass: 0.8,
    },
  });

  // Translate from far left (-600) to resting position (0)
  const bubbleX = interpolate(slideProgress, [0, 1], [-600, 0]);

  // Opacity snaps in fast (not a slow fade)
  const bubbleOpacity = interpolate(frame, [15, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtle shadow depth: intensifies as bubble arrives
  const shadowSpread = interpolate(slideProgress, [0, 1], [4, 20]);
  const shadowOpacity = interpolate(slideProgress, [0, 1], [0.02, 0.08]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        transform: `scale(${cameraScale})`,
        transformOrigin: 'center center',
      }}
    >
      {/* Chat bubble — positioned left-center of frame */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 820,
          opacity: bubbleOpacity,
          transform: `translateX(${bubbleX}px)`,
          willChange: 'transform',
        }}
      >
        <div
          style={{
            width: 620,
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: '32px 32px 32px 6px',
            padding: '36px 42px',
            boxShadow: `0 ${shadowSpread * 0.4}px ${shadowSpread}px rgba(0,0,0,${shadowOpacity})`,
          }}
        >
          {/* Sender name */}
          <div
            style={{
              fontFamily: font.family,
              fontWeight: font.bold,
              fontSize: 30,
              color: colors.blue,
              marginBottom: 14,
              letterSpacing: -0.3,
            }}
          >
            Carlos
          </div>

          {/* Message text */}
          <div
            style={{
              fontFamily: font.family,
              fontWeight: font.regular,
              fontSize: 34,
              color: colors.dark,
              lineHeight: 1.45,
              letterSpacing: -0.2,
            }}
          >
            ¿Qué te pareció el producto?
          </div>

          {/* Timestamp — subtle detail */}
          <div
            style={{
              fontFamily: font.family,
              fontWeight: font.regular,
              fontSize: 20,
              color: '#94A3B8',
              marginTop: 16,
              textAlign: 'right',
            }}
          >
            10:32 AM
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
