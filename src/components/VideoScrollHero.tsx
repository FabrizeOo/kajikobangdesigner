import { useEffect, useRef } from "react";
import crown from "../assets/stickers/crown.webp";
import heart from "../assets/stickers/heart-flame.webp";
import star from "../assets/stickers/star.webp";

const FRAME_COUNT = 188;
const STATIC_FRAME = 150;
const frameUrl = (i: number) =>
  `${import.meta.env.BASE_URL}videoscroll/f${String(i).padStart(3, "0")}.webp`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** in over [a,b], out over [c,d] -> 0..1..0 */
const window4 = (p: number, a: number, b: number, c: number, d: number) =>
  Math.min(easeOut(ramp(p, a, b)), 1 - ramp(p, c, d));

export default function VideoScrollHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const outroRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const crownRef = useRef<HTMLImageElement>(null);
  const heartRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = window.innerWidth < 700 ? 2 : 1; // lighter sequence on phones
    const frames: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
    let disposed = false;

    // load order: first frame, then coarse -> fine so scrubbing works early
    const order: number[] = [];
    const seen = new Set<number>();
    for (const stride of [16, 8, 4, 2, 1]) {
      if (stride < step) break;
      for (let i = 0; i < FRAME_COUNT; i += stride) {
        if (!seen.has(i)) {
          seen.add(i);
          order.push(i);
        }
      }
    }
    if (reduce) order.splice(0, order.length, STATIC_FRAME);

    let cursor = 0;
    let inflight = 0;
    const pump = () => {
      while (!disposed && inflight < 6 && cursor < order.length) {
        const i = order[cursor++];
        const img = new Image();
        img.decoding = "async";
        img.src = frameUrl(i);
        inflight++;
        img
          .decode()
          .then(() => {
            if (disposed) return;
            frames[i] = img;
            if (Math.abs(i - drawn) < 24 || drawn < 0) needsDraw = true;
            if (reduce) draw(STATIC_FRAME);
            else kick();
          })
          .catch(() => {})
          .finally(() => {
            inflight--;
            pump();
          });
      }
    };

    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      needsDraw = true;
      kick();
    };

    const nearestLoaded = (i: number) => {
      for (let d = 0; d < FRAME_COUNT; d++) {
        if (frames[i - d]) return i - d;
        if (frames[i + d]) return i + d;
      }
      return -1;
    };

    let drawn = -1;
    let needsDraw = true;
    const draw = (f: number) => {
      const idx = nearestLoaded(Math.round(f));
      if (idx < 0) return;
      if (idx === drawn && !needsDraw) return;
      const img = frames[idx]!;
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      drawn = idx;
      needsDraw = false;
    };

    const progress = () => {
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      return total > 0 ? clamp01(-r.top / total) : 0;
    };

    const applyOverlays = (p: number) => {
      const intro = introRef.current;
      if (intro) {
        const out = ramp(p, 0.04, 0.2);
        intro.style.opacity = String(1 - out);
        intro.style.transform = `translate3d(0, ${-out * 90}px, 0)`;
      }
      const cue = cueRef.current;
      if (cue) cue.style.opacity = String(1 - ramp(p, 0, 0.05));

      wordsRef.current.forEach((el, i) => {
        if (!el) return;
        const a = 0.26 + i * 0.07;
        const v = window4(p, a, a + 0.1, 0.58 + i * 0.025, 0.66 + i * 0.025);
        const dir = i % 2 ? 1 : -1;
        el.style.opacity = String(v);
        el.style.transform = `translate3d(${dir * (1 - v) * 14}vw, 0, 0)`;
      });

      const outro = outroRef.current;
      if (outro) {
        const v = easeOut(ramp(p, 0.74, 0.88));
        outro.style.opacity = String(v);
        outro.style.transform = `translate3d(0, ${(1 - v) * 50}px, 0)`;
        outro.style.pointerEvents = v > 0.5 ? "auto" : "none";
      }
      if (crownRef.current) {
        const v = 1 - ramp(p, 0.04, 0.18);
        crownRef.current.style.opacity = String(v);
        crownRef.current.style.transform = `translate3d(0, ${-p * 260}px, 0) rotate(${p * 30}deg)`;
      }
      if (heartRef.current) {
        const v = window4(p, 0.62, 0.78, 0.97, 1.01);
        heartRef.current.style.opacity = String(v);
        heartRef.current.style.transform = `translate3d(0, ${(1 - v) * 80}px, 0) rotate(${(1 - v) * 18 + 8}deg) scale(${0.9 + v * 0.1})`;
      }
      if (barRef.current) barRef.current.style.transform = `scaleY(${p})`;
      if (counterRef.current)
        counterRef.current.textContent = String(Math.round(p * (FRAME_COUNT - 1)) + 1).padStart(
          3,
          "0",
        );
    };

    let raf = 0;
    let last = 0;
    let shown = progress();
    let inView = true;

    const tick = (now: number) => {
      raf = 0;
      const dtN = Math.min(last ? (now - last) / (1000 / 60) : 1, 3);
      last = now;
      const target = progress();
      shown += (target - shown) * (1 - Math.pow(1 - 0.16, dtN));
      if (Math.abs(target - shown) < 0.0004) shown = target;
      draw(shown * (FRAME_COUNT - 1));
      applyOverlays(shown);
      if (shown !== target || needsDraw) kick();
      else last = 0;
    };
    function kick() {
      if (!raf && inView && !disposed && !reduce) raf = requestAnimationFrame(tick);
    }

    if (reduce) {
      // reduced motion: no scrubbing, a single still of the mask with all copy visible
      section.classList.add("is-static");
      const ro = new ResizeObserver(() => {
        resize();
        draw(STATIC_FRAME);
      });
      ro.observe(canvas);
      pump();
      return () => {
        disposed = true;
        ro.disconnect();
      };
    }

    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView) kick();
    });
    io.observe(section);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const onScroll = () => kick();
    window.addEventListener("scroll", onScroll, { passive: true });
    resize();
    applyOverlays(shown);
    pump();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section id="inicio" className="vs-hero" ref={sectionRef}>
      <div className="vs-sticky">
        <canvas ref={canvasRef} className="vs-canvas" aria-hidden="true" />
        <div className="vs-shade" />

        <div className="vs-intro" ref={introRef}>
          <img ref={crownRef} className="vs-crown" src={crown} alt="" aria-hidden="true" />
          <p className="hero-kicker">
            PORTFOLIO 2026 <i /> DISEÑADOR GRÁFICO <i /> PERÚ
          </p>
          <h1 className="vs-title">
            <span>KAJIKO</span>
            <span>BANG</span>
          </h1>
          <p className="script-note vs-note">
            Para artistas, streamers y marcas.<span>×</span>
          </p>
        </div>

        <div className="vs-words" aria-hidden="true">
          {["BANNERS", "OVERLAYS", "THUMBNAILS"].map((w, i) => (
            <span key={w} ref={(el) => void (wordsRef.current[i] = el)}>
              {w}
            </span>
          ))}
        </div>

        <img ref={heartRef} className="vs-heart" src={heart} alt="" aria-hidden="true" />
        <div className="vs-outro" ref={outroRef}>
          <p className="vs-outro-copy">
            Banners, overlays, thumbnails y flyers. Photoshop, Illustrator & Figma.
          </p>
          <div className="hero-actions">
            <a className="button button--primary" href="#trabajos">
              VER TRABAJOS <span aria-hidden="true">→</span>
            </a>
            <a className="button button--outline" href="#contacto">
              CONTRATAR
            </a>
          </div>
        </div>

        <div className="vs-cue" ref={cueRef}>
          <img src={star} alt="" aria-hidden="true" />
          <span>SCROLL</span>
          <i />
        </div>
        <div className="vs-meter" aria-hidden="true">
          <span ref={barRef} />
        </div>
        <p className="vs-counter" aria-hidden="true">
          <span ref={counterRef}>001</span> / {FRAME_COUNT}
        </p>
      </div>
    </section>
  );
}
