import {useCurrentFrame, interpolate, useVideoConfig} from 'remotion';
import {colors, font} from '../tokens';

export const ActionButton = ({
  label,
  color = colors.green,
  icon = '',
  startFrame = 0,
  glowStartFrame = 20,
  tapFrame = 80,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Entry animation
  const entryOpacity = interpolate(frame, [startFrame, startFrame + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const entryY = interpolate(frame, [startFrame, startFrame + 18], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Glow pulse (sine wave)
  const glowActive = frame >= glowStartFrame && frame < tapFrame;
  const glow = glowActive
    ? 0.5 + 0.5 * Math.sin(((frame - glowStartFrame) / fps) * Math.PI * 2.5)
    : 0;

  // Tap animation
  const tapScale =
    frame >= tapFrame && frame < tapFrame + 15
      ? interpolate(frame, [tapFrame, tapFrame + 7, tapFrame + 15], [1, 0.92, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;

  return (
    <div
      style={{
        opacity: entryOpacity,
        transform: `translateY(${entryY}px) scale(${tapScale})`,
        width: 700,
        backgroundColor: color,
        borderRadius: 20,
        padding: '28px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontFamily: font.family,
        fontWeight: font.bold,
        fontSize: 30,
        color: colors.white,
        boxShadow: glow > 0
          ? `0 0 ${glow * 24}px ${color}66`
          : '0 4px 16px rgba(0,0,0,0.08)',
        ...style,
      }}
    >
      {icon && <span style={{fontSize: 28}}>{icon}</span>}
      {label}
    </div>
  );
};
