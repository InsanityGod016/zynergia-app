import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 160 frames = 5.3s)
  f0–40    Zoom out 1.35→1, N2→X-Team progress line fills, X-Team node gray→blue
  f40–80   Checkmark springs into X-Team node
  f80–120  $2,850 MXN earnings label slides in
  f120–160 Hold — all 4 nodes fully completed

  ROADMAP STATE: Q-Team ✔ | N1 ✔ | N2 ✔ | X-Team completing → ✔
*/

const NODE_BOX = 110;
const NODE_GAP = 280;
const LINE_W   = 4;
const LEFT_X   = 100;
const START_Y  = 340;

const BLUE = '#004AFE';

const PHASES = [
  {label: 'Q-Team',             days: 'Días 1–30',    color: '#004AFE', bonus: '$1,900 MXN'},
  {label: 'Fast Start Nivel 1', days: 'Días 35–60',   color: '#9333ea', bonus: '$7,600 MXN'},
  {label: 'Fast Start Nivel 2', days: 'Días 75–90',   color: '#d97706', bonus: '$22,800 MXN'},
  {label: 'X-Team',             days: 'Días 110–120', color: BLUE,      bonus: '$2,850 MXN'},
];

// ── Static gray background line ──
const StaticLine = ({fromIndex}) => {
  const fromY = START_Y + fromIndex * NODE_GAP + NODE_BOX / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_X + NODE_BOX / 2 - LINE_W / 2,
        top: fromY,
        width: LINE_W,
        height: NODE_GAP - NODE_BOX,
        backgroundColor: '#E2E8F0',
        borderRadius: LINE_W / 2,
      }}
    />
  );
};

// ── Already-filled progress line (static) ──
const FilledLine = ({fromIndex, color}) => {
  const fromY = START_Y + fromIndex * NODE_GAP + NODE_BOX / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_X + NODE_BOX / 2 - LINE_W / 2,
        top: fromY,
        width: LINE_W,
        height: NODE_GAP - NODE_BOX,
        backgroundColor: color,
        borderRadius: LINE_W / 2,
        opacity: 0.72,
      }}
    />
  );
};

// ── Animated fill (N2 → X-Team) ──
const ProgressLine = ({fromIndex, color, frame, startFrame, duration}) => {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fromY = START_Y + fromIndex * NODE_GAP + NODE_BOX / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_X + NODE_BOX / 2 - LINE_W / 2,
        top: fromY,
        width: LINE_W,
        height: (NODE_GAP - NODE_BOX) * progress,
        backgroundColor: color,
        borderRadius: LINE_W / 2,
        opacity: 0.75,
      }}
    />
  );
};

// ── Already-completed node (static checkmark from scene start) ──
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
          <path d="M5 13L9 17L19 7"/>
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
              <path d="M5 13L9 17L19 7"/>
            </svg>
            <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 38, color, letterSpacing: -0.5}}>{bonus}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── X-Team: activating node ──
const XTeamCompletingNode = ({frame, fps}) => {
  const yPos = START_Y + 3 * NODE_GAP;
  const color = BLUE;

  // Gray → blue color fade
  const colorProg = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Pulse ring (bursts as node activates)
  const pulseProgress = interpolate(frame, [0, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pulseOpacity  = interpolate(frame, [0, 18, 40], [0.55, 0.28, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pulseSize     = NODE_BOX + 44 * pulseProgress;

  // Checkmark (f40–80)
  const checkSp      = spring({frame: Math.max(0, frame - 40), fps, config: {damping: 10, stiffness: 160, mass: 0.5}});
  const checkScale   = frame >= 40 ? interpolate(checkSp, [0, 1], [0, 1]) : 0;
  const checkOpacity = interpolate(frame, [40, 52], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Earnings label (f80–120)
  const bonusOpacity = interpolate(frame, [80, 96], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bonusSp      = spring({frame: Math.max(0, frame - 80), fps, config: {damping: 12, stiffness: 120, mass: 0.5}});
  const bonusY       = frame >= 80 ? interpolate(bonusSp, [0, 1], [20, 0]) : 20;

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
      {/* Pulse ring */}
      <div
        style={{
          position: 'absolute',
          left: -((pulseSize - NODE_BOX) / 2),
          top:  -((pulseSize - NODE_BOX) / 2),
          width: pulseSize,
          height: pulseSize,
          borderRadius: pulseSize / 2,
          border: `3px solid ${color}`,
          opacity: pulseOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* Icon box — dual layer for smooth color transition */}
      <div
        style={{
          position: 'relative',
          width: NODE_BOX,
          height: NODE_BOX,
          borderRadius: 24,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Gray layer fades out */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 24,
            backgroundColor: '#E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 1 - colorProg,
          }}
        >
          <div style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#94A3B8'}} />
        </div>

        {/* Blue layer fades in */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 24,
            backgroundColor: color,
            boxShadow: `0 8px 28px ${color}44`,
            opacity: colorProg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              transform: `scale(${checkScale})`,
              opacity: checkOpacity,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13L9 17L19 7"/>
            </svg>
          </div>
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
            paddingLeft: 20, paddingRight: 20, paddingTop: 6, paddingBottom: 6,
          }}
        >
          <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 26, color, whiteSpace: 'nowrap'}}>Días 110–120</span>
        </div>
        <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 48, color: colors.dark, letterSpacing: -0.5}}>X-Team</div>
        <div
          style={{
            opacity: bonusOpacity,
            transform: `translateY(${bonusY}px)`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13L9 17L19 7"/>
          </svg>
          <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 38, color, letterSpacing: -0.5}}>$2,850 MXN</span>
        </div>
      </div>
    </div>
  );
};

export const Scene31XTeamCompleted = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Zoom out: 1.35 → 1
  const zoomSp     = spring({frame, fps, config: {damping: 16, stiffness: 90, mass: 0.7}});
  const sceneScale = interpolate(zoomSp, [0, 1], [1.35, 1]);
  const sceneOpacity = interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const titleOpacity = interpolate(frame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

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

        {/* Static gray background lines */}
        {PHASES.slice(0, -1).map((_, i) => (
          <StaticLine key={i} fromIndex={i} />
        ))}

        {/* Fully filled lines: Q→N1, N1→N2 */}
        <FilledLine fromIndex={0} color={PHASES[1].color} />
        <FilledLine fromIndex={1} color={PHASES[2].color} />

        {/* Animated fill: N2→X-Team (f0–40) */}
        <ProgressLine fromIndex={2} color={BLUE} frame={frame} startFrame={0} duration={40} />

        {/* Already-completed nodes */}
        {PHASES.slice(0, 3).map((p, i) => (
          <AlreadyCompleted key={i} index={i} color={p.color} label={p.label} days={p.days} bonus={p.bonus} />
        ))}

        {/* X-Team — activating */}
        <XTeamCompletingNode frame={frame} fps={fps} />
      </div>
    </AbsoluteFill>
  );
};
