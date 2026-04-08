import {useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {colors, font} from '../tokens';

export const CounterNumber = ({
  from = 0,
  to,
  startFrame = 0,
  duration = 120,
  label = '',
  style = {},
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const value = Math.floor(
    interpolate(frame, [startFrame, startFrame + duration], [from, to], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const entryOpacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    frame: frame - startFrame,
    fps,
    config: {damping: 12, stiffness: 200},
  });

  return (
    <div
      style={{
        opacity: entryOpacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        ...style,
      }}
    >
      {label && (
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.semi,
            fontSize: 28,
            color: colors.textSecondary,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          fontFamily: font.family,
          fontWeight: font.bold,
          fontSize: 72,
          color: colors.blue,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {value}
      </div>
    </div>
  );
};
