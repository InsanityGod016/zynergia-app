import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 150 frames = 5s)
  f0–20    Title fades in (top of screen)
  f30–60   Q-Team card appears     — blue   #004AFE
  f60–90   Fast Start N1 appears   — purple #9333ea
  f90–120  Fast Start N2 appears   — amber  #d97706
  f120–150 X-Team appears          — green  #16a34a

  Colors & icons match the web landing page
  Layout: left-aligned cards with colored icon box + days chip + label
*/

// ── Phase data matching the landing page ──
const PHASES = [
  {
    label: 'Q-Team',
    days: 'Días 1–30',
    color: '#004AFE',
    startFrame: 30,
    icon: (
      // Users icon
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Fast Start Nivel 1',
    days: 'Días 35–60',
    color: '#9333ea',
    startFrame: 60,
    icon: (
      // Star icon
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    label: 'Fast Start Nivel 2',
    days: 'Días 75–90',
    color: '#d97706',
    startFrame: 90,
    icon: (
      // Trophy icon
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="8 21 12 21 16 21" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <path d="M7 4H17V13C17 15.76 14.76 18 12 18C9.24 18 7 15.76 7 13V4Z" />
        <path d="M7 6H3C3 6 3 12 7 13" />
        <path d="M17 6H21C21 6 21 12 17 13" />
      </svg>
    ),
  },
  {
    label: 'X-Team',
    days: 'Días 110–120',
    color: '#16a34a',
    startFrame: 120,
    icon: (
      // Zap icon
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
];

const NODE_BOX = 110;  // icon box size
const NODE_GAP = 280;  // vertical gap between card centers
const LINE_W = 4;
const LEFT_X = 100;    // left margin for cards

const ROADMAP_HEIGHT = (PHASES.length - 1) * NODE_GAP;
const START_Y = 340;   // fixed top — title sits above this

// ── Connecting line between two nodes ──
const ConnectingLine = ({fromIndex, startFrame, color, frame}) => {
  const drawProgress = interpolate(frame, [startFrame, startFrame + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (drawProgress <= 0) return null;

  const fromY = START_Y + fromIndex * NODE_GAP + NODE_BOX / 2;
  const lineHeight = (NODE_GAP - NODE_BOX) * drawProgress;

  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_X + NODE_BOX / 2 - LINE_W / 2,
        top: fromY,
        width: LINE_W,
        height: lineHeight,
        backgroundColor: color,
        opacity: 0.3,
        borderRadius: LINE_W / 2,
      }}
    />
  );
};

// ── Single phase card ──
const PhaseCard = ({phase, index, frame, fps}) => {
  const {startFrame, color, icon, label, days} = phase;

  const cardSpring = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: {damping: 12, stiffness: 140, mass: 0.6},
  });
  const cardScale = frame >= startFrame ? interpolate(cardSpring, [0, 1], [0.7, 1]) : 0.7;
  const cardOpacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textSpring = spring({
    frame: Math.max(0, frame - (startFrame + 6)),
    fps,
    config: {damping: 14, stiffness: 110, mass: 0.6},
  });
  const textX = frame >= startFrame + 6 ? interpolate(textSpring, [0, 1], [40, 0]) : 40;
  const textOpacity = interpolate(frame, [startFrame + 6, startFrame + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
        opacity: cardOpacity,
      }}
    >
      {/* Colored icon box */}
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
          transform: `scale(${cardScale})`,
          boxShadow: `0 8px 28px ${color}44`,
          position: 'relative',
        }}
      >
        {icon}
        {/* Number badge */}
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 16,
            color: '#fff',
          }}
        >
          {index + 1}
        </div>
      </div>

      {/* Text block */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateX(${textX}px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Days chip */}
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
          <span
            style={{
              fontFamily: font.family,
              fontWeight: font.semi,
              fontSize: 26,
              color,
              whiteSpace: 'nowrap',
            }}
          >
            {days}
          </span>
        </div>

        {/* Phase name */}
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 48,
            color: colors.dark,
            letterSpacing: -0.5,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};

// ── Main Scene ──
export const Scene23FastStartRoadmap = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleSpring = spring({frame, fps, config: {damping: 14, stiffness: 110, mass: 0.7}});
  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>

      {/* Title — fixed at top */}
      <div
        style={{
          position: 'absolute',
          left: LEFT_X,
          top: 160,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 80,
            color: colors.blue,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          Fast Start
        </div>
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.regular,
            fontSize: 34,
            color: colors.muted,
            marginTop: 12,
            letterSpacing: -0.2,
          }}
        >
          Programa de bonos — 120 días
        </div>
      </div>

      {/* Connecting lines */}
      {PHASES.slice(0, -1).map((phase, i) => (
        <ConnectingLine
          key={`line-${i}`}
          fromIndex={i}
          startFrame={phase.startFrame + 10}
          color={PHASES[i + 1].color}
          frame={frame}
        />
      ))}

      {/* Phase cards */}
      {PHASES.map((phase, i) => (
        <PhaseCard
          key={phase.label}
          phase={phase}
          index={i}
          frame={frame}
          fps={fps}
        />
      ))}
    </AbsoluteFill>
  );
};
