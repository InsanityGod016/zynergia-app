import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Img} from 'remotion';
import {colors, font} from '../tokens';

/*
  TIMELINE (30fps, 120 frames = 4s)
  f0–30    Product grid fades in
  f30–60   "EssentOil+" card gets selected (highlight + scale)
  f60–90   "Registrar venta" button appears
  f90–120  Button tap animation

  LAYOUT: Title top + 2x2 grid of large product cards + button
  4 products, EssentOil+ selected
*/

const PRODUCTS = [
  {
    name: 'BelAge',
    image: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/911000.png',
  },
  {
    name: 'EssentOil+',
    image: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/300000-001.png',
  },
  {
    name: 'ZinoBiotic+',
    image: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/301390-002.png',
  },
  {
    name: 'Xtend',
    image: 'https://zinzinowebstorage.blob.core.windows.net/productimages/large/300520.png',
  },
];

const SELECTED_INDEX = 1; // EssentOil+

export const Scene18RegisterSale = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Grid fade in ──
  const gridSpring = spring({
    frame,
    fps,
    config: {damping: 16, stiffness: 100, mass: 0.7},
  });
  const gridOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const gridY = interpolate(gridSpring, [0, 1], [50, 0]);

  // ── Selection highlight ──
  const selectProgress = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Button appears ──
  const btnStart = 60;
  const btnSpring = spring({
    frame: Math.max(0, frame - btnStart),
    fps,
    config: {damping: 12, stiffness: 120, mass: 0.6},
  });
  const btnOpacity = interpolate(frame, [btnStart, btnStart + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const btnY = interpolate(btnSpring, [0, 1], [30, 0]);

  // ── Button tap animation ──
  const tapScale = interpolate(
    frame,
    [90, 100, 110, 120],
    [1, 0.95, 1.05, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 120,
          transform: `translateX(-50%) translateY(${gridY}px)`,
          opacity: gridOpacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 960,
        }}
      >
        {/* Title — pinned near top */}
        <div
          style={{
            fontFamily: font.family,
            fontWeight: font.bold,
            fontSize: 60,
            color: colors.dark,
            letterSpacing: -1.2,
            marginBottom: 64,
          }}
        >
          Registrar venta
        </div>

        {/* Product grid — 2x2 large cards */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 36,
            marginBottom: 64,
          }}
        >
          {PRODUCTS.map((product, i) => {
            const isSelected = i === SELECTED_INDEX;
            const cardScale = isSelected
              ? interpolate(selectProgress, [0, 1], [1, 1.08])
              : 1;
            const borderColor = isSelected
              ? `rgba(0,74,254,${interpolate(selectProgress, [0, 1], [0, 0.5])})`
              : 'rgba(0,0,0,0.06)';
            const shadow = isSelected && selectProgress > 0.5
              ? '0 12px 40px rgba(0,74,254,0.18)'
              : '0 4px 12px rgba(0,0,0,0.04)';

            return (
              <div
                key={product.name}
                style={{
                  width: 430,
                  backgroundColor: colors.white,
                  border: `2.5px solid ${borderColor}`,
                  borderRadius: 32,
                  padding: '40px 32px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 20,
                  transform: `scale(${cardScale})`,
                  boxShadow: shadow,
                  position: 'relative',
                }}
              >
                {/* Product image */}
                <Img
                  src={product.image}
                  style={{
                    width: 280,
                    height: 280,
                    objectFit: 'contain',
                  }}
                />

                {/* Product name */}
                <div
                  style={{
                    fontFamily: font.family,
                    fontWeight: isSelected && selectProgress > 0.5 ? font.bold : font.medium,
                    fontSize: 36,
                    color: isSelected && selectProgress > 0.5 ? colors.blue : colors.dark,
                    textAlign: 'center',
                    letterSpacing: -0.3,
                  }}
                >
                  {product.name}
                </div>

                {/* Selected check badge */}
                {isSelected && selectProgress > 0.8 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.blue,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: interpolate(selectProgress, [0.8, 1], [0, 1]),
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13L10 18L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Register button */}
        <div
          style={{
            opacity: btnOpacity,
            transform: `translateY(${btnY}px) scale(${tapScale})`,
            width: '100%',
          }}
        >
          <div
            style={{
              backgroundColor: colors.blue,
              borderRadius: 28,
              padding: '34px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,74,254,0.3)',
            }}
          >
            <span
              style={{
                fontFamily: font.family,
                fontWeight: font.bold,
                fontSize: 40,
                color: colors.white,
                letterSpacing: -0.3,
              }}
            >
              Registrar venta
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
