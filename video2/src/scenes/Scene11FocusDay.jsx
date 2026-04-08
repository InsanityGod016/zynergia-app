import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–40    Roadmap shifts left with spring, making space on right
  f40–80   "Día 3" node highlights: scale bounce 1→1.25→1.1, other nodes go gray
  f80–120  Line connected to Día 3 brightens, hold

  LAYOUT: vertical roadmap, shifted left of center
*/

const NODES = [
  {label: 'Día 0'},
  {label: 'Día 3'},
  {label: 'Día 7'},
  {label: 'Día 12'},
  {label: 'Día 18'},
  {label: 'Día 25'},
];

const ACTIVE_INDEX = 1; // "Día 3"

const NODE_SIZE = 36;
const NODE_GAP = 260;
const LINE_WIDTH = 5;

const ROADMAP_HEIGHT = (NODES.length - 1) * NODE_GAP;
const START_Y = (1920 - ROADMAP_HEIGHT) / 2;

// ── Single roadmap node ──

const RoadmapNode = ({label, index, isActive, activeProgress, dimProgress, yPos, shiftX}) => {
  // Active node: spring scale bounce — much bigger
  const nodeScale = isActive
    ? interpolate(activeProgress, [0, 0.5, 1], [1, 1.8, 1.5])
    : interpolate(dimProgress, [0, 1], [1, 0.8]);

  // Color: active = blue, inactive = very faded gray
  const nodeColor = isActive
    ? colors.blue
    : interpolate(dimProgress, [0, 1], [0, 1]) > 0.5
      ? '#E2E8F0'
      : colors.blue;

  const labelColor = isActive
    ? colors.blue
    : interpolate(dimProgress, [0, 1], [0, 1]) > 0.5
      ? '#CBD5E1'
      : colors.dark;

  const nodeOpacity = isActive ? 1 : interpolate(dimProgress, [0, 1], [1, 0.4]);

  const nodeShadow = isActive
    ? `0 0 ${40 * activeProgress}px rgba(0,74,254,0.55)`
    : 'none';

  return (
    <div
      style={{
        position: 'absolute',
        left: 540 + shiftX,
        top: yPos,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 36,
        opacity: nodeOpacity,
      }}
    >
      {/* Node circle */}
      <div
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          borderRadius: NODE_SIZE / 2,
          backgroundColor: nodeColor,
          transform: `scale(${nodeScale})`,
          boxShadow: nodeShadow,
          flexShrink: 0,
          willChange: 'transform',
        }}
      />

      {/* Label */}
      <div
        style={{
          fontFamily: font.family,
          fontWeight: isActive ? font.bold : font.regular,
          fontSize: isActive ? 64 : 44,
          color: labelColor,
          letterSpacing: -0.5,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </div>
  );
};

// ── Connecting line ──

const ConnectingLine = ({fromIndex, isActiveSegment, lineGlowProgress, shiftX}) => {
  const fromY = START_Y + fromIndex * NODE_GAP + NODE_SIZE / 2;
  const lineHeight = NODE_GAP - NODE_SIZE;

  const lineOpacity = isActiveSegment
    ? interpolate(lineGlowProgress, [0, 1], [0.35, 1])
    : 0.12;

  const lineColor = isActiveSegment ? colors.blue : '#E2E8F0';
  const lineW = isActiveSegment
    ? interpolate(lineGlowProgress, [0, 1], [LINE_WIDTH, LINE_WIDTH + 2])
    : LINE_WIDTH;

  return (
    <div
      style={{
        position: 'absolute',
        left: 540 + shiftX,
        top: fromY,
        transform: 'translateX(-50%)',
        width: lineW,
        height: lineHeight,
        backgroundColor: lineColor,
        opacity: lineOpacity,
        borderRadius: lineW / 2,
      }}
    />
  );
};

// ── Main Scene ──

export const Scene11FocusDay = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Roadmap shifts left: spring 0 → -160px ──
  const shiftSpring = spring({
    frame,
    fps,
    config: {damping: 16, stiffness: 60, mass: 1.0},
  });
  const shiftX = interpolate(shiftSpring, [0, 1], [0, -280]);

  // ── Dim inactive nodes: f40–60 ──
  const dimProgress = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Active node highlight: spring at f40 ──
  const activeSpring = spring({
    frame: frame - 40,
    fps,
    config: {damping: 8, stiffness: 140, mass: 0.6},
  });
  const activeProgress = frame >= 40 ? activeSpring : 0;

  // ── Line glow: f80–100 ──
  const lineGlowProgress = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Title: fade out completely ──
  const titleOpacity = interpolate(frame, [0, 15], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
          transform: `translate(calc(-50% + ${shiftX}px), 0)`,
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

      {/* Connecting lines */}
      {NODES.slice(0, -1).map((_, i) => {
        // Segment between i and i+1 is "active" if it connects to the active node
        const isActiveSegment = i === ACTIVE_INDEX - 1 || i === ACTIVE_INDEX;
        return (
          <ConnectingLine
            key={`line-${i}`}
            fromIndex={i}
            isActiveSegment={isActiveSegment}
            lineGlowProgress={isActiveSegment ? lineGlowProgress : 0}
            shiftX={shiftX}
          />
        );
      })}

      {/* Roadmap nodes */}
      {NODES.map((node, i) => (
        <RoadmapNode
          key={node.label}
          label={node.label}
          index={i}
          isActive={i === ACTIVE_INDEX}
          activeProgress={activeProgress}
          dimProgress={dimProgress}
          yPos={START_Y + i * NODE_GAP}
          shiftX={shiftX}
        />
      ))}
    </AbsoluteFill>
  );
};
