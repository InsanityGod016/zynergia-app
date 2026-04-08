import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–20    Layout appears: roadmap left + task cards right
  f20–50   Checkbox circle on Día 3 card gets "pressed" (scale pulse)
  f50–65   Checkmark appears inside circle, card glows
  f65–90   "1 tarea completada" label fades in at top
  f90–120  Hold

  LAYOUT:
  - Roadmap (small) on left
  - Each node has a mini task card to its right
  - Día 3 card is bigger/highlighted with checkbox circle
  - Other cards are small, faded, incomplete
*/

const NODES = [
  {label: 'Día 0', task: 'Primer contacto'},
  {label: 'Día 3', task: 'Seguimiento Carlos'},
  {label: 'Día 7', task: 'Seguimiento Ana'},
  {label: 'Día 12', task: 'Revisión producto'},
  {label: 'Día 18', task: 'Cierre propuesta'},
  {label: 'Día 25', task: 'Follow-up final'},
];

const ACTIVE_INDEX = 1;
const NODE_SIZE = 28;
const NODE_GAP = 220;
const LINE_WIDTH = 4;
const ROADMAP_HEIGHT = (NODES.length - 1) * NODE_GAP;
const START_Y = (1920 - ROADMAP_HEIGHT) / 2;
const ROADMAP_X = 160;

export const Scene16TaskCompleted = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Layout fade in ──
  const layoutOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Checkbox press animation ──
  const pressScale = interpolate(frame, [20, 35, 50], [1, 0.85, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Checkmark appears ──
  const checkSpring = spring({
    frame: Math.max(0, frame - 48),
    fps,
    config: {damping: 10, stiffness: 160, mass: 0.4},
  });

  // ── Card glow after check ──
  const glowOpacity = interpolate(frame, [50, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── "1 tarea completada" label ──
  const labelStart = 65;
  const labelSpring = spring({
    frame: Math.max(0, frame - labelStart),
    fps,
    config: {damping: 14, stiffness: 120, mass: 0.6},
  });
  const labelOpacity = interpolate(frame, [labelStart, labelStart + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelY = interpolate(labelSpring, [0, 1], [24, 0]);

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, opacity: layoutOpacity}}>

      {/* ── Roadmap lines ── */}
      {NODES.slice(0, -1).map((_, i) => {
        const fromY = START_Y + i * NODE_GAP + NODE_SIZE / 2;
        const isNear = i === ACTIVE_INDEX - 1 || i === ACTIVE_INDEX;
        return (
          <div
            key={`line-${i}`}
            style={{
              position: 'absolute',
              left: ROADMAP_X,
              top: fromY,
              transform: 'translateX(-50%)',
              width: isNear ? LINE_WIDTH : LINE_WIDTH - 1,
              height: NODE_GAP - NODE_SIZE,
              backgroundColor: isNear ? colors.blue : '#E2E8F0',
              opacity: isNear ? 0.5 : 0.12,
              borderRadius: 2,
            }}
          />
        );
      })}

      {/* ── Roadmap nodes + task cards ── */}
      {NODES.map((node, i) => {
        const isActive = i === ACTIVE_INDEX;
        const yPos = START_Y + i * NODE_GAP;
        const nodeColor = isActive ? colors.blue : '#E2E8F0';
        const nodeScale = isActive ? 1.3 : 1;
        const nodeShadow = isActive ? `0 0 20px rgba(0,74,254,${0.2 + glowOpacity * 0.3})` : 'none';

        // Card dimensions
        const cardWidth = isActive ? 560 : 380;
        const cardPadY = isActive ? 36 : 20;
        const cardPadX = isActive ? 36 : 24;
        const cardOpacity = isActive ? 1 : 0.35;
        const cardBorder = isActive
          ? `2px solid rgba(0,74,254,${0.15 + glowOpacity * 0.25})`
          : '1px solid rgba(0,0,0,0.05)';
        const cardShadow = isActive
          ? `0 12px 40px rgba(0,74,254,${0.06 + glowOpacity * 0.1})`
          : '0 2px 8px rgba(0,0,0,0.03)';

        return (
          <div key={node.label}>
            {/* Node circle */}
            <div
              style={{
                position: 'absolute',
                left: ROADMAP_X,
                top: yPos,
                transform: `translate(-50%, -50%) scale(${nodeScale})`,
                width: NODE_SIZE,
                height: NODE_SIZE,
                borderRadius: NODE_SIZE / 2,
                backgroundColor: nodeColor,
                boxShadow: nodeShadow,
                zIndex: 2,
              }}
            />

            {/* Task card */}
            <div
              style={{
                position: 'absolute',
                left: ROADMAP_X + 50,
                top: yPos,
                transform: 'translateY(-50%)',
                opacity: cardOpacity,
                width: cardWidth,
              }}
            >
              <div
                style={{
                  backgroundColor: colors.white,
                  border: cardBorder,
                  borderRadius: isActive ? 24 : 16,
                  padding: `${cardPadY}px ${cardPadX}px`,
                  boxShadow: cardShadow,
                  display: 'flex',
                  alignItems: 'center',
                  gap: isActive ? 24 : 16,
                }}
              >
                {/* Checkbox circle */}
                <div
                  style={{
                    width: isActive ? 44 : 28,
                    height: isActive ? 44 : 28,
                    borderRadius: isActive ? 22 : 14,
                    border: isActive
                      ? `2.5px solid ${colors.blue}`
                      : '2px solid #D1D5DB',
                    backgroundColor: isActive && checkSpring > 0.5
                      ? colors.blue
                      : 'transparent',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isActive ? `scale(${pressScale})` : 'none',
                    transition: 'background-color 0.1s',
                  }}
                >
                  {/* Checkmark inside */}
                  {isActive && (
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{
                        opacity: checkSpring,
                        transform: `scale(${checkSpring})`,
                      }}
                    >
                      <path
                        d="M5 13L10 18L20 6"
                        stroke="white"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>

                {/* Card text */}
                <div>
                  <div
                    style={{
                      fontFamily: font.family,
                      fontWeight: isActive ? font.semi : font.medium,
                      fontSize: isActive ? 26 : 20,
                      color: isActive ? colors.blue : '#94A3B8',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      marginBottom: isActive ? 8 : 4,
                    }}
                  >
                    {node.label}
                  </div>
                  <div
                    style={{
                      fontFamily: font.family,
                      fontWeight: isActive ? font.bold : font.regular,
                      fontSize: isActive ? 38 : 24,
                      color: isActive ? colors.dark : '#CBD5E1',
                      letterSpacing: -0.3,
                      lineHeight: 1.2,
                      textDecoration: isActive && checkSpring > 0.5
                        ? 'none'
                        : 'none',
                    }}
                  >
                    {node.task}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── "1 tarea completada" label — top center ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: START_Y - 140,
          transform: `translate(-50%, 0) translateY(${labelY}px)`,
          opacity: labelOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          backgroundColor: 'rgba(0,74,254,0.06)',
          borderRadius: 20,
          padding: '18px 40px',
        }}
      >
        {/* Check icon */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill={colors.blue} />
          <path d="M7 12.5L10.5 16L17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span
          style={{
            fontFamily: font.family,
            fontWeight: font.semi,
            fontSize: 32,
            color: colors.blue,
            letterSpacing: 0.3,
          }}
        >
          1 tarea completada
        </span>
      </div>
    </AbsoluteFill>
  );
};
