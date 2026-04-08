import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 90 frames = 3s)
  f0–20    Send button pulses (green → darker green)
  f10–20   Input text fades out
  f20–60   Sent bubble rises into view from input bar position
  f60–90   Check mark + "enviado" fades in

  LAYOUT: Input bar stays at center, bubble floats up-right
*/

const WA_GREEN = '#25D366';
const WA_BUBBLE = '#DCF8C6';
const WA_INPUT_BG = '#FFFFFF';

export const Scene15MessageSent = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Send button color pulse ──
  const btnPulse = interpolate(frame, [0, 10, 20], [1, 0.7, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const btnColor = `rgba(37, 211, 102, ${btnPulse})`;
  const btnScale = interpolate(frame, [0, 10, 20], [1, 0.88, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Input text fades out as message "leaves" ──
  const inputTextOpacity = interpolate(frame, [10, 20], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Sent bubble rises up ──
  const bubbleSpring = spring({
    frame: Math.max(0, frame - 18),
    fps,
    config: {damping: 14, stiffness: 100, mass: 0.7},
  });
  const bubbleY = interpolate(bubbleSpring, [0, 1], [120, 0]);
  const bubbleOpacity = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Check mark + enviado ──
  const checkStart = 60;
  const checkSpring = spring({
    frame: Math.max(0, frame - checkStart),
    fps,
    config: {damping: 12, stiffness: 140, mass: 0.5},
  });
  const checkOpacity = interpolate(frame, [checkStart, checkStart + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const checkScale = frame >= checkStart ? interpolate(checkSpring, [0, 1], [0.4, 1]) : 0.4;

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>

      {/* ── Sent bubble — floats above center ── */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          top: '50%',
          transform: `translateY(calc(-100% - 40px)) translateY(${bubbleY}px)`,
          opacity: bubbleOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: WA_BUBBLE,
            borderRadius: '28px 28px 4px 28px',
            padding: '36px 44px',
            maxWidth: 780,
            boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
            position: 'relative',
          }}
        >
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

          {/* Timestamp inside bubble */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 12,
            }}
          >
            <span
              style={{
                fontFamily: font.family,
                fontWeight: font.regular,
                fontSize: 22,
                color: '#8696A0',
              }}
            >
              10:42
            </span>
            {/* Double check (WA style) */}
            <div
              style={{
                opacity: checkOpacity,
                transform: `scale(${checkScale})`,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M2 12.5L7 17.5L12 12.5" stroke="#53BDEB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 12.5L12 17.5L22 7.5" stroke="#53BDEB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* "enviado" label below bubble */}
        <div
          style={{
            opacity: checkOpacity,
            transform: `scale(${checkScale})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 16,
            paddingRight: 8,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M5 13L9 17L19 7" stroke={WA_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span
            style={{
              fontFamily: font.family,
              fontWeight: font.semi,
              fontSize: 28,
              color: WA_GREEN,
              letterSpacing: 0.5,
            }}
          >
            enviado
          </span>
        </div>
      </div>

      {/* ── Input bar — stays at center (now empty) ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 920,
        }}
      >
        <div
          style={{
            backgroundColor: WA_INPUT_BG,
            borderRadius: 40,
            border: '1.5px solid rgba(0,0,0,0.08)',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          {/* Emoji icon */}
          <div style={{flexShrink: 0, paddingBottom: 4}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#8696A0" strokeWidth="1.5" />
              <circle cx="9" cy="10" r="1.2" fill="#8696A0" />
              <circle cx="15" cy="10" r="1.2" fill="#8696A0" />
              <path d="M8.5 14.5C9.2 16 10.5 16.8 12 16.8C13.5 16.8 14.8 16 15.5 14.5" stroke="#8696A0" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Message text (fading out) */}
          <div style={{flex: 1, opacity: inputTextOpacity, minHeight: 48}}>
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

          {/* Placeholder text (appears after message leaves) */}
          <div
            style={{
              position: 'absolute',
              left: 96,
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: interpolate(frame, [20, 30], [0, 0.5], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <span
              style={{
                fontFamily: font.family,
                fontWeight: font.regular,
                fontSize: 34,
                color: '#8696A0',
              }}
            >
              Escribe un mensaje
            </span>
          </div>

          {/* Clip icon */}
          <div style={{flexShrink: 0, paddingBottom: 4}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M21.44 11.05L12.25 20.24C10.45 22.04 7.51 22.04 5.71 20.24C3.91 18.44 3.91 15.5 5.71 13.7L14.9 4.51C16.04 3.37 17.87 3.37 19.01 4.51C20.15 5.65 20.15 7.48 19.01 8.62L9.82 17.81C9.24 18.39 8.32 18.39 7.74 17.81C7.16 17.23 7.16 16.31 7.74 15.73L16.93 6.54" stroke="#8696A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Send button — pulses then returns to mic */}
          <div
            style={{
              flexShrink: 0,
              transform: `scale(${btnScale})`,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: btnColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
              }}
            >
              {/* After send, show mic icon; before, show send arrow */}
              {frame < 25 ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" />
                  <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M12 19V23M8 23H16" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
