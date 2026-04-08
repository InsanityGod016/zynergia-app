import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {colors, font} from '../tokens';
import {CounterNumber} from '../components/CounterNumber';

const DAYS = ['Día 0', 'Día 3', 'Día 7', 'Día 12', 'Día 18', 'Día 25'];

export const Scene2AutoTasks = () => {
  const frame = useCurrentFrame();

  // "Tareas automáticas" title — starts centered, then slides up + shrinks
  const titlePhase = frame < 30 ? 'entering' : 'shrinking';

  const titleEntryOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Slide up and scale down (from center to top label)
  const titleY = interpolate(frame, [30, 60], [0, -620], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleScale = interpolate(frame, [30, 60], [1, 0.43], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Counter appears
  const counterOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Counter value synced with card appearances
  const counterVal = Math.floor(
    interpolate(frame, [70, 190], [0, 6], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Title that slides up to become label */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translateY(${titleY}px) scale(${titleScale})`,
          opacity: titleEntryOpacity,
          fontFamily: font.family,
          fontWeight: font.bold,
          fontSize: 56,
          color: frame >= 30 ? colors.blue : colors.textPrimary,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          textTransform: frame >= 50 ? 'uppercase' : 'none',
          letterSpacing: frame >= 50 ? 4 : 0,
        }}
      >
        Tareas automáticas
      </div>

      {/* Counter */}
      <div
        style={{
          opacity: counterOpacity,
          marginTop: 160,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.semi,
            fontSize: 28,
            color: colors.textSecondary,
          }}
        >
          Tareas creadas
        </div>
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 72,
            color: colors.blue,
          }}
        >
          {counterVal}
        </div>
      </div>

      {/* Task cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          width: '100%',
          padding: '30px 60px 0',
        }}
      >
        {DAYS.map((day, i) => {
          const cardStart = 70 + i * 20;
          const cardOpacity = interpolate(frame, [cardStart, cardStart + 15], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const cardY = interpolate(frame, [cardStart, cardStart + 15], [30, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={day}
              style={{
                opacity: cardOpacity,
                transform: `translateY(${cardY}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '20px 28px',
                backgroundColor: colors.card,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 16,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                width: '100%',
                maxWidth: 900,
              }}
            >
              {/* Blue dot */}
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.blue,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: font.family,
                  fontSize: 26,
                  fontWeight: font.medium,
                  color: colors.textPrimary,
                }}
              >
                {day} — Seguimiento
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
