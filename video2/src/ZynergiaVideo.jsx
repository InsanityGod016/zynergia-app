import {AbsoluteFill, Sequence} from 'remotion';
import {colors} from './tokens';
import {Scene01MessagesStart} from './scenes/Scene01MessagesStart';
import {Scene02MoreMessages} from './scenes/Scene02MoreMessages';
import {Scene03ChatExplosion} from './scenes/Scene03ChatExplosion';
import {Scene04Notifications} from './scenes/Scene04Notifications';
import {Scene05Reminders} from './scenes/Scene05Reminders';
import {Scene06ChaosFreeze} from './scenes/Scene06ChaosFreeze';
import {Scene07ChaosReset} from './scenes/Scene07ChaosReset';
import {Scene08ZynergiaIntro} from './scenes/Scene08ZynergiaIntro';
import {Scene09AddContact} from './scenes/Scene09AddContact';
import {Scene10FollowUpRoadmap} from './scenes/Scene10FollowUpRoadmap';
import {Scene11FocusDay} from './scenes/Scene11FocusDay';
import {Scene12TaskAppears} from './scenes/Scene12TaskAppears';
import {Scene13ButtonPress} from './scenes/Scene13ButtonPress';
import {Scene14MessageReady} from './scenes/Scene14MessageReady';
import {Scene15MessageSent} from './scenes/Scene15MessageSent';
import {Scene16TaskCompleted} from './scenes/Scene16TaskCompleted';
import {Scene17MessageFinal} from './scenes/Scene17MessageFinal';
import {Scene18RegisterSale} from './scenes/Scene18RegisterSale';
import {Scene19ConsumptionTimeline} from './scenes/Scene19ConsumptionTimeline';
import {Scene20AutomaticReminders} from './scenes/Scene20AutomaticReminders';
import {Scene21ReorderMessage} from './scenes/Scene21ReorderMessage';
import {Scene22ReorderMessageFinal} from './scenes/Scene22ReorderMessageFinal';
import {Scene23FastStartRoadmap} from './scenes/Scene23FastStartRoadmap';
import {Scene24QTeamZoom} from './scenes/Scene24QTeamZoom';
import {Scene25QTeamCompleted} from './scenes/Scene25QTeamCompleted';
import {Scene26FastStart1} from './scenes/Scene26FastStart1';
import {Scene27FastStart1Completed} from './scenes/Scene27FastStart1Completed';
import {Scene28FastStart2} from './scenes/Scene28FastStart2';
import {Scene29FastStartProgress} from './scenes/Scene29FastStartProgress';
import {Scene30XTeamClients} from './scenes/Scene30XTeamClients';
import {Scene31XTeamCompleted} from './scenes/Scene31XTeamCompleted';
import {Scene32FinalMessage} from './scenes/Scene32FinalMessage';
import {Scene33TextCollapse} from './scenes/Scene33TextCollapse';
import {Scene34LogoReveal} from './scenes/Scene34LogoReveal';
import {Scene35FinalTagline} from './scenes/Scene35FinalTagline';

