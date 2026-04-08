import {useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {colors, font} from '../tokens';

export const TaskCard = ({
  title,
  tag,
  tagColor = colors.blue,
  status = 'ok',
  startFrame = 0,
  delay = 0,
  icon,
  subtitle,
  compact = false,
  showBadge = true,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entryFrame = startFrame + delay;

  const opacity = interpolate(frame, [entryFrame, entryFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(frame, [entryFrame, entryFrame + 15], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const isVencida = status === 'vencida';

  // Badge spring (appears later for dramatic effect)
  const badgeScale = showBadge && isVencida
    ? spring({
        frame: frame - (entryFrame + 20),
        fps,
        config: {damping: 12, stiffness: 200},
      })
    : 0;

  const padding = compact ? '16px 24px' : '28px 36px';
  const titleSize = compact ? 24 : 32;
  const tagSize = compact ? 18 : 22;
  const avatarSize = compact ? 48 : 64;

  // Initials from title
  const initials = title
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 14 : 20,
        padding,
        backgroundColor: colors.card,
        border: `1px solid ${isVencida ? 'rgba(239,68,68,0.2)' : colors.cardBorder}`,
        borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        width: '100%',
        maxWidth: 900,
      }}
    >
      {/* Icon or Avatar */}
      {icon ? (
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: colors.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: compact ? 20 : 28,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      ) : (
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: compact ? 14 : 20,
            color: colors.blue,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
      )}

      {/* Info */}
      <div style={{flex: 1, minWidth: 0}}>
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.semi,
            fontSize: titleSize,
            color: colors.textPrimary,
            marginBottom: subtitle ? 2 : 6,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: font.family,
              fontSize: compact ? 16 : 20,
              color: colors.textSecondary,
              marginBottom: 6,
            }}
          >
            {subtitle}
          </div>
        )}
        {tag && (
          <div
            style={{
              display: 'inline-block',
              fontFamily: font.family,
              fontWeight: font.semi,
              fontSize: tagSize,
              color: colors.white,
              backgroundColor: tagColor,
              padding: compact ? '3px 12px' : '5px 16px',
              borderRadius: 14,
            }}
          >
            {tag}
          </div>
        )}
      </div>

      {/* Status badge */}
      {isVencida && showBadge && badgeScale > 0 && (
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: compact ? 16 : 22,
            color: colors.white,
            backgroundColor: colors.red,
            padding: compact ? '4px 14px' : '8px 22px',
            borderRadius: 16,
            flexShrink: 0,
            transform: `scale(${badgeScale})`,
            transformOrigin: 'center center',
          }}
        >
          VENCIDA
        </div>
      )}
    </div>
  );
};
