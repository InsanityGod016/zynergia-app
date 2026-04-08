import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)  — FASTER animations
  f0–15    WhatsApp input bar slides up
  f10–25   Message text fades in (already typed)
  f25–40   Send button pops in
  f40–120  Hold

  LAYOUT: WhatsApp-style message input bar, large, centered
  Green send button, emoji icon, clip icon — authentic WA look
*/

const WA_GREEN = '#25D366';
const WA_TEAL = '#075E54';
const WA_INPUT_BG = '#FFFFFF';
const WA_BAR_BG = '#F0F0F0';

export const Scene14MessageReady = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Input bar slides up (fast) ──
  const barSpring = spring({
    frame,
    fps,
    config: {damping: 16, stiffness: 140, mass: 0.6},
  });
  const barY = interpolate(barSpring, [0, 1], [80, 0]);
  const barOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Message text fades in (fast) ──
  const textOpacity = interpolate(frame, [10, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Send button appears (fast) ──
  const btnStart = 25;
  const btnSpring = spring({
    frame: Math.max(0, frame - btnStart),
    fps,
    config: {damping: 10, stiffness: 160, mass: 0.5},
  });
  const btnOpacity = interpolate(frame, [btnStart, btnStart + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const btnScale = frame >= btnStart ? interpolate(btnSpring, [0, 1], [0.3, 1]) : 0.3;

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      {/* Whole input area — centered, large */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateY(${barY}px)`,
          opacity: barOpacity,
          width: 920,
        }}
      >
        {/* WhatsApp input field container */}
        <div
          style={{
            flex: 1,
            backgroundColor: WA_INPUT_BG,
            borderRadius: 40,
            border: '1.5px solid rgba(0,0,0,0.08)',
            padding: '24px 28px 24px 28px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          {/* Emoji icon (left) */}
          <div style={{flexShrink: 0, paddingBottom: 4}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#8696A0" strokeWidth="1.5" />
              <circle cx="9" cy="10" r="1.2" fill="#8696A0" />
              <circle cx="15" cy="10" r="1.2" fill="#8696A0" />
              <path d="M8.5 14.5C9.2 16 10.5 16.8 12 16.8C13.5 16.8 14.8 16 15.5 14.5" stroke="#8696A0" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Message text */}
          <div style={{flex: 1, opacity: textOpacity}}>
            <div
              style={{
                fontFamily: font.family,
                fontWeight: font.regular,
                fontSize: 38,
                color: colors.dark,
                lineHeight: 1.45,
              }}
            >
              Hola Carlos
            </div>
            <div
              style={{
                fontFamily: font.family,
                fontWeight: font.regular,
                fontSize: 38,
                color: colors.dark,
                lineHeight: 1.45,
              }}
            >
              ¿qué te pareció el producto?
            </div>
          </div>

          {/* Clip icon */}
          <div style={{flexShrink: 0, paddingBottom: 4}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M21.44 11.05L12.25 20.24C10.45 22.04 7.51 22.04 5.71 20.24C3.91 18.44 3.91 15.5 5.71 13.7L14.9 4.51C16.04 3.37 17.87 3.37 19.01 4.51C20.15 5.65 20.15 7.48 19.01 8.62L9.82 17.81C9.24 18.39 8.32 18.39 7.74 17.81C7.16 17.23 7.16 16.31 7.74 15.73L16.93 6.54" stroke="#8696A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* WhatsApp send button — green circle, inside the bar */}
          <div
            style={{
              opacity: btnOpacity,
              transform: `scale(${btnScale})`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: WA_GREEN,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
