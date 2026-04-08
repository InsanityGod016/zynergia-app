import { useEffect, useRef, useState } from 'react';

const BASE = '/animations/hero-task-complete/';
const FRAME_COUNT = 195;
const FPS = 30;
const MS_PER_FRAME = 1000 / FPS;

function frameSrc(n) {
  return BASE + 'ezgif-frame-' + String(n).padStart(3, '0') + '.png';
}

// Build all paths upfront — no probing needed
const ALL_FRAMES = Array.from({ length: FRAME_COUNT }, (_, i) => frameSrc(i + 1));

export default function HeroTaskAnimation() {
  const imgRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(null);
  const idxRef = useRef(0);
  const lastTsRef = useRef(null);
  const playedRef = useRef(false);
  const [ready, setReady] = useState(false);

  // Preload first frame immediately, lazy-preload the rest
  useEffect(() => {
    // Frame 1 shown right away
    if (imgRef.current) imgRef.current.src = ALL_FRAMES[0];

    // Preload remaining frames in background without blocking render
    let i = 1;
    function loadNext() {
      if (i >= ALL_FRAMES.length) {
        setReady(true);
        return;
      }
      const img = new Image();
      img.onload = img.onerror = () => {
        i++;
        // Yield to browser between each load to avoid blocking
        requestIdleCallback ? requestIdleCallback(loadNext) : setTimeout(loadNext, 0);
      };
      img.src = ALL_FRAMES[i];
    }

    // Start preloading after a short delay so page renders first
    const t = setTimeout(loadNext, 200);
    return () => clearTimeout(t);
  }, []);

  // IntersectionObserver — play once when section enters viewport
  useEffect(() => {
    function play() {
      idxRef.current = 0;
      lastTsRef.current = null;

      function step(ts) {
        if (!lastTsRef.current) lastTsRef.current = ts;

        if (ts - lastTsRef.current >= MS_PER_FRAME) {
          if (imgRef.current) imgRef.current.src = ALL_FRAMES[idxRef.current];
          idxRef.current += 1;
          lastTsRef.current = ts;
        }

        if (idxRef.current < ALL_FRAMES.length) {
          rafRef.current = requestAnimationFrame(step);
        }
      }

      rafRef.current = requestAnimationFrame(step);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !playedRef.current) {
          playedRef.current = true;
          observer.disconnect();
          play();
        }
      },
      { threshold: 0.3 }
    );

    if (wrapRef.current) observer.observe(wrapRef.current);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={wrapRef} className="max-w-[520px] mx-auto mt-8">
      <img
        ref={imgRef}
        src={ALL_FRAMES[0]}
        alt="Zynergia en acción"
        className="w-full h-auto block rounded-2xl shadow-xl"
        draggable={false}
      />
    </div>
  );
}
