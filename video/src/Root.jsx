import {Composition} from 'remotion';
import {ZynergiaVideo} from './ZynergiaVideo';
import {VIDEO} from './tokens';

export const Root = () => {
  return (
    <>
      <Composition
        id="ZynergiaPromo"
        component={ZynergiaVideo}
        durationInFrames={VIDEO.TOTAL_FRAMES}
        fps={VIDEO.FPS}
        width={VIDEO.WIDTH}
        height={VIDEO.HEIGHT}
      />
    </>
  );
};