export const ZynergiaVideo = () => {
  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      {/* Scene 01: First message — 0-120 (4s) */}
      <Sequence from={0} durationInFrames={120}>
        <Scene01MessagesStart />
      </Sequence>

      {/* Scene 02: More messages — 120-270 (5s) */}
      <Sequence from={120} durationInFrames={150}>
        <Scene02MoreMessages />
      </Sequence>

      {/* Scene 03: Chat explosion — 270-390 (4s) */}
      <Sequence from={270} durationInFrames={120}>
        <Scene03ChatExplosion />
      </Sequence>

      {/* Scene 04: Notifications — 390-510 (4s) */}
      <Sequence from={390} durationInFrames={120}>
        <Scene04Notifications />
      </Sequence>

      {/* Scene 05: Reminders — 510-630 (4s) */}
      <Sequence from={510} durationInFrames={120}>
        <Scene05Reminders />
      </Sequence>

      {/* Scene 06: Chaos Freeze — 630-750 (4s) */}
      <Sequence from={630} durationInFrames={120}>
        <Scene06ChaosFreeze />
      </Sequence>

      {/* Scene 07: Chaos Reset — 750-870 (4s) */}
      <Sequence from={750} durationInFrames={120}>
        <Scene07ChaosReset />
      </Sequence>

      {/* Scene 08: Zynergia Intro — 870-990 (4s) */}
      <Sequence from={870} durationInFrames={120}>
        <Scene08ZynergiaIntro />
      </Sequence>

      {/* Scene 09: Add Contact — 990-1140 (5s) */}
      <Sequence from={990} durationInFrames={150}>
        <Scene09AddContact />
      </Sequence>

      {/* Scene 10: Follow-Up Roadmap — 1140-1350 (7s) */}
      <Sequence from={1140} durationInFrames={210}>
        <Scene10FollowUpRoadmap />
      </Sequence>

      {/* Scene 11: Focus Day — 1350-1470 (4s) */}
      <Sequence from={1350} durationInFrames={120}>
        <Scene11FocusDay />
      </Sequence>

      {/* Scene 12: Task Appears — 1470-1560 (3s) */}
      <Sequence from={1470} durationInFrames={90}>
        <Scene12TaskAppears />
      </Sequence>

      {/* Scene 13: Button Press — 1560-1620 (2s) */}
      <Sequence from={1560} durationInFrames={60}>
        <Scene13ButtonPress />
      </Sequence>

      {/* Scene 14: Message Ready — 1620-1740 (4s) */}
      <Sequence from={1620} durationInFrames={120}>
        <Scene14MessageReady />
      </Sequence>

      {/* Scene 15: Message Sent — 1740-1830 (3s) */}
      <Sequence from={1740} durationInFrames={90}>
        <Scene15MessageSent />
      </Sequence>

      {/* Scene 16: Task Completed — 1830-1950 (4s) */}
      <Sequence from={1830} durationInFrames={120}>
        <Scene16TaskCompleted />
      </Sequence>

      {/* Scene 17: Message Final — 1950-2070 (4s) */}
      <Sequence from={1950} durationInFrames={120}>
        <Scene17MessageFinal />
      </Sequence>

      {/* Scene 18: Register Sale — 2070-2190 (4s) */}
      <Sequence from={2070} durationInFrames={120}>
        <Scene18RegisterSale />
      </Sequence>

      {/* Scene 19: Consumption Timeline — 2190-2310 (4s) */}
      <Sequence from={2190} durationInFrames={120}>
        <Scene19ConsumptionTimeline />
      </Sequence>

      {/* Scene 20: Automatic Reminders — 2310-2430 (4s) */}
      <Sequence from={2310} durationInFrames={120}>
        <Scene20AutomaticReminders />
      </Sequence>

      {/* Scene 21: Reorder Message — 2430-2580 (5s) */}
      <Sequence from={2430} durationInFrames={150}>
        <Scene21ReorderMessage />
      </Sequence>

      {/* Scene 22: Reorder Message Final — 2580-2700 (4s) */}
      <Sequence from={2580} durationInFrames={120}>
        <Scene22ReorderMessageFinal />
      </Sequence>

      {/* Scene 23: Fast Start Roadmap — 2700-2850 (5s) */}
      <Sequence from={2700} durationInFrames={150}>
        <Scene23FastStartRoadmap />
      </Sequence>

      {/* Scene 24: Q-Team Zoom — 2850-3015 (5.5s) */}
      <Sequence from={2850} durationInFrames={165}>
        <Scene24QTeamZoom />
      </Sequence>

      {/* Scene 25: Q-Team Completed — 3015-3105 (3s) */}
      <Sequence from={3015} durationInFrames={90}>
        <Scene25QTeamCompleted />
      </Sequence>

      {/* Scene 26: Fast Start N1 — 3105-3285 (6s) */}
      <Sequence from={3105} durationInFrames={180}>
        <Scene26FastStart1 />
      </Sequence>

      {/* Scene 27: Fast Start N1 Completed — 3285-3375 (3s) */}
      <Sequence from={3285} durationInFrames={90}>
        <Scene27FastStart1Completed />
      </Sequence>

      {/* Scene 28: Fast Start N2 — 3375-3585 (7s) */}
      <Sequence from={3375} durationInFrames={210}>
        <Scene28FastStart2 />
      </Sequence>

      {/* Scene 29: Fast Start Progress — 3585-3705 (4s) */}
      <Sequence from={3585} durationInFrames={120}>
        <Scene29FastStartProgress />
      </Sequence>

      {/* Scene 30: X-Team Clients — 3705-3855 (5s) */}
      <Sequence from={3705} durationInFrames={150}>
        <Scene30XTeamClients />
      </Sequence>

      {/* Scene 31: X-Team Completed — 3855-4015 (5.3s) */}
      <Sequence from={3855} durationInFrames={160}>
        <Scene31XTeamCompleted />
      </Sequence>

      {/* Scene 32: Final Message — 4015-4135 (4s) */}
      <Sequence from={4015} durationInFrames={120}>
        <Scene32FinalMessage />
      </Sequence>

      {/* Scene 33: Text Collapse — 4135-4195 (2s) */}
      <Sequence from={4135} durationInFrames={60}>
        <Scene33TextCollapse />
      </Sequence>

      {/* Scene 34: Logo Reveal — 4195-4255 (2s) */}
      <Sequence from={4195} durationInFrames={60}>
        <Scene34LogoReveal />
      </Sequence>

      {/* Scene 35: Final Tagline — 4255-4345 (3s) */}
      <Sequence from={4255} durationInFrames={90}>
        <Scene35FinalTagline />
      </Sequence>
    </AbsoluteFill>
  );
};
