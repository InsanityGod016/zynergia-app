import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 150 frames = 5s)
  f0–15    Input bar slides up (like Scene14)
  f10–25   Message text fades in already typed
  f25–40   Send button pops in
  f40–75   Hold — message visible in input
  f75–90   Send button pulses, input text fades out
  f90–130  Sent bubble rises up from input position
  f130–150 Checkmark + "enviado" appears

  LAYOUT: WhatsApp-style input bar centered, then bubble flies up-right
*/

const WA_GREEN = '#25D366';
const WA_BUBBLE = '#DCF8C6';
const WA_INPUT_BG = '#FFFFFF';

export const Scene21ReorderMessage = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Input bar slides up ──
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

  // ── Message text fades in ──
  const textOpacity = interpolate(frame, [10, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Send button pops in ──
  const btnStart = 25;
  const btnSpring = spring({
    frame: Math.max(0, frame - btnStart),
    fps,
    config: {damping: 10, stiffness: 160, mass: 0.5},
  });
  const btnBaseScale = frame >= btnStart ? interpolate(btnSpring, [0, 1], [0.3, 1]) : 0.3;

  // ── Send button pulse on press (f75–90) ──
  const btnPulse = interpolate(frame, [75, 82, 90], [1, 0.82, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const btnScale = frame < btnStart ? btnBaseScale : btnBaseScale * (frame >= 75 ? btnPulse : 1);

  // ── Input text fades out + bar collapses when "sent" ──
  const inputTextOpacity = interpolate(frame, [75, 88], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Collapse the text area height so the bar shrinks to single-line
  const textMaxHeight = interpolate(frame, [75, 92], [320, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Sent bubble rises ──
  const bubbleSpring = spring({
    frame: Math.max(0, frame - 88),
    fps,
    config: {damping: 14, stiffness: 100, mass: 0.7},
  });
  const bubbleY = interpolate(bubbleSpring, [0, 1], [120, 0]);
  const bubbleOpacity = interpolate(frame, [88, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Checkmark + enviado ──
  const checkStart = 130;
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

      {/* ── Sent bubble — floats above input ── */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          top: '50%',
          transform: `translateY(calc(-100% - 50px)) translateY(${bubbleY}px)`,
          opacity: bubbleOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: WA_BUBBLE,
            borderRadius: '28px 28px 4px 28px',
            padding: '36px 44px',
            maxWidth: 820,
            boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 38, color: colors.dark, lineHeight: 1.45, marginBottom: 8}}>
            Hola Carlos
          </div>
          <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 36, color: colors.dark, lineHeight: 1.5}}>
            ya te toca volver a comprar
          </div>
          <div style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 36, color: colors.dark, lineHeight: 1.5, marginBottom: 20}}>
            tu EssentOil+.
          </div>
          <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 32, color: '#64748B', lineHeight: 1.45, marginBottom: 8}}>
            Aquí te dejo tu link de compra:
          </div>
          <div style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 32, color: colors.blue, lineHeight: 1.45}}>
            tulink.zinzino.com/carlos
          </div>

          {/* Timestamp */}
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 16}}>
            <span style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 22, color: '#8696A0'}}>
              10:42
            </span>
            <div style={{opacity: checkOpacity, transform: `scale(${checkScale})`}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M2 12.5L7 17.5L12 12.5" stroke="#53BDEB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 12.5L12 17.5L22 7.5" stroke="#53BDEB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* "enviado" label */}
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
          <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 28, color: WA_GREEN, letterSpacing: 0.5}}>
            enviado
          </span>
        </div>
      </div>

      {/* ── Input bar — centered ── */}
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
        <div
          style={{
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
          {/* Emoji icon */}
          <div style={{flexShrink: 0, paddingBottom: 4}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#8696A0" strokeWidth="1.5" />
              <circle cx="9" cy="10" r="1.2" fill="#8696A0" />
              <circle cx="15" cy="10" r="1.2" fill="#8696A0" />
              <path d="M8.5 14.5C9.2 16 10.5 16.8 12 16.8C13.5 16.8 14.8 16 15.5 14.5" stroke="#8696A0" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Message text (fades out + collapses when sent) */}
          <div style={{flex: 1, opacity: inputTextOpacity, maxHeight: textMaxHeight, overflow: 'hidden'}}>
            <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 36, color: colors.dark, lineHeight: 1.45}}>
              Hola Carlos
            </div>
            <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 34, color: colors.dark, lineHeight: 1.45}}>
              ya te toca volver a comprar
            </div>
            <div style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 34, color: colors.dark, lineHeight: 1.45}}>
              tu EssentOil+.
            </div>
            <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 30, color: '#64748B', lineHeight: 1.45, marginTop: 8}}>
              Aquí te dejo tu link de compra:
            </div>
            <div style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 30, color: colors.blue, lineHeight: 1.45}}>
              tulink.zinzino.com/carlos
            </div>
          </div>

          {/* Placeholder after send */}
          <div
            style={{
              position: 'absolute',
              left: 100,
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: interpolate(frame, [88, 100], [0, 0.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              pointerEvents: 'none',
            }}
          >
            <span style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 34, color: '#8696A0'}}>
              Escribe un mensaje
            </span>
          </div>

          {/* Clip icon */}
          <div style={{flexShrink: 0, paddingBottom: 4}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M21.44 11.05L12.25 20.24C10.45 22.04 7.51 22.04 5.71 20.24C3.91 18.44 3.91 15.5 5.71 13.7L14.9 4.51C16.04 3.37 17.87 3.37 19.01 4.51C20.15 5.65 20.15 7.48 19.01 8.62L9.82 17.81C9.24 18.39 8.32 18.39 7.74 17.81C7.16 17.23 7.16 16.31 7.74 15.73L16.93 6.54" stroke="#8696A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Send button */}
          <div style={{flexShrink: 0, transform: `scale(${btnScale})`}}>
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
              {frame < 90 ? (
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
