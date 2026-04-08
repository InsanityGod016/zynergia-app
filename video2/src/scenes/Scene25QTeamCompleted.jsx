import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 90 frames = 3s)
  f0–10    Roadmap zooms in (zoom back out from Scene24)
  f0–40    Q-Team node fills blue + checkmark appears
  f40–80   $1,900 MXN label fades in below Q-Team
  f80–90   Progress line starts filling toward Fast Start N1

  LAYOUT: same vertical roadmap as Scene23, Q-Team = completed
*/

const PHASES = [
  {label: 'Q-Team',             days: 'Días 1–30',   color: '#004AFE', startFrame: 30},
  {label: 'Fast Start Nivel 1', days: 'Días 35–60',  color: '#9333ea', startFrame: 60},
  {label: 'Fast Start Nivel 2', days: 'Días 75–90',  color: '#d97706', startFrame: 90},
  {label: 'X-Team',             days: 'Días 110–120',color: '#16a34a', startFrame: 120},
];

const NODE_BOX = 110;
const NODE_GAP = 280;
const LINE_W = 4;
const LEFT_X = 100;
const START_Y = 340;

// ── Static connecting line (already drawn) ──
const StaticLine = ({fromIndex, color}) => {
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

// ── Progress fill line (fills from completed node toward next) ──
const ProgressLine = ({fromIndex, frame}) => {
  const progress = interpolate(frame, [80, 90], [0, 0.35], {
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
        backgroundColor: '#004AFE',
        borderRadius: LINE_W / 2,
        opacity: 0.7,
      }}
    />
  );
};

export const Scene25QTeamCompleted = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Whole roadmap zooms back in ──
  const zoomSpring = spring({frame, fps, config: {damping: 14, stiffness: 100, mass: 0.8}});
  const sceneScale = interpolate(zoomSpring, [0, 1], [1.15, 1]);
  const sceneOpacity = interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // ── Title ──
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // ── Q-Team node: circle fills blue (already blue, just zoom in the check) ──
  const checkSpring = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: {damping: 10, stiffness: 160, mass: 0.5},
  });
  const checkScale = frame >= 20 ? interpolate(checkSpring, [0, 1], [0, 1]) : 0;
  const checkOpacity = interpolate(frame, [20, 32], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // ── Node pulse ring ──
  const pulseProgress = interpolate(frame, [0, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pulseOpacity = interpolate(frame, [0, 20, 40], [0.6, 0.3, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pulseSize = NODE_BOX + 40 * pulseProgress;

  // ── $1,900 earnings ──
  const earningsOpacity = interpolate(frame, [40, 58], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const earningsSpring = spring({
    frame: Math.max(0, frame - 40),
    fps,
    config: {damping: 12, stiffness: 120, mass: 0.5},
  });
  const earningsY = frame >= 40 ? interpolate(earningsSpring, [0, 1], [20, 0]) : 20;

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
        <div
          style={{
            position: 'absolute',
            left: LEFT_X,
            top: 160,
            opacity: titleOpacity,
          }}
        >
          <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 80, color: colors.blue, letterSpacing: -2, lineHeight: 1}}>
            Fast Start
          </div>
          <div style={{fontFamily: font.family, fontWeight: font.regular, fontSize: 34, color: colors.muted, marginTop: 12}}>
            Programa de bonos — 120 días
          </div>
        </div>

        {/* Static background lines */}
        {PHASES.slice(0, -1).map((_, i) => (
          <StaticLine key={`line-${i}`} fromIndex={i} color={PHASES[i + 1].color} />
        ))}

        {/* Progress fill (Q-Team → N1) */}
        <ProgressLine fromIndex={0} frame={frame} />

        {/* ── Q-Team node — COMPLETED ── */}
        <div
          style={{
            position: 'absolute',
            left: LEFT_X,
            top: START_Y,
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
              top: -((pulseSize - NODE_BOX) / 2),
              width: pulseSize,
              height: pulseSize,
              borderRadius: pulseSize / 2,
              border: `3px solid #004AFE`,
              opacity: pulseOpacity,
              pointerEvents: 'none',
            }}
          />

          {/* Completed icon box */}
          <div
            style={{
              width: NODE_BOX,
              height: NODE_BOX,
              borderRadius: 24,
              backgroundColor: '#004AFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 28px #004AFE44',
            }}
          >
            {/* White checkmark */}
            <div style={{transform: `scale(${checkScale})`, opacity: checkOpacity}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13L9 17L19 7" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
            <div
              style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                backgroundColor: '#004AFE14',
                border: '1.5px solid #004AFE33',
                borderRadius: 100,
                paddingLeft: 20,
                paddingRight: 20,
                paddingTop: 6,
                paddingBottom: 6,
              }}
            >
              <span style={{fontFamily: font.family, fontWeight: font.semi, fontSize: 26, color: '#004AFE', whiteSpace: 'nowrap'}}>
                Días 1–30
              </span>
            </div>
            <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 48, color: colors.dark, letterSpacing: -0.5}}>
              Q-Team
            </div>
            {/* Earnings */}
            <div
              style={{
                opacity: earningsOpacity,
                transform: `translateY(${earningsY}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#004AFE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13L9 17L19 7" />
              </svg>
              <span style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 38, color: '#004AFE', letterSpacing: -0.5}}>
                $1,900 MXN
              </span>
            </div>
          </div>
        </div>

        {/* ── Remaining nodes (inactive / gray) ── */}
        {PHASES.slice(1).map((phase, i) => {
          const idx = i + 1;
          const yPos = START_Y + idx * NODE_GAP;
          const nodeOpacity = interpolate(frame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <div
              key={phase.label}
              style={{
                position: 'absolute',
                left: LEFT_X,
                top: yPos,
                display: 'flex',
                alignItems: 'center',
                gap: 36,
                opacity: nodeOpacity * 0.45,
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
                    {phase.days}
                  </span>
                </div>
                <div style={{fontFamily: font.family, fontWeight: font.bold, fontSize: 48, color: '#94A3B8', letterSpacing: -0.5}}>
                  {phase.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
