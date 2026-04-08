import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–30    First reminder node appears
  f30–60   Line extends, second reminder appears
  f60–90   Second reminder fully in
  f90–120  Hold

  LAYOUT: Vertical timeline on left side, labels to the right (big)
*/

const NODE_SIZE = 56;
const NODE_GAP = 380;
const TIMELINE_X = 280;
const TOTAL_HEIGHT = 3 * NODE_GAP;
const START_Y = (1920 - TOTAL_HEIGHT) / 2;

const NODES = [
  {label: 'Compra registrada', isReminder: false},
  {label: 'Recordatorio -7 días', isReminder: true},
  {label: 'Recordatorio -3 días', isReminder: true},
  {label: 'Recompra', isReminder: false},
];

export const Scene20AutomaticReminders = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Static endpoints ──
  const endpointOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── First reminder ──
  const rem1Spring = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: {damping: 12, stiffness: 140, mass: 0.5},
  });
  const rem1LabelOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const line1Progress = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Second reminder ──
  const rem2Spring = spring({
    frame: Math.max(0, frame - 35),
    fps,
    config: {damping: 12, stiffness: 140, mass: 0.5},
  });
  const rem2LabelOpacity = interpolate(frame, [45, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const line2Progress = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const line3Progress = interpolate(frame, [55, 75], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const recompraSpring = spring({
    frame: Math.max(0, frame - 65),
    fps,
    config: {damping: 14, stiffness: 100, mass: 0.6},
  });

  const nodeScales = [1, rem1Spring, rem2Spring, recompraSpring];
  const lineProgresses = [line1Progress, line2Progress, line3Progress];

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>

      {/* ── Connecting lines ── */}
      {NODES.slice(0, -1).map((_, i) => {
        const fromY = START_Y + i * NODE_GAP + NODE_SIZE / 2;
        const lineHeight = (NODE_GAP - NODE_SIZE) * lineProgresses[i];
        const isReminderLine = i === 0 || i === 1;

        return (
          <div
            key={`line-${i}`}
            style={{
              position: 'absolute',
              left: TIMELINE_X,
              top: fromY,
              transform: 'translateX(-50%)',
              width: 6,
              height: lineHeight,
              backgroundColor: isReminderLine ? colors.blue : '#E2E8F0',
              opacity: isReminderLine ? 0.35 : 0.2,
              borderRadius: 3,
            }}
          />
        );
      })}

      {/* ── Nodes + labels ── */}
      {NODES.map((node, i) => {
        const yPos = START_Y + i * NODE_GAP;
        const scale = i === 0 ? endpointOpacity : nodeScales[i];
        const nodeColor = node.isReminder ? colors.blue : '#94A3B8';
        const nodeShadow = node.isReminder
          ? '0 0 32px rgba(0,74,254,0.4)'
          : '0 0 12px rgba(0,0,0,0.08)';
        const labelOpacity = i === 0
          ? endpointOpacity
          : i === 1
            ? rem1LabelOpacity
            : i === 2
              ? rem2LabelOpacity
              : interpolate(frame, [70, 85], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

        const actualSize = node.isReminder ? NODE_SIZE : NODE_SIZE - 12;

        return (
          <div key={node.label}>
            {/* Node circle */}
            <div
              style={{
                position: 'absolute',
                left: TIMELINE_X,
                top: yPos,
                transform: `translate(-50%, -50%) scale(${scale})`,
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: actualSize,
                  height: actualSize,
                  borderRadius: actualSize / 2,
                  backgroundColor: nodeColor,
                  boxShadow: nodeShadow,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Bell icon for reminder nodes */}
                {node.isReminder && (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>

            {/* Label — to the right of node */}
            <div
              style={{
                position: 'absolute',
                left: TIMELINE_X + NODE_SIZE / 2 + 32,
                top: yPos,
                transform: 'translateY(-50%)',
                opacity: labelOpacity,
              }}
            >
              <div
                style={{
                  fontFamily: font.family,
                  fontWeight: node.isReminder ? font.bold : font.semi,
                  fontSize: node.isReminder ? 48 : 42,
                  color: node.isReminder ? colors.blue : '#94A3B8',
                  letterSpacing: -0.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {node.label}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── "30 días" badge — top center ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: START_Y - 200,
          transform: 'translate(-50%, 0)',
          opacity: endpointOpacity,
          backgroundColor: 'rgba(0,74,254,0.06)',
          borderRadius: 22,
          padding: '18px 44px',
        }}
      >
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 50,
            color: colors.blue,
            letterSpacing: -0.5,
          }}
        >
          30 días
        </div>
      </div>
    </AbsoluteFill>
  );
};
