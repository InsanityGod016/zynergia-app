import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 60 frames = 2s)
  f0–20    Button scales down (tap press)   1 → 0.95
  f20–40   Button scales up (bounce)        0.95 → 1.05
  f40–60   Button returns to normal          1.05 → 1
  f45–60   Card fades out quickly

  LAYOUT: Continues from Scene12 final state
  - Roadmap shrunk (scale 0.7) and shifted left (-400)
  - Task card visible, aligned with Día 3 node
*/

const NODES = [
  {label: 'Día 0'},
  {label: 'Día 3'},
  {label: 'Día 7'},
  {label: 'Día 12'},
  {label: 'Día 18'},
  {label: 'Día 25'},
];

const ACTIVE_INDEX = 1;
const NODE_SIZE = 36;
const NODE_GAP = 260;
const LINE_WIDTH = 5;
const ROADMAP_HEIGHT = (NODES.length - 1) * NODE_GAP;
const START_Y = (1920 - ROADMAP_HEIGHT) / 2;

const SHIFT_X = -400;
const ROADMAP_SCALE = 0.7;

// ── Roadmap node (static, final state from Scene12) ──

const RoadmapNode = ({label, isActive, yPos}) => {
  const baseNodeScale = isActive ? 1.5 : 0.8;
  const nodeColor = isActive ? colors.blue : '#E2E8F0';
  const labelColor = isActive ? colors.blue : '#CBD5E1';
  const nodeOpacity = isActive ? 0.7 : 0.25;
  const nodeShadow = isActive ? '0 0 24px rgba(0,74,254,0.35)' : 'none';

  return (
    <div
      style={{
        position: 'absolute',
        left: 540 + SHIFT_X,
        top: yPos,
        transform: `translate(-50%, -50%) scale(${ROADMAP_SCALE})`,
        transformOrigin: 'left center',
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        opacity: nodeOpacity,
      }}
    >
      <div
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          borderRadius: NODE_SIZE / 2,
          backgroundColor: nodeColor,
          transform: `scale(${baseNodeScale})`,
          boxShadow: nodeShadow,
          flexShrink: 0,
        }}
      />
      <div
        style={{
          fontFamily: font.family,
          fontWeight: isActive ? font.bold : font.regular,
          fontSize: isActive ? 48 : 36,
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

// ── Connecting line (static) ──

const ConnectingLine = ({fromIndex, isActiveSegment}) => {
  const fromY = START_Y + fromIndex * NODE_GAP + NODE_SIZE / 2;
  const lineHeight = (NODE_GAP - NODE_SIZE) * ROADMAP_SCALE;
  const lineOpacity = isActiveSegment ? 0.6 : 0.08;
  const lineColor = isActiveSegment ? colors.blue : '#E2E8F0';
  const lineW = isActiveSegment ? LINE_WIDTH : LINE_WIDTH - 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: 540 + SHIFT_X,
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

export const Scene13ButtonPress = () => {
  const frame = useCurrentFrame();

  // ── Button tap animation ──
  const btnScale = interpolate(
    frame,
    [0, 20, 40, 60],
    [1, 0.95, 1.05, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  // ── Card fade out after press ──
  const cardOpacity = interpolate(frame, [45, 60], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const activeNodeY = START_Y + ACTIVE_INDEX * NODE_GAP;

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      {/* Roadmap — lines (static final state) */}
      {NODES.slice(0, -1).map((_, i) => {
        const isActiveSegment = i === ACTIVE_INDEX - 1 || i === ACTIVE_INDEX;
        return (
          <ConnectingLine
            key={`line-${i}`}
            fromIndex={i}
            isActiveSegment={isActiveSegment}
          />
        );
      })}

      {/* Roadmap — nodes (static final state) */}
      {NODES.map((node, i) => (
        <RoadmapNode
          key={node.label}
          label={node.label}
          isActive={i === ACTIVE_INDEX}
          yPos={START_Y + i * NODE_GAP}
        />
      ))}

      {/* Task card — same position as Scene12 final state */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: activeNodeY,
          transform: 'translate(-30%, -50%)',
          opacity: cardOpacity,
          willChange: 'transform, opacity',
        }}
      >
        <div
          style={{
            width: 580,
            backgroundColor: colors.white,
            border: `1.5px solid ${colors.cardBorder}`,
            borderRadius: 36,
            padding: '56px 52px',
            boxShadow: '0 20px 64px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {/* Tag */}
          <div
            style={{
              fontFamily: font.family,
              fontWeight: font.semi,
              fontSize: 26,
              color: colors.blue,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 18,
            }}
          >
            Día 3
          </div>

          {/* Title */}
          <div
            style={{
              fontFamily: font.family,
              fontWeight: font.bold,
              fontSize: 50,
              color: colors.dark,
              letterSpacing: -0.8,
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            Seguimiento Carlos
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontFamily: font.family,
              fontWeight: font.regular,
              fontSize: 30,
              color: colors.muted,
              lineHeight: 1.4,
              marginBottom: 44,
            }}
          >
            Prospecto producto
          </div>

          {/* Button — WhatsApp green with tap animation */}
          <div
            style={{
              transform: `scale(${btnScale})`,
              transformOrigin: 'center center',
            }}
          >
            <div
              style={{
                backgroundColor: colors.green,
                borderRadius: 20,
                padding: '26px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                boxShadow: '0 8px 32px rgba(37,211,102,0.35)',
              }}
            >
              {/* WhatsApp icon */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              </svg>
              <span
                style={{
                  fontFamily: font.family,
                  fontWeight: font.bold,
                  fontSize: 34,
                  color: colors.white,
                  letterSpacing: -0.3,
                }}
              >
                Enviar mensaje
              </span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
