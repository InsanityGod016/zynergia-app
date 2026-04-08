import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 210 frames = 7s)
  f0–30    Node "Día 0" appears
  f30–60   Line draws down → Node "Día 3" appears
  f60–90   Line draws down → Node "Día 7" appears
  f90–120  Line draws down → Node "Día 12" appears
  f120–150 Line draws down → Node "Día 18" appears
  f150–180 Line draws down → Node "Día 25" appears
  f180–210 Hold

  LAYOUT: vertical roadmap centered on screen
*/

const NODES = [
  {label: 'Día 0', frame: 0},
  {label: 'Día 3', frame: 30},
  {label: 'Día 7', frame: 60},
  {label: 'Día 12', frame: 90},
  {label: 'Día 18', frame: 120},
  {label: 'Día 25', frame: 150},
];

const NODE_SIZE = 36;
const NODE_GAP = 260; // vertical distance between node centers
const LINE_WIDTH = 5;

// Total roadmap height
const ROADMAP_HEIGHT = (NODES.length - 1) * NODE_GAP;
const START_Y = (1920 - ROADMAP_HEIGHT) / 2; // vertically centered

// ── Single roadmap node ──

const RoadmapNode = ({label, startFrame, index, frame, fps}) => {
  const nodeSpring = spring({
    frame: frame - startFrame,
    fps,
    config: {damping: 10, stiffness: 160, mass: 0.5},
  });

  const nodeScale = frame >= startFrame ? interpolate(nodeSpring, [0, 1], [0, 1]) : 0;
  const nodeOpacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Label slides in from left
  const labelSpring = spring({
    frame: frame - (startFrame + 5),
    fps,
    config: {damping: 14, stiffness: 100, mass: 0.6},
  });
  const labelX = frame >= startFrame + 5 ? interpolate(labelSpring, [0, 1], [-30, 0]) : -30;
  const labelOpacity = interpolate(frame, [startFrame + 5, startFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const yPos = START_Y + index * NODE_GAP;

  return (
    <div
      style={{
        position: 'absolute',
        left: 540, // canvas center X
        top: yPos,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 36,
      }}
    >
      {/* Node circle */}
      <div
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          borderRadius: NODE_SIZE / 2,
          backgroundColor: colors.blue,
          transform: `scale(${nodeScale})`,
          opacity: nodeOpacity,
          boxShadow: '0 0 24px rgba(0,74,254,0.35)',
          flexShrink: 0,
        }}
      />

      {/* Label */}
      <div
        style={{
          opacity: labelOpacity,
          transform: `translateX(${labelX}px)`,
          fontFamily: font.family,
          fontWeight: font.semi,
          fontSize: 48,
          color: colors.dark,
          letterSpacing: -0.5,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </div>
  );
};

// ── Connecting line between two nodes ──

const ConnectingLine = ({fromIndex, startFrame, frame}) => {
  const drawProgress = interpolate(frame, [startFrame, startFrame + 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (drawProgress <= 0) return null;

  const fromY = START_Y + fromIndex * NODE_GAP + NODE_SIZE / 2;
  const lineHeight = (NODE_GAP - NODE_SIZE) * drawProgress;

  return (
    <div
      style={{
        position: 'absolute',
        left: 540,
        top: fromY,
        transform: 'translateX(-50%)',
        width: LINE_WIDTH,
        height: lineHeight,
        backgroundColor: colors.blue,
        opacity: 0.35,
        borderRadius: LINE_WIDTH / 2,
      }}
    />
  );
};

// ── Main Scene ──

export const Scene10FollowUpRoadmap = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Title: "Seguimiento automático" ──
  const titleSpring = spring({
    frame,
    fps,
    config: {damping: 14, stiffness: 100, mass: 0.8},
  });
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
      }}
    >
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: START_Y - 120,
          transform: `translate(-50%, 0) translateY(${titleY}px)`,
          opacity: titleOpacity,
          fontFamily: font.family,
          fontWeight: font.bold,
          fontSize: 58,
          color: colors.muted,
          letterSpacing: -0.5,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        Seguimiento automático
      </div>

      {/* Connecting lines — draw between consecutive nodes */}
      {NODES.slice(0, -1).map((node, i) => (
        <ConnectingLine
          key={`line-${i}`}
          fromIndex={i}
          startFrame={node.frame + 15}
          frame={frame}
        />
      ))}

      {/* Roadmap nodes */}
      {NODES.map((node, i) => (
        <RoadmapNode
          key={node.label}
          label={node.label}
          startFrame={node.frame}
          index={i}
          frame={frame}
          fps={fps}
        />
      ))}
    </AbsoluteFill>
  );
};
