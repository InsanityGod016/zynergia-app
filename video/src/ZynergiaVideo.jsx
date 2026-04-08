import {AbsoluteFill, Sequence} from 'remotion';
import {colors} from './tokens';
import {Scene1Problem} from './scenes/Scene1Problem';
import {Scene2AutoTasks} from './scenes/Scene2AutoTasks';
import {Scene3WhatsApp} from './scenes/Scene3WhatsApp';
import {Scene4FastStart} from './scenes/Scene4FastStart';
import {Scene5FinalMessage} from './scenes/Scene5FinalMessage';

export const ZynergiaVideo = () => {
  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      {/* Scene 1: Problem — 0-240 (8s) */}
      <Sequence from={0} durationInFrames={240}>
        <Scene1Problem />
      </Sequence>

      {/* Scene 2: Automatic Tasks — 240-570 (11s) */}
      <Sequence from={240} durationInFrames={330}>
        <Scene2AutoTasks />
      </Sequence>

      {/* Scene 3: WhatsApp Message — 570-990 (14s) */}
      <Sequence from={570} durationInFrames={420}>
        <Scene3WhatsApp />
      </Sequence>

      {/* Scene 4: Fast Start — 990-1290 (10s) */}
      <Sequence from={990} durationInFrames={300}>
        <Scene4FastStart />
      </Sequence>

      {/* Scene 5: Final Message — 1290-1650 (12s) */}
      <Sequence from={1290} durationInFrames={360}>
        <Scene5FinalMessage />
      </Sequence>
    </AbsoluteFill>
  );
};
