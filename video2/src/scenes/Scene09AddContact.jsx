import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 150 frames = 5s)
  f0–40    Contact card slides up from below with spring
  f40–80   4 tags fade in staggered (10 frames apart)
  f80–120  "Prospecto producto" tag becomes selected (bg→blue, text→white)
  f120–150 Hold

  LAYOUT: large centered card, 500px wide
*/

const TAGS = [
  {label: 'Prospecto producto', key: 'pp'},
  {label: 'Prospecto partner', key: 'ppa'},
  {label: 'Cliente', key: 'cl'},
  {label: 'Partner', key: 'pa'},
];

// ── Tag chip ──

const TagChip = ({label, isSelected, selectionProgress, tagOpacity}) => {
  const bgColor = interpolate(selectionProgress, [0, 1], [0, 1]);
  const backgroundColor = bgColor > 0.5 ? colors.blue : colors.surface;
  const textColor = bgColor > 0.5 ? colors.white : colors.dark;
  const borderColor = bgColor > 0.5 ? colors.blue : colors.dim;

  const chipScale = isSelected
    ? interpolate(selectionProgress, [0, 0.5, 1], [1, 1.08, 1])
    : 1;

  return (
    <div
      style={{
        opacity: tagOpacity,
        transform: `scale(${chipScale})`,
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          backgroundColor,
          border: `2px solid ${borderColor}`,
          borderRadius: 20,
          padding: '24px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: bgColor > 0.5
            ? '0 6px 20px rgba(0,74,254,0.25)'
            : '0 2px 8px rgba(0,0,0,0.04)',
          transition: 'none',
        }}
      >
        <span
          style={{
            fontFamily: font.family,
            fontWeight: font.semi,
            fontSize: 34,
            color: textColor,
            letterSpacing: -0.3,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

// ── Main Scene ──

export const Scene09AddContact = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Card slide up with spring ──
  const cardSpring = spring({
    frame,
    fps,
    config: {
      damping: 14,
      stiffness: 70,
      mass: 0.9,
    },
  });
  const cardY = interpolate(cardSpring, [0, 1], [400, 0]);
  const cardOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Tag fade in: staggered 10 frames apart starting at f40 ──
  const tagOpacities = TAGS.map((_, i) => {
    const start = 40 + i * 10;
    return interpolate(frame, [start, start + 10], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  });

  // ── Selection animation for "Prospecto producto" at f80 ──
  const selectionStart = 80;
  const selectionSpring = spring({
    frame: frame - selectionStart,
    fps,
    config: {damping: 12, stiffness: 120, mass: 0.6},
  });
  const selectionProgress = frame >= selectionStart ? selectionSpring : 0;

  // ── Avatar initials ──
  const avatarSpring = spring({
    frame: frame - 5,
    fps,
    config: {damping: 10, stiffness: 100, mass: 0.7},
  });
  const avatarScale = interpolate(avatarSpring, [0, 1], [0.5, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
      }}
    >
      {/* Centered card */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateY(${cardY}px)`,
          opacity: cardOpacity,
          willChange: 'transform',
        }}
      >
        <div
          style={{
            width: 750,
            backgroundColor: colors.white,
            border: `1.5px solid ${colors.cardBorder}`,
            borderRadius: 44,
            padding: '72px 64px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: colors.blue,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 40,
              transform: `scale(${avatarScale})`,
              boxShadow: '0 8px 28px rgba(0,74,254,0.3)',
            }}
          >
            <span
              style={{
                fontFamily: font.family,
                fontWeight: font.bold,
                fontSize: 64,
                color: colors.white,
                lineHeight: 1,
              }}
            >
              CL
            </span>
          </div>

          {/* Name */}
          <div
            style={{
              fontFamily: font.family,
              fontWeight: font.bold,
              fontSize: 56,
              color: colors.dark,
              letterSpacing: -0.8,
              lineHeight: 1.2,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            Carlos López
          </div>

          {/* Subtitle hint */}
          <div
            style={{
              fontFamily: font.family,
              fontWeight: font.regular,
              fontSize: 32,
              color: colors.muted,
              letterSpacing: -0.2,
              marginBottom: 48,
            }}
          >
            Selecciona una categoría
          </div>

          {/* Tags list — vertical stack */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              alignItems: 'stretch',
              width: '100%',
            }}
          >
            {TAGS.map((tag, i) => (
              <TagChip
                key={tag.key}
                label={tag.label}
                isSelected={i === 0}
                selectionProgress={i === 0 ? selectionProgress : 0}
                tagOpacity={tagOpacities[i]}
              />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
