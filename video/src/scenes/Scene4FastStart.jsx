import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {colors, font} from '../tokens';
import {TimelineNode} from '../components/TimelineNode';

const PHASES = [
  {label: 'Q-Team', days: 'Días 1–30', bonus: '$1,900 MXN', color: colors.blue, icon: '👥', startOffset: 40},
  {label: 'Fast Start Nivel 1', days: 'Días 35–60', bonus: '$7,600 MXN', color: colors.purple, icon: '⭐', startOffset: 100},
  {label: 'Fast Start Nivel 2', days: 'Días 75–90', bonus: '$22,800 MXN', color: colors.amber, icon: '🏆', startOffset: 160},
  {label: 'X-Team', days: 'Días 110–120', bonus: '$2,850 MXN', color: colors.green, icon: '⚡', startOffset: 220},
];

export const Scene4FastStart = () => {
  const frame = useCurrentFrame();

  // Vertical connecting line draws downward
  const lineProgress = interpolate(frame, [40, 230], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 60px',
      }}
    >
      {/* Timeline container */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 36,
          paddingLeft: 60,
          width: '100%',
          maxWidth: 920,
        }}
      >
        {/* Vertical connecting line */}
        <div
          style={{
            position: 'absolute',
            left: 118,
            top: 60,
            bottom: 60,
            width: 4,
            borderRadius: 2,
            background: `linear-gradient(to bottom, ${colors.blue}, ${colors.purple}, ${colors.amber}, ${colors.green})`,
            transformOrigin: 'top center',
            transform: `scaleY(${lineProgress})`,
          }}
        />

        {/* Phase nodes */}
        {PHASES.map((phase) => (
          <TimelineNode
            key={phase.label}
            label={phase.label}
            days={phase.days}
            bonus={phase.bonus}
            color={phase.color}
            iconText={phase.icon}
            startFrame={phase.startOffset}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
