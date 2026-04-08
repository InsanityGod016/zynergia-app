import {useCurrentFrame, interpolate} from 'remotion';
import {colors, font} from '../tokens';

export const MessageInput = ({
  text,
  startFrame = 0,
  typingDuration = 150,
  style = {},
}) => {
  const frame = useCurrentFrame();

  // Entry fade
  const entryOpacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Typing starts 10 frames after entry
  const typingStart = startFrame + 10;
  const charCount = Math.floor(
    interpolate(frame, [typingStart, typingStart + typingDuration], [0, text.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const isTyping = charCount < text.length && frame >= typingStart;
  const cursorVisible = isTyping && Math.floor(frame / 8) % 2 === 0;

  return (
    <div
      style={{
        opacity: entryOpacity,
        width: 800,
        backgroundColor: colors.surface,
        border: `2px solid ${colors.dim}`,
        borderRadius: 20,
        padding: '28px 32px',
        ...style,
      }}
    >
      {/* Input label */}
      <div
        style={{
          fontFamily: font.family,
          fontSize: 16,
          fontWeight: font.medium,
          color: colors.textSecondary,
          marginBottom: 12,
        }}
      >
        Mensaje
      </div>

      {/* Typed text */}
      <div
        style={{
          fontFamily: font.family,
          fontSize: 28,
          fontWeight: font.regular,
          color: colors.textPrimary,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          minHeight: 180,
        }}
      >
        {text.slice(0, charCount)}
        {cursorVisible && (
          <span style={{color: colors.blue, fontWeight: font.bold}}>|</span>
        )}
      </div>
    </div>
  );
};
