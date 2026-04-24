import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Matter from "matter-js";

export type PhysicsPillsHandle = { replay: () => void };

export type PhysicsPill = {
  label: string;
  variant: number;
  level?: number;
};

type Props = {
  pills: PhysicsPill[];
  height?: number;
};

// Kitsys-style 12-variant palette (background / foreground)
const PALETTE: Array<{ bg: string; fg: string; bgTop: string; bgBottom: string }> = [
  { bg: "#0F1B4C", fg: "#FFFFFF", bgTop: "#1A2A66", bgBottom: "#08123A" },
  { bg: "#2747D8", fg: "#FFFFFF", bgTop: "#4664EE", bgBottom: "#1A35B8" },
  { bg: "#C9DAF8", fg: "#0B2A4A", bgTop: "#E0EBFC", bgBottom: "#A9C2EF" },
  { bg: "#1E3A8A", fg: "#FFFFFF", bgTop: "#2E50AC", bgBottom: "#142868" },
  { bg: "#B7B9F2", fg: "#1E2A6B", bgTop: "#CFD0F8", bgBottom: "#9B9DE5" },
  { bg: "#0F172A", fg: "#FFFFFF", bgTop: "#1E2942", bgBottom: "#070C1A" },
  { bg: "#DCE7FA", fg: "#0B2A4A", bgTop: "#EEF4FE", bgBottom: "#BFD2F2" },
  { bg: "#3B5BDB", fg: "#FFFFFF", bgTop: "#5878EE", bgBottom: "#2944B8" },
  { bg: "#1E40AF", fg: "#FFFFFF", bgTop: "#3056C8", bgBottom: "#142E88" },
  { bg: "#93C5FD", fg: "#0B2A4A", bgTop: "#B4D7FE", bgBottom: "#6FAEF6" },
  { bg: "#BFD7F2", fg: "#0B2A4A", bgTop: "#D6E5F8", bgBottom: "#9CBFE5" },
  { bg: "#1F2937", fg: "#FFFFFF", bgTop: "#324153", bgBottom: "#111722" },
];

type DragState =
  | { kind: "idle" }
  | {
      kind: "pending-drag";
      pointerId: number;
      body: Matter.Body;
      localOffset: { x: number; y: number };
      startClient: { x: number; y: number };
      startWorld: { x: number; y: number };
    }
  | {
      kind: "dragging";
      pointerId: number;
      body: Matter.Body;
      constraint: Matter.Constraint;
      localOffset: { x: number; y: number };
      samples: Array<{ t: number; x: number; y: number }>;
    };

type ExtBody = Matter.Body & {
  __label: string;
  __level?: number;
  __palette: (typeof PALETTE)[number];
  __w: number;
  __h: number;
  __spawnAt: number;
  __flashUntil?: number;
};

const WALL_T = 80;

