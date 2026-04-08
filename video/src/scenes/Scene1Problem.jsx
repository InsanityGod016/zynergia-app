import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {colors, font} from '../tokens';
import {TaskCard} from '../components/TaskCard';

const CARDS = [
  {title: 'Prospecto producto', tag: 'Seguimiento', tagColor: colors.blue, icon: '📦', delay: 0},
  {title: 'Invitación partner', tag: 'Seguimiento', tagColor: colors.amber, icon: '🤝', delay: 18},
  {title: 'Recompra cliente', tag: 'Seguimiento', tagColor: colors.green, icon: '🔄', delay: 36},
];

export const Scene1Problem = () => {
  const frame = useCurrentFrame();

  // "El problema" label
  const labelOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // "Olvidas hacer seguimiento"
  const headlineOpacity = interpolate(frame, [15, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const headlineY = interpolate(frame, [15, 45], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Exit fade
  const exitOpacity = interpolate(frame, [200, 235], [1, 0], {
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
        opacity: exitOpacity,
      }}
    >
      {/* Label */}
      <div
        style={{
          opacity: labelOpacity,
          fontFamily: font.family,
          fontWeight: font.semi,
          fontSize: 28,
          color: colors.blue,
          textTransform: 'uppercase',
          letterSpacing: 6,
          marginBottom: 16,
        }}
      >
        EL PROBLEMA
      </div>

      {/* Headline */}
      <div
        style={{
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          fontFamily: font.family,
          fontWeight: font.bold,
          fontSize: 56,
          color: colors.textPrimary,
          textAlign: 'center',
          lineHeight: 1.2,
          marginBottom: 60,
        }}
      >
        Olvidas hacer seguimiento
      </div>

      {/* Task cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          width: '100%',
        }}
      >
        {CARDS.map((card) => (
          <TaskCard
            key={card.title}
            title={card.title}
            tag={card.tag}
            tagColor={card.tagColor}
            icon={card.icon}
            status="vencida"
            startFrame={60}
            delay={card.delay}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
