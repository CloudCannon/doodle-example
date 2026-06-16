import { useMemo } from "react";

const DOODLES: Record<string, string> = {
  star:    "M50 8 L60 38 L92 38 L66 58 L76 90 L50 70 L24 90 L34 58 L8 38 L40 38 Z",
  heart:   "M50 86 C8 56 14 18 38 20 C48 21 50 32 50 36 C50 32 52 21 62 20 C86 18 92 56 50 86 Z",
  spiral:  "M50 50 C50 42 60 42 60 50 C60 62 44 62 44 50 C44 34 64 34 64 50 C64 70 36 70 36 50 C36 26 70 26 70 50",
  sun:     "M50 30 A20 20 0 1 1 49.9 30 M50 6 L50 16 M50 84 L50 94 M6 50 L16 50 M84 50 L94 50 M18 18 L26 26 M74 74 L82 82 M82 18 L74 26 L74 26 M18 82 L26 74",
  smiley:  "M50 12 A38 38 0 1 1 49.9 12 M36 40 L36 46 M64 40 L64 46 M34 60 C42 74 58 74 66 60",
  bolt:    "M56 6 L26 52 L46 52 L40 94 L74 40 L52 40 Z",
  arrow:   "M12 64 C36 40 60 60 84 30 M84 30 L68 32 M84 30 L78 46",
  cloud:   "M22 66 C8 66 8 48 24 48 C24 32 50 30 54 46 C70 38 84 52 74 64 C82 66 82 66 80 66 Z",
  flower:  "M50 50 m0 -22 a11 13 0 1 1 -0.1 0 M50 50 m22 0 a13 11 0 1 1 0 -0.1 M50 50 m0 22 a11 13 0 1 1 0.1 0 M50 50 m-22 0 a13 11 0 1 1 0 0.1 M50 50 m-7 0 a7 7 0 1 1 0.1 0",
  squig:   "M8 50 Q22 24 36 50 T64 50 T92 50",
  sparkle: "M50 10 C52 40 60 48 90 50 C60 52 52 60 50 90 C48 60 40 52 10 50 C40 48 48 40 50 10 Z",
  wave:    "M8 40 Q20 24 32 40 T56 40 T80 40 M8 64 Q20 48 32 64 T56 64 T80 64",
};
const DOODLE_KEYS = Object.keys(DOODLES);

export default function Decorations() {
  const items = useMemo(() => {
    const rnd = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(91);
    const cols = ['var(--pink)','var(--cyan)','var(--yellow)','var(--blue)','var(--lime)'];
    return Array.from({ length: 22 }, (_, i) => ({
      kind: DOODLE_KEYS[Math.floor(rnd() * DOODLE_KEYS.length)],
      x: 2 + rnd() * 92, y: 2 + rnd() * 94, s: 46 + rnd() * 66,
      rot: -22 + rnd() * 44, col: cols[Math.floor(rnd() * cols.length)],
      seed: Math.floor(rnd() * 90), w: 2.6 + rnd() * 1.4, key: i,
    }));
  }, []);

  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:-1, pointerEvents:'none', overflow:'hidden' }}>
      {items.map(d => (
        <svg key={d.key} viewBox="-6 -6 112 112" width={d.s} height={d.s}
          style={{ position:'absolute', left:d.x+'%', top:d.y+'%', transform:`translate(-50%,-50%) rotate(${d.rot}deg)`, opacity:0.5 }}>
          <filter id={'rough'+d.key} x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed={d.seed} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <path d={DOODLES[d.kind]} fill="none" stroke={d.col} strokeWidth={d.w}
            strokeLinecap="round" strokeLinejoin="round" filter={`url(#rough${d.key})`} />
        </svg>
      ))}
    </div>
  );
}