export const PhysicsPills = forwardRef<PhysicsPillsHandle, Props>(function PhysicsPills(
  { pills, height = 720 },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const tagBarRef = useRef<HTMLDivElement>(null);

  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const wallsRef = useRef<Matter.Body[]>([]);
  const bodiesRef = useRef<ExtBody[]>([]);
  const dragRef = useRef<DragState>({ kind: "idle" });
  const visibleRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: height });
  const spawnTimersRef = useRef<number[]>([]);
  const reducedMotionRef = useRef(false);
  const hoveredRef = useRef<ExtBody | null>(null);
  const tagLockedRef = useRef<ExtBody | null>(null);
  const tagAutoHideRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const spawnAllRef = useRef<() => void>(() => {});

  const [showHint, setShowHint] = useState(false);

  const pillData = useMemo(
    () =>
      pills.map((p) => ({
        ...p,
        palette: PALETTE[p.variant % PALETTE.length] ?? PALETTE[0],
      })),
    [pills],
  );

  useImperativeHandle(ref, () => ({
    replay: () => spawnAllRef.current(),
  }));

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: reducedMotionRef.current ? 0 : 1, scale: 0.0011 },
      positionIterations: 10,
      velocityIterations: 8,
      constraintIterations: 3,
    });
    engineRef.current = engine;

    const runner = Matter.Runner.create({ delta: 1000 / 60 });
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    Matter.Events.on(engine, "collisionStart", (ev) => {
      const now = performance.now();
      for (const pair of ev.pairs) {
        const va = pair.bodyA.velocity;
        const vb = pair.bodyB.velocity;
        const rel = Math.hypot(va.x - vb.x, va.y - vb.y);
        if (rel > 6) {
          (pair.bodyA as ExtBody).__flashUntil = now + 120;
          (pair.bodyB as ExtBody).__flashUntil = now + 120;
        }
      }
    });

    const measurePill = (label: string) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return { w: 120, h: 44 };
      ctx.save();
      ctx.font = "600 16px Inter, system-ui, sans-serif";
      const w = Math.ceil(ctx.measureText(label).width) + 36;
      ctx.restore();
      return { w: Math.max(72, w), h: 44 };
    };

    const createPillBody = (
      label: string,
      level: number | undefined,
      palette: (typeof PALETTE)[number],
      w: number,
      h: number,
      x: number,
      y: number,
      angle: number,
    ): ExtBody => {
      const body = Matter.Bodies.rectangle(x, y, w, h, {
        chamfer: { radius: h / 2 },
        restitution: 0.18,
        friction: 0.22,
        frictionStatic: 0.6,
        frictionAir: 0.012,
        density: 0.0019,
        slop: 0.03,
        angle,
      }) as ExtBody;
      body.__label = label;
      body.__level = level;
      body.__palette = palette;
      body.__w = w;
      body.__h = h;
      body.__spawnAt = performance.now();
      return body;
    };

    const clearSpawnTimers = () => {
      for (const t of spawnTimersRef.current) clearTimeout(t);
      spawnTimersRef.current = [];
    };

    const spawnAll = () => {
      const eng = engineRef.current;
      if (!eng) return;
      for (const b of bodiesRef.current) Matter.World.remove(eng.world, b);
      bodiesRef.current = [];
      clearSpawnTimers();

      const { w } = sizeRef.current;
      if (w === 0) return;

      if (reducedMotionRef.current) {
        const cols = Math.max(2, Math.floor(w / 140));
        const gap = 12;
        pillData.forEach((p, i) => {
          const dim = measurePill(p.label);
          const cellW = w / cols;
          const cx = (i % cols) * cellW + cellW / 2;
          const cy = 60 + Math.floor(i / cols) * (dim.h + gap) + dim.h / 2;
          const body = createPillBody(p.label, p.level, p.palette, dim.w, dim.h, cx, cy, 0);
          Matter.World.add(eng.world, body);
          bodiesRef.current.push(body);
        });
        return;
      }

      const phi = 0.6180339887;
      pillData.forEach((p, i) => {
        const dim = measurePill(p.label);
        const xFrac = ((i + 1) * phi) % 1;
        const x = dim.w / 2 + 12 + xFrac * (w - dim.w - 24);
        const y = -dim.h * (2 + (i % 6));
        const angle = (Math.random() - 0.5) * 1.0;
        const delay = i * (90 + Math.random() * 50);
        const t = window.setTimeout(() => {
          if (!engineRef.current) return;
          const body = createPillBody(p.label, p.level, p.palette, dim.w, dim.h, x, y, angle);
          Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
          Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: 0 });
          Matter.World.add(engineRef.current.world, body);
          bodiesRef.current.push(body);
        }, delay);
        spawnTimersRef.current.push(t);
      });
    };
    spawnAllRef.current = spawnAll;

    const buildWalls = (w: number, h: number) => {
      for (const wallBody of wallsRef.current) Matter.World.remove(engine.world, wallBody);
      const opts = {
        isStatic: true,
        friction: 0.4,
        restitution: 0.1,
        render: { visible: false },
      };
      const floor = Matter.Bodies.rectangle(w / 2, h + WALL_T / 2, w * 2, WALL_T, opts);
      const ceil = Matter.Bodies.rectangle(
        w / 2,
        -WALL_T * 4 - WALL_T / 2,
        w * 2,
        WALL_T,
        opts,
      );
      const left = Matter.Bodies.rectangle(-WALL_T / 2, h / 2, WALL_T, h * 4, opts);
      const right = Matter.Bodies.rectangle(w + WALL_T / 2, h / 2, WALL_T, h * 4, opts);
      wallsRef.current = [floor, ceil, left, right];
      Matter.World.add(engine.world, wallsRef.current);
    };

    const setSize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = height;
      sizeRef.current = { w, h };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildWalls(w, h);
    };
    setSize();
    spawnAll();

    const onMql = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      engine.gravity.y = e.matches ? 0 : 1;
      spawnAll();
    };
    mql.addEventListener?.("change", onMql);

    const ro = new ResizeObserver(() => {
      setSize();
      spawnAll();
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visibleRef.current = e.isIntersecting;
      },
      { threshold: 0.05 },
    );
    io.observe(wrap);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      if (!visibleRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      const now = performance.now();
      for (const b of bodiesRef.current) {
        const dy = h - (b.position.y + b.__h / 2);
        if (dy >= 0 && dy < 30) {
          const alpha = (1 - dy / 30) * 0.18;
          ctx.save();
          ctx.fillStyle = `rgba(8, 18, 58, ${alpha})`;
          ctx.beginPath();
          ctx.ellipse(b.position.x, h - 4, b.__w * 0.45, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      for (const b of bodiesRef.current) {
        const { __w: w0, __h: h0, __palette: pal, __label } = b;
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);

        const grad = ctx.createLinearGradient(0, -h0 / 2, 0, h0 / 2);
        const flash = b.__flashUntil && now < b.__flashUntil;
        grad.addColorStop(0, flash ? lighten(pal.bgTop, 0.06) : pal.bgTop);
        grad.addColorStop(0.5, flash ? lighten(pal.bg, 0.06) : pal.bg);
        grad.addColorStop(1, pal.bgBottom);

        const r = h0 / 2;
        ctx.beginPath();
        roundRect(ctx, -w0 / 2, -h0 / 2, w0, h0, r);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        roundRect(ctx, -w0 / 2 + 1, -h0 / 2 + 1, w0 - 2, h0 / 2, r - 1);
        const hl = ctx.createLinearGradient(0, -h0 / 2, 0, 0);
        hl.addColorStop(0, "rgba(255,255,255,0.18)");
        hl.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = hl;
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = pal.fg;
        ctx.font = "600 16px Inter, system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(__label, 0, 1);

        ctx.restore();
      }

      const target = tagLockedRef.current ?? hoveredRef.current;
      const tag = tagRef.current;
      if (tag) {
        if (target && bodiesRef.current.includes(target)) {
          const x = target.position.x;
          const y = target.position.y - target.__h / 2 - 12;
          tag.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
          tag.style.opacity = "1";
        } else {
          tag.style.opacity = "0";
        }
      }
    };
    rafRef.current = requestAnimationFrame(render);

    const getLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const findPillAt = (x: number, y: number): ExtBody | null => {
      const hits = Matter.Query.point(bodiesRef.current, { x, y }) as ExtBody[];
      return hits[0] ?? null;
    };

    const showTagFor = (body: ExtBody) => {
      const tag = tagRef.current;
      const bar = tagBarRef.current;
      if (!tag) return;
      const labelEl = tag.querySelector("[data-label]") as HTMLElement | null;
      const pctEl = tag.querySelector("[data-pct]") as HTMLElement | null;
      if (labelEl) labelEl.textContent = body.__label;
      const lvl = Math.max(0, Math.min(100, Math.round(body.__level ?? 0)));
      if (pctEl) pctEl.textContent = `${lvl}%`;
      if (bar) {
        bar.style.width = `${lvl}%`;
        bar.style.background = `linear-gradient(90deg, ${body.__palette.bg}, ${body.__palette.bgTop})`;
      }
      if (tagAutoHideRef.current) clearTimeout(tagAutoHideRef.current);
      tagAutoHideRef.current = window.setTimeout(() => {
        tagLockedRef.current = null;
        hoveredRef.current = null;
      }, 2500);
    };

    const onPointerDown = (e: PointerEvent) => {
      const { x, y } = getLocal(e.clientX, e.clientY);
      const hit = findPillAt(x, y);
      if (!hit) {
        if (tagLockedRef.current) {
          tagLockedRef.current = null;
          hoveredRef.current = null;
        }
        return;
      }
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      const dx = x - hit.position.x;
      const dy = y - hit.position.y;
      const cos = Math.cos(-hit.angle);
      const sin = Math.sin(-hit.angle);
      const localBody = { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
      dragRef.current = {
        kind: "pending-drag",
        pointerId: e.pointerId,
        body: hit,
        localOffset: localBody,
        startClient: { x: e.clientX, y: e.clientY },
        startWorld: { x, y },
      };

      if (e.pointerType !== "mouse") {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = window.setTimeout(() => {
          const cur = dragRef.current;
          if (cur.kind === "pending-drag" && cur.body === hit) {
            tagLockedRef.current = hit;
            showTagFor(hit);
          }
        }, 200);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const { x, y } = getLocal(e.clientX, e.clientY);
      const state = dragRef.current;

      if (state.kind === "idle") {
        if (e.pointerType === "mouse") {
          const hit = findPillAt(x, y);
          hoveredRef.current = hit;
          if (hit) showTagFor(hit);
          canvas.style.cursor = hit ? "grab" : "default";
        }
        return;
      }

      if (state.kind === "pending-drag") {
        const dx = e.clientX - state.startClient.x;
        const dy = e.clientY - state.startClient.y;
        const total = Math.hypot(dx, dy);
        if (total < 6) return;
        if (e.pointerType !== "mouse" && Math.abs(dy) > Math.abs(dx) * 1.4) {
          try {
            canvas.releasePointerCapture(state.pointerId);
          } catch {}
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          dragRef.current = { kind: "idle" };
          return;
        }
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        const stiffness = e.pointerType === "mouse" ? 0.22 : 0.32;
        const constraint = Matter.Constraint.create({
          pointA: { x, y },
          bodyB: state.body,
          pointB: state.localOffset,
          stiffness,
          damping: 0.08,
          length: 0,
        });
        Matter.World.add(engine.world, constraint);
        canvas.style.cursor = "grabbing";
        dragRef.current = {
          kind: "dragging",
          pointerId: state.pointerId,
          body: state.body,
          constraint,
          localOffset: state.localOffset,
          samples: [{ t: performance.now(), x, y }],
        };
        return;
      }

      if (state.kind === "dragging") {
        state.constraint.pointA = { x, y };
        const v = state.body.velocity;
        const sp = Math.hypot(v.x, v.y);
        if (sp > 28) {
          Matter.Body.setVelocity(state.body, { x: (v.x / sp) * 28, y: (v.y / sp) * 28 });
        }
        const t = performance.now();
        state.samples.push({ t, x, y });
        while (state.samples.length > 1 && t - state.samples[0].t > 80) state.samples.shift();
      }
    };

    const finishPointer = (e: PointerEvent) => {
      const state = dragRef.current;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (state.kind === "dragging" && state.pointerId === e.pointerId) {
        const samples = state.samples;
        if (samples.length >= 2) {
          const a = samples[0];
          const b = samples[samples.length - 1];
          const dt = Math.max(1, b.t - a.t);
          let vx = ((b.x - a.x) / dt) * 16;
          let vy = ((b.y - a.y) / dt) * 16;
          const sp = Math.hypot(vx, vy);
          if (sp > 24) {
            vx = (vx / sp) * 24;
            vy = (vy / sp) * 24;
          }
          Matter.Body.setVelocity(state.body, { x: vx, y: vy });
        }
        Matter.World.remove(engine.world, state.constraint);
        try {
          canvas.releasePointerCapture(state.pointerId);
        } catch {}
        canvas.style.cursor = "default";
      } else if (state.kind === "pending-drag" && state.pointerId === e.pointerId) {
        try {
          canvas.releasePointerCapture(state.pointerId);
        } catch {}
      }
      dragRef.current = { kind: "idle" };
    };

    const onPointerLeave = () => {
      if (dragRef.current.kind === "idle") {
        hoveredRef.current = null;
        canvas.style.cursor = "default";
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerup", finishPointer);
    canvas.addEventListener("pointercancel", finishPointer);
    canvas.addEventListener("pointerleave", onPointerLeave);

    let lastScrollY = window.scrollY;
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        if (!visibleRef.current) {
          lastScrollY = window.scrollY;
          return;
        }
        const dy = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;
        const isCoarse = window.matchMedia("(pointer: coarse)").matches;
        if (isCoarse) return;
        const k = Math.max(-12, Math.min(12, dy)) * 0.0006;
        for (const b of bodiesRef.current) {
          Matter.Body.applyForce(b, b.position, {
            x: (Math.random() - 0.5) * 0.0006,
            y: -k,
          });
          const v = b.velocity;
          const sp = Math.hypot(v.x, v.y);
          if (sp > 12)
            Matter.Body.setVelocity(b, { x: (v.x / sp) * 12, y: (v.y / sp) * 12 });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Device motion / orientation tilt — pills react to phone tilt. Subtle
    // gravity bias on coarse pointers (touch devices) so the field feels
    // physically alive when the user moves the device.
    let baseGravityY = engine.gravity.y;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (!visibleRef.current || reducedMotionRef.current) return;
      // gamma: left/right tilt (-90..90), beta: front/back (-180..180)
      const gx = (e.gamma ?? 0) / 45; // normalize ~[-2..2]
      const gy = (e.beta ?? 0) / 90; // normalize ~[-2..2]
      engine.gravity.x = Math.max(-1.2, Math.min(1.2, gx)) * 0.6;
      engine.gravity.y = baseGravityY + Math.max(-0.5, Math.min(0.5, gy - 0.5)) * 0.4;
    };
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (isCoarsePointer && typeof window.DeviceOrientationEvent !== "undefined") {
      window.addEventListener("deviceorientation", onOrient, { passive: true });
    }

    try {
      if (!sessionStorage.getItem("pp:hint:v1")) {
        setShowHint(true);
        sessionStorage.setItem("pp:hint:v1", "1");
        setTimeout(() => setShowHint(false), 4500);
      }
    } catch {}

    return () => {
      mql.removeEventListener?.("change", onMql);
      ro.disconnect();
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearSpawnTimers();
      window.removeEventListener("scroll", onScroll);
      if (isCoarsePointer) window.removeEventListener("deviceorientation", onOrient);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", finishPointer);
      canvas.removeEventListener("pointercancel", finishPointer);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      engineRef.current = null;
      runnerRef.current = null;
      bodiesRef.current = [];
      wallsRef.current = [];
    };
  }, [height, pillData]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ height, touchAction: "pan-y" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block"
        style={{ touchAction: "pan-y" }}
      />
      <div
        ref={tagRef}
        className="pointer-events-none absolute left-0 top-0 z-10 transition-opacity duration-150"
        style={{ opacity: 0, willChange: "transform, opacity" }}
      >
        <div className="relative inline-flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-background/95 px-3 py-2 shadow-lg backdrop-blur min-w-[140px]">
          <div className="flex items-center justify-between gap-3 text-xs font-medium">
            <span data-label className="text-foreground" />
            <span data-pct className="tabular-nums text-muted-foreground" />
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              ref={tagBarRef}
              className="h-full rounded-full transition-[width] duration-200"
              style={{ width: "0%" }}
            />
          </div>
          <div className="absolute left-1/2 -bottom-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border/60 bg-background/95" />
        </div>
      </div>
      {showHint && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
          <span dir="auto">
            Hover or hold a pill to see its level · مرّر فوق العنصر أو اضغط مطولًا
          </span>
        </div>
      )}
    </div>
  );
});

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function lighten(hex: string, amount: number) {
  const m = hex.replace("#", "");
  const num = parseInt(m, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.min(255, Math.round(r + 255 * amount));
  g = Math.min(255, Math.round(g + 255 * amount));
  b = Math.min(255, Math.round(b + 255 * amount));
  return `rgb(${r}, ${g}, ${b})`;
}
