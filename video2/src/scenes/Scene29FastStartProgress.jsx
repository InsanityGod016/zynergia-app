import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–40    Camera zooms back out (scale 1.15→1)
  f40–80   Checkmarks appear on Q-Team, N1, N2 staggered
           Progress lines Q→N1 and N1→N2 fill fully
  f80–120  Progress line N2→X-Team fills to ~40%
           Hold

  ROADMAP STATE: Q-Team ✔ | N1 ✔ | N2 ✔ | X-Team next
*/

const NODE_BOX = 110;
const NODE_GAP = 280;
const LINE_W = 4;
const LEFT_X = 100;
const START_Y = 340;

const PHASES = [
  {label: 'Q-Team',             days: 'Días 1–30',    color: '#004AFE', bonus: '$1,900 MXN'},
  {label: 'Fast Start Nivel 1', days: 'Días 35–60',   color: '#9333ea', bonus: '$7,600 MXN'},
  {label: 'Fast Start Nivel 2', days: 'Días 75–90',   color: '#d97706', bonus: '$22,800 MXN'},
  {label: 'X-Team',             days: 'Días 110–120', color: '#16a34a', bonus: null},
];

// Stagger delays for checkmarks (within f40–80 window)
const CHECK_DELAYS = [40, 53, 66];

// ── Static gray background line ──
const StaticLine = ({fromIndex}) => {
  const fromY = START_Y + fromIndex * NODE_GAP + NODE_BOX / 2;
  const lineHeight = NODE_GAP - NODE_BOX;
  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_X + NODE_BOX / 2 - LINE_W / 2,
        top: fromY,
        width: LINE_W,
        height: lineHeight,
        backgroundColor: '#E2E8F0',
        borderRadius: LINE_W / 2,
      }}
    />
  );
};

// ── Animated progress fill ──
const ProgressLine = ({fromIndex, targetFill, color, frame, startFrame, duration}) => {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, targetFill], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fromY = START_Y + fromIndex * NODE_GAP + NODE_BOX / 2;
  const totalHeight = NODE_GAP - NODE_BOX;
  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_X + NODE_BOX / 2 - LINE_W / 2,
        top: fromY,
        width: LINE_W,
        height: totalHeight * progress,
        backgroundColor: color,
        borderRadius: LINE_W / 2,
        opacity: 0.75,
      }}
    />
  );
};

// ── Completed node ──
const CompletedNode = ({index, color, label, days, bonus, checkDelay, frame, fps}) => {
  const yPos = START_Y + index * NODE_GAP;

  const checkSp = spring({
    frame: Math.max(0, frame - checkDelay),
    fps,
    config: {damping: 10, stiffness: 160, mass: 0.5},
  });
  const checkScale = frame >= checkDelay ? interpolate(checkSp, [0, 1], [0, 1]) : 0;
  const checkOpacity = interpolate(frame, [checkDelay, checkDelay + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bonusDelay = checkDelay + 18;
  const bonusOpacity = interpolate(frame, [bonusDelay, bonusDelay + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bonusSp = spring({
    frame: Math.max(0, frame - bonusDelay),
    fps,
    config: {damping: 12, stiffness: 120, mass: 0.5},
  });
  const bonusY = frame >= bonusDelay ? interpolate(bonusSp, [0, 1], [20, 0]) : 20;

  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_X,
        top: yPos,
        display: 'flex',
        alignItems: 'center',
        gap: 36,
      }}
    >
      {/* Icon box */}
      <div
        style={{
          width: NODE_BOX,
          height: NODE_BOX,
          borderRadius: 24,
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 8px 28px ${color}44`,
        }}
      >
        <div style={{transform: `scale(${checkScale})`, opacity: checkOpacity}}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13L9 17L19 7" />
          </svg>
        </div>
      </div>

      {/* Text block */}
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <div
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            backgroundColor: `${color}14`,
            border: `1.5px solid ${color}33`,
            borderRadius: 100,
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 6,
            paddingBottom: 6,
          }}
        >
          <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 26, color, whiteSpace: 'nowrap'}}>
            {days}
          </span>
        </div>
        <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 48, color: colors.dark, letterSpacing: -0.5}}>
          {label}
        </div>
        {bonus && (
          <div
            style={{
              opacity: bonusOpacity,
              transform: `translateY(${bonusY}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13L9 17L19 7" />
            </svg>
            <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 38, color, letterSpacing: -0.5}}>
              {bonus}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Gray inactive node ──
const InactiveNode = ({index, label, days}) => {
  const yPos = START_Y + index * NODE_GAP;
  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_X,
        top: yPos,
        display: 'flex',
        alignItems: 'center',
        gap: 36,
        opacity: 0.4,
      }}
    >
      <div
        style={{
          width: NODE_BOX,
          height: NODE_BOX,
          borderRadius: 24,
          backgroundColor: '#E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#94A3B8'}} />
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <div
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            backgroundColor: '#F1F5F9',
            border: '1.5px solid #E2E8F0',
            borderRadius: 100,
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 6,
            paddingBottom: 6,
          }}
        >
          <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 26, color: '#94A3B8', whiteSpace: 'nowrap'}}>
            {days}
          </span>
        </div>
        <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 48, color: '#94A3B8', letterSpacing: -0.5}}>
          {label}
        </div>
      </div>
    </div>
  );
};

export const Scene29FastStartProgress = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Zoom back out
  const zoomSp = spring({frame, fps, config: {damping: 14, stiffness: 100, mass: 0.8}});
  const sceneScale = interpolate(zoomSp, [0, 1], [1.15, 1]);
  const sceneOpacity = interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const titleOpacity = interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${sceneScale})`,
          transformOrigin: 'center center',
          opacity: sceneOpacity,
        }}
      >
        {/* Title */}
        <div style={{position: 'absolute', left: LEFT_X, top: 160, opacity: titleOpacity}}>
          <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 80, color: colors.blue, letterSpacing: -2, lineHeight: 1}}>
            Fast Start
          </div>
          <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 34, color: colors.muted, marginTop: 12}}>
            Programa de bonos — 120 días
          </div>
        </div>

        {/* Static background lines */}
        {PHASES.slice(0, -1).map((_, i) => (
          <StaticLine key={i} fromIndex={i} />
        ))}

        {/* Progress lines for completed segments */}
        <ProgressLine fromIndex={0} targetFill={1}   color={PHASES[1].color} frame={frame} startFrame={44} duration={20} />
        <ProgressLine fromIndex={1} targetFill={1}   color={PHASES[2].color} frame={frame} startFrame={57} duration={20} />
        {/* Partial toward X-Team — shows journey in progress */}
        <ProgressLine fromIndex={2} targetFill={0.42} color={PHASES[3].color} frame={frame} startFrame={80} duration={35} />

        {/* Completed nodes */}
        {PHASES.slice(0, 3).map((phase, i) => (
          <CompletedNode
            key={i}
            index={i}
            color={phase.color}
            label={phase.label}
            days={phase.days}
            bonus={phase.bonus}
            checkDelay={CHECK_DELAYS[i]}
            frame={frame}
            fps={fps}
          />
        ))}

        {/* X-Team — upcoming */}
        <InactiveNode index={3} label={PHASES[3].label} days={PHASES[3].days} />
      </div>
    </AbsoluteFill>
  );
};
