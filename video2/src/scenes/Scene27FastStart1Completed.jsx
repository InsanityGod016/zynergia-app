import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 90 frames = 3s)
  f0–10    Roadmap zooms back out (scale 1.3→1)
  f0–30    Fast Start N1 node highlights blue
  f30–60   Checkmark appears inside N1 node
  f60–90   $7,600 MXN label fades in below N1
  f90–?    Progress line fills toward Fast Start N2

  ROADMAP STATE: Q-Team ✔ | N1 completing | N2 gray | X-Team gray
*/

const NODE_BOX = 110;
const NODE_GAP = 280;
const LINE_W = 4;
const LEFT_X = 100;
const START_Y = 340;

const PHASES = [
  {label: 'Q-Team',             days: 'Días 1–30',    color: '#004AFE', bonus: '$1,900 MXN'},
  {label: 'Fast Start Nivel 1', days: 'Días 35–60',   color: '#9333ea', bonus: '$7,600 MXN'},
  {label: 'Fast Start Nivel 2', days: 'Días 75–90',   color: '#d97706', bonus: null},
  {label: 'X-Team',             days: 'Días 110–120', color: '#16a34a', bonus: null},
];

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
const ProgressLine = ({fromIndex, targetFill, frame, startFrame}) => {
  const progress = interpolate(frame, [startFrame, startFrame + 12], [0, targetFill], {
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
        backgroundColor: '#9333ea',
        borderRadius: LINE_W / 2,
        opacity: 0.75,
      }}
    />
  );
};

// ── Completed node (Q-Team or N1) ──
const CompletedNode = ({index, color, label, days, bonus, bonusDelay, frame, fps, pulseActive}) => {
  const yPos = START_Y + index * NODE_GAP;

  // Checkmark spring
  const checkSp = spring({frame: Math.max(0, frame - 30), fps, config: {damping: 10, stiffness: 160, mass: 0.5}});
  const checkScale = frame >= 30 ? interpolate(checkSp, [0, 1], [0, 1]) : 0;
  const checkOpacity = interpolate(frame, [30, 42], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Pulse ring (only on active completing node)
  const pulseProgress = interpolate(frame, [0, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pulseOpacity = interpolate(frame, [0, 15, 30], [0.6, 0.3, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pulseSize = NODE_BOX + 40 * pulseProgress;

  // Bonus label
  const bonusOpacity = interpolate(frame, [bonusDelay, bonusDelay + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bonusSp = spring({frame: Math.max(0, frame - bonusDelay), fps, config: {damping: 12, stiffness: 120, mass: 0.5}});
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
      {/* Pulse ring (active node only) */}
      {pulseActive && (
        <div
          style={{
            position: 'absolute',
            left: -((pulseSize - NODE_BOX) / 2),
            top: -((pulseSize - NODE_BOX) / 2),
            width: pulseSize,
            height: pulseSize,
            borderRadius: pulseSize / 2,
            border: `3px solid ${color}`,
            opacity: pulseOpacity,
            pointerEvents: 'none',
          }}
        />
      )}

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

// ── Already-completed node (Q-Team shown as done from start) ──
const AlreadyCompleted = ({index, color, label, days, bonus}) => {
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
      }}
    >
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
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13L9 17L19 7" />
        </svg>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <div
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            backgroundColor: `${color}14`,
            border: `1.5px solid ${color}33`,
            borderRadius: 100,
            paddingLeft: 20, paddingRight: 20, paddingTop: 6, paddingBottom: 6,
          }}
        >
          <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 26, color, whiteSpace: 'nowrap'}}>{days}</span>
        </div>
        <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 48, color: colors.dark, letterSpacing: -0.5}}>{label}</div>
        {bonus && (
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13L9 17L19 7" />
            </svg>
            <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 38, color, letterSpacing: -0.5}}>{bonus}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Gray inactive node ──
const InactiveNode = ({index, label, days, frame}) => {
  const yPos = START_Y + index * NODE_GAP;
  const opacity = interpolate(frame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_X,
        top: yPos,
        display: 'flex',
        alignItems: 'center',
        gap: 36,
        opacity: opacity * 0.4,
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
            paddingLeft: 20, paddingRight: 20, paddingTop: 6, paddingBottom: 6,
          }}
        >
          <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 26, color: '#94A3B8', whiteSpace: 'nowrap'}}>{days}</span>
        </div>
        <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 48, color: '#94A3B8', letterSpacing: -0.5}}>{label}</div>
      </div>
    </div>
  );
};

export const Scene27FastStart1Completed = () => {
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

        {/* Q-Team full progress line (already done) */}
        <div
          style={{
            position: 'absolute',
            left: LEFT_X + NODE_BOX / 2 - LINE_W / 2,
            top: START_Y + NODE_BOX / 2,
            width: LINE_W,
            height: NODE_GAP - NODE_BOX,
            backgroundColor: '#9333ea',
            borderRadius: LINE_W / 2,
            opacity: 0.65,
          }}
        />

        {/* N1 → N2 progress line filling */}
        <ProgressLine fromIndex={1} targetFill={0.4} frame={frame} startFrame={80} />

        {/* Q-Team — already completed */}
        <AlreadyCompleted
          index={0}
          color={PHASES[0].color}
          label={PHASES[0].label}
          days={PHASES[0].days}
          bonus={PHASES[0].bonus}
        />

        {/* Fast Start N1 — completing now */}
        <CompletedNode
          index={1}
          color={PHASES[1].color}
          label={PHASES[1].label}
          days={PHASES[1].days}
          bonus={PHASES[1].bonus}
          bonusDelay={60}
          frame={frame}
          fps={fps}
          pulseActive
        />

        {/* Fast Start N2 — inactive */}
        <InactiveNode index={2} label={PHASES[2].label} days={PHASES[2].days} frame={frame} />

        {/* X-Team — inactive */}
        <InactiveNode index={3} label={PHASES[3].label} days={PHASES[3].days} frame={frame} />
      </div>
    </AbsoluteFill>
  );
};
