import {useCurrentFrame, interpolate} from 'remotion';
import {colors, font} from '../tokens';

export const FadeText = ({
  children,
  startFrame = 0,
  duration = 20,
  y = 30,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * y}px)`,
        fontFamily: font.family,
        color: colors.textPrimary,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
