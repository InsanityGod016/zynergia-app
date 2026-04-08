import {useCurrentFrame, interpolate} from 'remotion';
import {colors, font} from '../tokens';

export const MessageBubble = ({
  text,
  startFrame = 0,
  style = {},
}) => {
  const frame = useCurrentFrame();

  // Entry animation
  const entryOpacity = interpolate(frame, [startFrame, startFrame + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const entryY = interpolate(frame, [startFrame, startFrame + 12], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity: entryOpacity,
        transform: `translateY(${entryY}px)`,
        width: 800,
        backgroundColor: '#DCF8C6',
        borderRadius: '20px 20px 4px 20px',
        padding: '28px 32px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        ...style,
      }}
    >
      {/* Message text */}
      <div
        style={{
          fontFamily: font.family,
          fontSize: 26,
          fontWeight: font.regular,
          color: colors.textPrimary,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </div>

      {/* Timestamp + checks */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 6,
          marginTop: 12,
        }}
      >
        <span
          style={{
            fontFamily: font.family,
            fontSize: 18,
            color: '#94A3B8',
          }}
        >
          Ahora
        </span>
        <span style={{fontSize: 18, color: colors.blue}}>✓✓</span>
      </div>
    </div>
  );
};
