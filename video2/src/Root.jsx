import {Composition} from 'remotion';
import {ZynergiaVideo} from './ZynergiaVideo';
import {VIDEO} from './tokens';

export const Root = () => {
  return (
    <Composition
      id="ZynergiaPromo"
      component={ZynergiaVideo}
      durationInFrames={4345}
      fps={VIDEO.FPS}
      width={VIDEO.WIDTH}
      height={VIDEO.HEIGHT}
    />
  );
};
