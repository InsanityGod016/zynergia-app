import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–40    Line draws left to right
  f40–70   Left + right nodes scale in
  f50–80   Node labels fade in
  f80–110  "30 días" fades in above center
  f110–120 Hold

  LAYOUT: Horizontal timeline centered, two nodes with labels
*/

const NODE_SIZE = 44;
const LINE_LENGTH = 820;
const CENTER_X = 540; // 1080 / 2
const CENTER_Y = 960; // 1920 / 2
const LEFT_X = CENTER_X - LINE_LENGTH / 2;
const RIGHT_X = CENTER_X + LINE_LENGTH / 2;

export const Scene19ConsumptionTimeline = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Line draws left to right ──
  const lineProgress = interpolate(frame, [0, 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Left node ──
  const leftNodeSpring = spring({
    frame: Math.max(0, frame - 36),
    fps,
    config: {damping: 10, stiffness: 160, mass: 0.5},
  });

  // ── Right node ──
  const rightNodeSpring = spring({
    frame: Math.max(0, frame - 44),
    fps,
    config: {damping: 10, stiffness: 160, mass: 0.5},
  });

  // ── Node labels ──
  const leftLabelOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rightLabelOpacity = interpolate(frame, [58, 73], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── "30 días" text ──
  const daysSpring = spring({
    frame: Math.max(0, frame - 80),
    fps,
    config: {damping: 14, stiffness: 120, mass: 0.6},
  });
  const daysOpacity = interpolate(frame, [80, 95], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const daysY = interpolate(daysSpring, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>

      {/* ── Connecting line ── */}
      <div
        style={{
          position: 'absolute',
          left: LEFT_X,
          top: CENTER_Y,
          transform: 'translateY(-50%)',
          width: LINE_LENGTH * lineProgress,
          height: 5,
          backgroundColor: colors.blue,
          opacity: 0.3,
          borderRadius: 3,
        }}
      />

      {/* ── Dashed progress overlay ── */}
      <div
        style={{
          position: 'absolute',
          left: LEFT_X,
          top: CENTER_Y,
          transform: 'translateY(-50%)',
          width: LINE_LENGTH * lineProgress,
          height: 5,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: LINE_LENGTH,
            height: 5,
            background: `repeating-linear-gradient(90deg, ${colors.blue} 0px, ${colors.blue} 12px, transparent 12px, transparent 20px)`,
            opacity: 0.15,
          }}
        />
      </div>

      {/* ── Left node — "Compra registrada" ── */}
      <div
        style={{
          position: 'absolute',
          left: LEFT_X,
          top: CENTER_Y,
          transform: `translate(-50%, -50%) scale(${leftNodeSpring})`,
        }}
      >
        <div
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
            borderRadius: NODE_SIZE / 2,
            backgroundColor: colors.blue,
            boxShadow: '0 0 28px rgba(0,74,254,0.35)',
          }}
        />
      </div>

      {/* Left label */}
      <div
        style={{
          position: 'absolute',
          left: LEFT_X - NODE_SIZE / 2,
          top: CENTER_Y + 56,
          opacity: leftLabelOpacity,
          textAlign: 'left',
        }}
      >
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.semi,
            fontSize: 38,
            color: colors.dark,
            letterSpacing: -0.3,
            whiteSpace: 'nowrap',
          }}
        >
          Compra registrada
        </div>
      </div>

      {/* ── Right node — "Recompra" ── */}
      <div
        style={{
          position: 'absolute',
          left: RIGHT_X,
          top: CENTER_Y,
          transform: `translate(-50%, -50%) scale(${rightNodeSpring})`,
        }}
      >
        <div
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
            borderRadius: NODE_SIZE / 2,
            backgroundColor: colors.blue,
            boxShadow: '0 0 28px rgba(0,74,254,0.35)',
          }}
        />
      </div>

      {/* Right label */}
      <div
        style={{
          position: 'absolute',
          left: RIGHT_X,
          top: CENTER_Y + 56,
          transform: 'translateX(-50%)',
          opacity: rightLabelOpacity,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.semi,
            fontSize: 38,
            color: colors.dark,
            letterSpacing: -0.3,
            whiteSpace: 'nowrap',
          }}
        >
          Recompra
        </div>
      </div>

      {/* ── "30 días" — centered above the line ── */}
      <div
        style={{
          position: 'absolute',
          left: CENTER_X,
          top: CENTER_Y - 120,
          transform: `translate(-50%, 0) translateY(${daysY}px)`,
          opacity: daysOpacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 72,
            color: colors.blue,
            letterSpacing: -1,
          }}
        >
          30 días
        </div>
      </div>
    </AbsoluteFill>
  );
};
