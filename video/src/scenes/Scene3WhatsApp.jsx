import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {colors, font} from '../tokens';
import {TaskCard} from '../components/TaskCard';
import {ActionButton} from '../components/ActionButton';
import {MessageInput} from '../components/MessageInput';
import {MessageBubble} from '../components/MessageBubble';

const MSG_TEXT = 'Hola Ana!\nYa casi se termina tu producto.\n\nPuedes pedirlo aquí:\ntulinkdecompra.com';

export const Scene3WhatsApp = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Phase 1: Task card + button (frames 0–170)
  const phase1Opacity = interpolate(frame, [145, 170], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const phase1Y = interpolate(frame, [145, 170], [0, -40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Phase 2: Message input (frames 170–380)
  const phase2Opacity = frame >= 170
    ? interpolate(frame, [360, 380], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  // Phase 3: Sent bubble (frames 380+)
  const phase3Active = frame >= 380;

  // Send icon animation
  const sendIconScale = frame >= 340 && frame < 360
    ? spring({
        frame: frame - 340,
        fps,
        config: {damping: 10, stiffness: 200},
      })
    : frame >= 360 ? 1 : 0;

  // Bottom text
  const bottomTextOpacity = interpolate(frame, [395, 420], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bottomTextY = interpolate(frame, [395, 420], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 60px',
      }}
    >
      {/* Phase 1: Task card + WhatsApp button */}
      {frame < 170 && (
        <div
          style={{
            opacity: phase1Opacity,
            transform: `translateY(${phase1Y}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 40,
          }}
        >
          <TaskCard
            title="Recompra — Día 30"
            subtitle="Cliente: Ana García"
            tag="Recompra"
            tagColor={colors.green}
            icon="🔄"
            startFrame={0}
          />

          <ActionButton
            label="Enviar por WhatsApp"
            color={colors.green}
            icon="💬"
            startFrame={50}
            glowStartFrame={80}
            tapFrame={130}
          />
        </div>
      )}

      {/* Phase 2: Message input with typing */}
      {frame >= 170 && frame < 380 && (
        <div
          style={{
            opacity: phase2Opacity,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <MessageInput
            text={MSG_TEXT}
            startFrame={170}
            typingDuration={150}
          />

          {/* Send icon */}
          {sendIconScale > 0 && (
            <div
              style={{
                marginTop: 20,
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.blue,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `scale(${sendIconScale})`,
                boxShadow: '0 4px 16px rgba(0,74,254,0.3)',
              }}
            >
              <span style={{fontSize: 28, color: colors.white}}>➤</span>
            </div>
          )}
        </div>
      )}

      {/* Phase 3: Sent message bubble */}
      {phase3Active && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 40,
          }}
        >
          <MessageBubble
            text={MSG_TEXT}
            startFrame={380}
          />

          {/* Bottom text */}
          <div
            style={{
              opacity: bottomTextOpacity,
              transform: `translateY(${bottomTextY}px)`,
              fontFamily: font.family,
              fontWeight: font.semi,
              fontSize: 36,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            No tienes que pensar qué decir.
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
