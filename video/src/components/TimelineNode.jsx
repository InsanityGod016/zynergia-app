import {useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

export const TimelineNode = ({
  label,
  days,
  bonus,
  color,
  startFrame = 0,
  iconText = '★',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const nodeScale = spring({
    frame: frame - startFrame,
    fps,
    config: {damping: 14, stiffness: 180},
  });

  const bonusScale = spring({
    frame: frame - (startFrame + 15),
    fps,
    config: {damping: 10, stiffness: 200},
  });

  const opacity = interpolate(frame, [startFrame, startFrame + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        width: '100%',
        maxWidth: 900,
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 28,
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transform: `scale(${nodeScale})`,
          boxShadow: `0 12px 32px ${color}33`,
        }}
      >
        <span style={{fontSize: 48, color: colors.white}}>{iconText}</span>
      </div>

      {/* Text block */}
      <div style={{flex: 1}}>
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 36,
            color: colors.textPrimary,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.medium,
            fontSize: 22,
            color: colors.textSecondary,
            marginBottom: 10,
          }}
        >
          {days}
        </div>
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 48,
            color,
            transform: `scale(${bonusScale})`,
            transformOrigin: 'left center',
            display: 'inline-block',
          }}
        >
          {bonus}
        </div>
      </div>
    </div>
  );
};
