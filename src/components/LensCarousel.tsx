import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { CarouselItem } from "../portfolio";

type Props = {
  items: CarouselItem[];
  /** width / height of each cover */
  aspect: number;
  label: string;
};

// ---------------------------------------------------------------------------
// Tunables (from the brief)
// ---------------------------------------------------------------------------
const PAD = 0.44; // render-target padding, fraction of viewport w/h on each side
const EASE = 0.09; // frame-normalised easing toward target
const FRICTION = 0.865; // frame-normalised inertia friction
const SNAP_IDLE_MS = 120;
const DRIFT_IDLE_MS = 1800;
const DRIFT_SPEED = 0.48; // px per 60Hz frame
const SHRINK_MAX = 0.07;
const SHRINK_SPEED = 60; // px/frame at which shrink saturates
const SHRINK_ATTACK = 0.25;
const SHRINK_RELEASE = 0.06;
const MAX_DPR = 2;
const MAX_TARGET_PIXELS = 9_000_000; // cap for padded render-target area (device px)

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tMap;
  uniform vec2 uRes;
  uniform vec2 uPad;
  uniform float uStrength;
  varying vec2 vUv;

  vec2 toTarget(vec2 uv) {
    return (uv * uRes + uPad) / (uRes + 2.0 * uPad);
  }

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = vUv - 0.5;
    p.x *= aspect;

    // rotate lens space 65deg clockwise
    float a = radians(65.0);
    vec2 q = vec2(cos(a) * p.x + sin(a) * p.y, -sin(a) * p.x + cos(a) * p.y);

    vec2 halfSize = vec2(0.565, 1.0) * max(1.0, aspect / (1440.0 / 1028.0));
    vec2 n = q / halfSize;
    float d = length(n);

    float influence = (1.0 - smoothstep(0.93, 1.0, d)) * uStrength;
    float rim = smoothstep(0.578, 1.0, d);

    float pl = length(p);
    vec2 dir = pl > 1e-5 ? p / pl : vec2(1.0, 0.0);
    vec2 tangent = vec2(-dir.y, dir.x);
    float az = atan(n.y, n.x);
    float weight = 0.55 * sin(2.0 * az) + 0.25 * sin(az);

    vec2 offsetP = tangent * weight * rim * 0.6 * min(pl, 0.7825) * influence;
    vec2 offset = vec2(offsetP.x / aspect, offsetP.y);
    vec2 uv = vUv + offset;

    float spread = smoothstep(0.55, 1.0, d) * influence;
    vec3 acc = vec3(0.0);
    vec3 wsum = vec3(0.0);
    const float sigma = 0.38;
    for (int i = 0; i < 12; i++) {
      float t = float(i) / 11.0;
      vec2 suv = uv + offset * (float(i) * 0.004) * spread;
      vec3 s = texture2D(tMap, toTarget(suv)).rgb;
      vec3 dt = vec3(t) - vec3(0.0, 0.5, 1.0);
      vec3 w = exp(-(dt * dt) / (2.0 * sigma * sigma));
      acc += s * w;
      wsum += w;
    }
    gl_FragColor = vec4(acc / wsum, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

function cardSize(W: number, aspect: number) {
  const phone = W < 640;
  const baseW = phone ? W * 0.64 : Math.min(W * 0.205, 470);
  let h = baseW / 1.509;
  if (aspect < 1) h *= 1.55; // portrait flyers get more height
  let w = h * aspect;
  const maxW = phone ? W * 0.86 : W * 0.42;
  if (w > maxW) {
    w = maxW;
    h = w / aspect;
  }
  return { w, h, gap: phone ? 10 : 14 };
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function LensCarousel({ items, aspect, label }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || fallback) return;
    if (!hasWebGL()) {
      setFallback(true);
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- renderer ---------------------------------------------------------
    const canvas = document.createElement("canvas");
    canvas.className = "lens-canvas";
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "region");
    canvas.setAttribute("aria-roledescription", "carrusel");
    canvas.setAttribute(
      "aria-label",
      `${label}: ${items.length} diseños. Usa las flechas izquierda y derecha para navegar.`,
    );
    stage.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      canvas.remove();
      setFallback(true);
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    const stripScene = new THREE.Scene();
    stripScene.background = new THREE.Color(0x121212);
    const stripCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: false,
    });

    const lensUniforms = {
      tMap: { value: target.texture },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPad: { value: new THREE.Vector2(0, 0) },
      uStrength: { value: reduce ? 1 : 0 },
    };
    const postScene = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postGeo = new THREE.PlaneGeometry(2, 2);
    const postMat = new THREE.ShaderMaterial({
      uniforms: lensUniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    postScene.add(new THREE.Mesh(postGeo, postMat));

    // --- cards --------------------------------------------------------------
    const cardGeo = new THREE.PlaneGeometry(1, 1);
    const loader = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];
    const materials = items.map((item) => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x1c1c1c,
        transparent: true,
        opacity: reduce ? 1 : 0,
      });
      loader.load(item.src, (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        const img = tex.image as HTMLImageElement;
        const imgAspect = img.width / img.height;
        if (imgAspect > aspect) {
          tex.repeat.set(aspect / imgAspect, 1);
          tex.offset.set((1 - aspect / imgAspect) / 2, 0);
        } else {
          tex.repeat.set(1, imgAspect / aspect);
          tex.offset.set(0, (1 - imgAspect / aspect) / 2);
        }
        textures.push(tex);
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
        requestFrame();
      });
      return mat;
    });

    let meshes: { mesh: THREE.Mesh; index: number; base: number }[] = [];
    const layout = { W: 1, H: 1, w: 1, h: 1, gap: 14, step: 1, L: 1, T: 1 };

    const buildMeshes = () => {
      meshes.forEach(({ mesh }) => stripScene.remove(mesh));
      meshes = [];
      const padW = layout.W * (1 + 2 * PAD);
      const n = Math.max(3, Math.ceil((padW + 2 * layout.w) / layout.L) + 1);
      layout.T = n * layout.L;
      for (let c = 0; c < n; c++) {
        items.forEach((_, i) => {
          const mesh = new THREE.Mesh(cardGeo, materials[i]);
          stripScene.add(mesh);
          meshes.push({ mesh, index: i, base: c * layout.L + i * layout.step });
        });
      }
    };

    const resize = () => {
      const W = Math.max(1, stage.clientWidth);
      const H = Math.max(1, stage.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);

      const px = W * PAD;
      const py = H * PAD;
      const padW = W + 2 * px;
      const padH = H + 2 * py;
      const targetDpr = Math.min(dpr, Math.sqrt(MAX_TARGET_PIXELS / (padW * padH)));
      target.setSize(Math.round(padW * targetDpr), Math.round(padH * targetDpr));
      lensUniforms.uRes.value.set(W, H);
      lensUniforms.uPad.value.set(px, py);

      stripCam.left = -padW / 2;
      stripCam.right = padW / 2;
      stripCam.top = padH / 2;
      stripCam.bottom = -padH / 2;
      stripCam.updateProjectionMatrix();

      const { w, h, gap } = cardSize(W, aspect);
      const prevStep = layout.step;
      Object.assign(layout, { W, H, w, h, gap, step: w + gap, L: items.length * (w + gap) });
      // keep the same card centred across resizes
      if (prevStep > 1) {
        const ratio = layout.step / prevStep;
        state.target *= ratio;
        state.current *= ratio;
      }
      buildMeshes();
      requestFrame();
    };

    // --- motion state -------------------------------------------------------
    const state = {
      target: 0,
      current: 0,
      impulse: 0,
      shrink: 0,
      dragging: false,
      hovered: false,
      focused: false,
      snapped: true,
      lastInput: performance.now(),
      lastX: 0,
      lastMoveT: 0,
      dragVel: 0,
      entryStart: -1,
    };

    const markInput = () => {
      state.lastInput = performance.now();
      state.snapped = false;
    };

    const wrap = (v: number) => {
      const T = layout.T;
      return ((((v + T / 2) % T) + T) % T) - T / 2;
    };

    // --- frame --------------------------------------------------------------
    let raf = 0;
    let wakeTimer = 0;
    let last = 0;
    let inView = false;
    let parentActive = true;
    let disposed = false;

    const ENTRY_RISE = 0.7;
    const ENTRY_STAGGER = 0.045;
    const ENTRY_GROW = 0.55;
    const ENTRY_LENS = 0.7;

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(last ? (now - last) / 1000 : 1 / 60, 0.05);
      last = now;
      const dtN = dt * 60;
      if (state.entryStart < 0) state.entryStart = now;
      const entryT = reduce ? 99 : (now - state.entryStart) / 1000;
      const visibleCount = Math.min(items.length, Math.ceil(layout.W / layout.step) + 2);
      const riseEnd = ENTRY_RISE + ENTRY_STAGGER * visibleCount;
      const entryDone = entryT > riseEnd + ENTRY_GROW + ENTRY_LENS;

      // inertia
      if (!state.dragging && !reduce && Math.abs(state.impulse) > 0.02) {
        state.target += state.impulse * dtN;
        state.impulse *= Math.pow(FRICTION, dtN);
        state.lastInput = now;
      } else if (!state.dragging) {
        state.impulse = 0;
      }

      const idle = now - state.lastInput;
      // snap after short idle
      if (!state.dragging && !state.snapped && idle > SNAP_IDLE_MS) {
        state.target = Math.round(state.target / layout.step) * layout.step;
        state.snapped = true;
      }
      // ambient drift
      const drifting =
        !reduce &&
        entryDone &&
        idle > DRIFT_IDLE_MS &&
        !state.hovered &&
        !state.focused &&
        !state.dragging;
      if (drifting) state.target += DRIFT_SPEED * dtN;

      const prev = state.current;
      if (reduce) state.current = state.target;
      else state.current += (state.target - state.current) * (1 - Math.pow(1 - EASE, dtN));

      const speed = Math.abs(state.current - prev) / Math.max(dtN, 1e-3);
      const desired = Math.min(speed / SHRINK_SPEED, 1) * SHRINK_MAX;
      const rate = desired > state.shrink ? SHRINK_ATTACK : SHRINK_RELEASE;
      state.shrink += (desired - state.shrink) * (1 - Math.pow(1 - rate, dtN));
      const s = 1 - state.shrink;

      // entrance: staggered rise -> grow to resting height -> lens in
      const growT = easeOut((entryT - riseEnd) / ENTRY_GROW);
      const heightScale = reduce ? 1 : 0.62 + 0.38 * growT;
      lensUniforms.uStrength.value = reduce
        ? 1
        : easeOut((entryT - riseEnd - ENTRY_GROW * 0.5) / ENTRY_LENS);

      // copies share a material, so opacity is resolved per item (max of its copies)
      const op = new Array<number>(items.length).fill(0);
      for (const m of meshes) {
        const x = wrap(m.base - state.current);
        let y = 0;
        let opacity = 1;
        if (!reduce && entryT < riseEnd) {
          // stagger by on-screen slot so the rise sweeps left -> right
          const slot = Math.max(0, Math.round((x + layout.W / 2) / layout.step));
          const local = easeOut((entryT - slot * ENTRY_STAGGER) / ENTRY_RISE);
          y = -(1 - local) * layout.H * 0.55;
          opacity = local;
        }
        m.mesh.position.set(x, y, 0);
        m.mesh.scale.set(layout.w * s, layout.h * s * heightScale, 1);
        if (Math.abs(x) < layout.W / 2 + layout.w) op[m.index] = Math.max(op[m.index], opacity);
        else op[m.index] = Math.max(op[m.index], entryT < riseEnd ? 0 : 1);
      }
      materials.forEach((mat, i) => (mat.opacity = op[i]));

      renderer.setRenderTarget(target);
      renderer.render(stripScene, stripCam);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);

      const settling =
        !entryDone ||
        drifting ||
        state.dragging ||
        Math.abs(state.target - state.current) > 0.05 ||
        state.shrink > 0.0005 ||
        !state.snapped ||
        Math.abs(state.impulse) > 0.02;
      if (settling) {
        requestFrame();
      } else {
        // fully at rest: sleep, and wake when drift is due (hover/focus/blur also wake us)
        last = 0;
        if (!reduce && !state.hovered && !state.focused) {
          window.clearTimeout(wakeTimer);
          wakeTimer = window.setTimeout(requestFrame, Math.max(16, DRIFT_IDLE_MS - idle + 16));
        }
      }
    };

    const running = () => inView && !document.hidden && parentActive && !disposed;
    function requestFrame() {
      if (!raf && running()) raf = requestAnimationFrame(frame);
    }
    const stop = () => {
      window.clearTimeout(wakeTimer);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };
    const updateRunning = () => (running() ? requestFrame() : stop());

    // --- input --------------------------------------------------------------
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      state.dragging = true;
      state.impulse = 0;
      state.dragVel = 0;
      state.lastX = e.clientX;
      state.lastMoveT = performance.now();
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add("is-dragging");
      markInput();
      requestFrame();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!state.dragging) return;
      const now = performance.now();
      const dx = e.clientX - state.lastX;
      const dtN = Math.max((now - state.lastMoveT) / (1000 / 60), 0.25);
      state.target -= dx;
      state.dragVel = state.dragVel * 0.6 + (-dx / dtN) * 0.4;
      state.lastX = e.clientX;
      state.lastMoveT = now;
      markInput();
      requestFrame();
    };
    const endDrag = (e: PointerEvent) => {
      if (!state.dragging) return;
      state.dragging = false;
      canvas.classList.remove("is-dragging");
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      const stale = performance.now() - state.lastMoveT > 90;
      state.impulse = reduce || stale ? 0 : Math.max(-80, Math.min(80, state.dragVel));
      markInput();
      requestFrame();
    };
    const onWheel = (e: WheelEvent) => {
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? layout.W : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      // horizontal wheel/trackpad always; vertical wheel only when the carousel is focused
      // or Shift is held, so normal page scrolling is never trapped.
      if (Math.abs(dx) > Math.abs(dy)) state.target += dx;
      else if (state.focused || e.shiftKey) state.target += dy;
      else return;
      e.preventDefault();
      state.impulse = 0;
      markInput();
      requestFrame();
    };
    const onKey = (e: KeyboardEvent) => {
      const step = layout.step;
      const base = Math.round(state.target / step) * step;
      if (e.key === "ArrowRight") state.target = base + step;
      else if (e.key === "ArrowLeft") state.target = base - step;
      else if (e.key === "Home") state.target = Math.round(state.current / layout.L) * layout.L;
      else return;
      e.preventDefault();
      state.impulse = 0;
      if (reduce) state.current = state.target;
      state.lastInput = performance.now();
      state.snapped = true;
      requestFrame();
    };
    const onEnter = () => {
      state.hovered = true;
      markInput();
      requestFrame();
    };
    const onLeave = () => {
      state.hovered = false;
      requestFrame();
    };
    const onFocus = () => {
      state.focused = true;
      requestFrame();
    };
    const onBlur = () => {
      state.focused = false;
      requestFrame();
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { active?: unknown } | null;
      if (data && typeof data.active === "boolean") {
        parentActive = data.active;
        updateRunning();
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("lostpointercapture", endDrag);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerenter", onEnter);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("focus", onFocus);
    canvas.addEventListener("blur", onBlur);
    window.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", updateRunning);

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        updateRunning();
      },
      { threshold: 0.05 },
    );
    io.observe(stage);
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    return () => {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("lostpointercapture", endDrag);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerenter", onEnter);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("focus", onFocus);
      canvas.removeEventListener("blur", onBlur);
      window.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", updateRunning);
      meshes.forEach(({ mesh }) => stripScene.remove(mesh));
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      cardGeo.dispose();
      postGeo.dispose();
      postMat.dispose();
      target.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [items, aspect, label, fallback]);

  return (
    <div className="lens-section">
      <div className="lens-stage" ref={stageRef}>
        {fallback && (
          <div className="lens-fallback" role="list" aria-label={label}>
            {items.map((item) => (
              <img
                role="listitem"
                key={item.src}
                src={item.src}
                alt={item.alt}
                loading="lazy"
                style={{ aspectRatio: String(aspect) }}
              />
            ))}
          </div>
        )}
      </div>
      <p className="lens-hint">Desliza o arrastra para explorar</p>
    </div>
  );
}
