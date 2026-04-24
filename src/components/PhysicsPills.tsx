import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import Matter from "matter-js";

interface PillData {
  label: string;
  variant: number;
}

interface Props {
  pills: PillData[];
  height?: number;
  className?: string;
}

export interface PhysicsPillsHandle {
  replay: () => void;
}

/**
 * Kitsys-faithful palette: soft pastels + bold blue accents on neutral fg.
 * Mirrors the original "fallbox" v1..v12 styling — flat solid pills, no
 * gradients, no borders, no shadows beyond a soft contact ellipse.
 */
const PALETTE: { bg: string; fg: string }[] = [
  // Balanced for dark backgrounds: neutrals + warm + a couple of brand accents.
  { bg: "#F1F5F9", fg: "#0F172A" }, // porcelain
  { bg: "#1E293B", fg: "#F1F5F9" }, // slate-800
  { bg: "#E2E8F0", fg: "#1E293B" }, // slate-200
  { bg: "#0F172A", fg: "#F1F5F9" }, // near-black
  { bg: "#FCD9B6", fg: "#3B2A14" }, // warm peach
  { bg: "#4338CA", fg: "#FFFFFF" }, // indigo accent
  { bg: "#FAFAF9", fg: "#27272A" }, // off-white
  { bg: "#334155", fg: "#F8FAFC" }, // slate-700
  { bg: "#C4B5FD", fg: "#2E1065" }, // soft violet
  { bg: "#1D4ED8", fg: "#FFFFFF" }, // brand blue (used sparingly)
  { bg: "#E7E5E4", fg: "#1C1917" }, // stone
  { bg: "#A7F3D0", fg: "#064E3B" }, // mint accent
];

export const PhysicsPills = forwardRef<PhysicsPillsHandle, Props>(function PhysicsPills(
  { pills, height = 720, className = "" },
  ref,
) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const worldRef = useRef<Matter.World | null>(null);
  const spawnTimersRef = useRef<number[]>([]);
  const spawnFnRef = useRef<(() => void) | null>(null);
  const [started, setStarted] = useState(false);

  useImperativeHandle(ref, () => ({
    replay: () => {
      if (spawnFnRef.current) spawnFnRef.current();
    },
  }));

  // Trigger only when the section enters the viewport — saves CPU above the fold.
  useEffect(() => {
    if (!sceneRef.current) return;
    const el = sceneRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setStarted(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: "-8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started || !sceneRef.current || !canvasRef.current) return;
    const container = sceneRef.current;
    const width = container.clientWidth;
    const h = height;

    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;

    const engine = Engine.create({
      // Slightly heavier gravity for a Kitsys-style weighty drop.
      gravity: { x: 0, y: 1, scale: 0.0017 },
      positionIterations: 14,
      velocityIterations: 12,
      constraintIterations: 4,
    });
    engineRef.current = engine;
    worldRef.current = engine.world;

    const render = Render.create({
      canvas: canvasRef.current,
      engine,
      options: {
        width,
        height: h,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio || 1,
      },
    });

    const ctx = canvasRef.current.getContext("2d")!;

    // Sizing — Kitsys-style chunky pills with generous padding.
    const isMobile = width < 640;
    const FONT_SIZE = isMobile ? 17 : 19;
    const PAD_X = isMobile ? 22 : 26;
    const PILL_H = isMobile ? 44 : 52;
    const MIN_W = 90;

    ctx.font = `600 ${FONT_SIZE}px Inter, system-ui, sans-serif`;

    const measured = pills.map((p) => {
      const textW = ctx.measureText(p.label).width;
      return Math.max(MIN_W, textW + PAD_X * 2);
    });

    // Walls flush with visible edges.
    const WALL_T = 60;
    const wallOpts = {
      isStatic: true,
      friction: 0.04,
      frictionStatic: 0.4,
      restitution: 0.02,
      slop: 0.04,
      render: { visible: false },
    };
    const floor = Bodies.rectangle(width / 2, h + WALL_T / 2, width * 2, WALL_T, wallOpts);
    const leftWall = Bodies.rectangle(-WALL_T / 2, h / 2, WALL_T, h * 2, wallOpts);
    const rightWall = Bodies.rectangle(width + WALL_T / 2, h / 2, WALL_T, h * 2, wallOpts);
    const topWall = Bodies.rectangle(width / 2, -WALL_T / 2 - 200, width * 2, WALL_T, wallOpts);
    Composite.add(engine.world, [floor, leftWall, rightWall, topWall]);

    const makePillBody = (i: number): Matter.Body => {
      const p = pills[i];
      const palette = PALETTE[(p.variant - 1 + PALETTE.length) % PALETTE.length];
      const w = measured[i];
      const hh = PILL_H;
      const margin = w / 2 + 10;
      const usable = Math.max(1, width - margin * 2);
      const phi = 0.61803398875;
      const t = (i * phi) % 1;
      const x = margin + t * usable + (Math.random() - 0.5) * 14;
      const y = -hh - 40 - (i % 4) * 110 - Math.random() * 90;
      const body = Bodies.rectangle(x, y, w, hh, {
        chamfer: { radius: hh / 2 },
        // Lower restitution + higher friction = Kitsys dead-weight settle.
        restitution: 0.05,
        friction: 0.32,
        frictionStatic: 0.7,
        frictionAir: 0.014,
        density: 0.002,
        angle: (Math.random() - 0.5) * 0.5,
        slop: 0.04,
        render: { fillStyle: "transparent", strokeStyle: "transparent", lineWidth: 0 },
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 0.7, y: 0 });
      const anyB = body as unknown as Record<string, unknown>;
      anyB.__label = p.label;
      anyB.__fg = palette.fg;
      anyB.__bg = palette.bg;
      anyB.__w = w;
      anyB.__h = hh;
      anyB.__spawnAt = performance.now();
      return body;
    };

    const clearTimers = () => {
      spawnTimersRef.current.forEach((id) => window.clearTimeout(id));
      spawnTimersRef.current = [];
    };

    const spawnAll = () => {
      clearTimers();
      if (worldRef.current) {
        bodiesRef.current.forEach((b) => Composite.remove(worldRef.current!, b));
      }
      bodiesRef.current = [];

      pills.forEach((_, i) => {
        const delay = 220 + i * (95 + Math.random() * 55);
        const id = window.setTimeout(() => {
          if (!worldRef.current) return;
          const body = makePillBody(i);
          bodiesRef.current.push(body);
          Composite.add(worldRef.current, body);
        }, delay);
        spawnTimersRef.current.push(id);
      });
    };

    spawnFnRef.current = spawnAll;
    spawnAll();

    const cleanupId = window.setInterval(() => {
      if (!worldRef.current) return;
      const toRemove: Matter.Body[] = [];
      for (const b of bodiesRef.current) {
        const x = b.position.x;
        const y = b.position.y;
        if (y > h + 200 || y < -400 || x < -150 || x > width + 150) {
          toRemove.push(b);
        }
      }
      if (toRemove.length) {
        toRemove.forEach((b) => Composite.remove(worldRef.current!, b));
        bodiesRef.current = bodiesRef.current.filter((b) => !toRemove.includes(b));
      }
    }, 500);

    // ---- Mouse / touch ----
    const canvasEl = canvasRef.current;
    const mouse = Mouse.create(canvasEl);
    const m = mouse as unknown as {
      element?: HTMLElement;
      mousewheel?: EventListener;
      touchmove?: EventListener;
      touchstart?: EventListener;
      touchend?: EventListener;
    };
    if (m.element && m.mousewheel) m.element.removeEventListener("wheel", m.mousewheel);
    if (m.element && m.touchmove) m.element.removeEventListener("touchmove", m.touchmove);
    if (m.element && m.touchstart) m.element.removeEventListener("touchstart", m.touchstart);
    if (m.element && m.touchend) m.element.removeEventListener("touchend", m.touchend);

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.22, damping: 0.2, render: { visible: false } },
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    type Sample = { x: number; y: number; t: number };
    const samples: Sample[] = [];
    const MAX_SAMPLES = 6;
    const THROW_WINDOW_MS = 80;
    const MAX_THROW = 22;
    let savedFrictionAir: number | null = null;
    let savedFriction: number | null = null;
    let savedDensity: number | null = null;
    let draggedBody: Matter.Body | null = null;

    const pushSample = () => {
      const pos = (mouse as unknown as { position?: { x: number; y: number } }).position;
      if (!pos) return;
      samples.push({ x: pos.x, y: pos.y, t: performance.now() });
      if (samples.length > MAX_SAMPLES) samples.shift();
    };

    Matter.Events.on(mouseConstraint, "startdrag", (e) => {
      draggedBody = (e as unknown as { body: Matter.Body }).body;
      if (draggedBody) {
        savedFrictionAir = draggedBody.frictionAir;
        savedFriction = draggedBody.friction;
        savedDensity = draggedBody.density;
        draggedBody.frictionAir = 0.001;
        draggedBody.friction = 0;
        Matter.Body.setDensity(draggedBody, Math.max(0.0008, (savedDensity ?? 0.002) * 0.7));
      }
      samples.length = 0;
      pushSample();
      canvasEl.style.cursor = "grabbing";
    });

    Matter.Events.on(mouseConstraint, "enddrag", () => {
      const body = draggedBody;
      if (body && savedFrictionAir !== null) body.frictionAir = savedFrictionAir;
      if (body && savedFriction !== null) body.friction = savedFriction;
      if (body && savedDensity !== null) Matter.Body.setDensity(body, savedDensity);
      if (body && samples.length >= 2) {
        const now = performance.now();
        const recent = samples.filter((s) => now - s.t <= THROW_WINDOW_MS);
        const first = recent[0] ?? samples[0];
        const last = samples[samples.length - 1];
        const dt = Math.max(1, last.t - first.t);
        let vx = ((last.x - first.x) / dt) * 16;
        let vy = ((last.y - first.y) / dt) * 16;
        const sp = Math.hypot(vx, vy);
        if (sp > MAX_THROW) {
          const k = MAX_THROW / sp;
          vx *= k;
          vy *= k;
        }
        if (sp > 1.2) {
          Matter.Body.setVelocity(body, { x: vx * 0.95, y: vy * 0.95 });
        }
      }
      draggedBody = null;
      savedFrictionAir = null;
      savedFriction = null;
      savedDensity = null;
      samples.length = 0;
      canvasEl.style.cursor = "grab";
    });

    Matter.Events.on(engine, "beforeUpdate", () => {
      if (draggedBody) pushSample();
    });

    // Settle damper — kills jitter so pills come to rest cleanly.
    Matter.Events.on(engine, "afterUpdate", () => {
      const now = performance.now();
      for (const b of bodiesRef.current) {
        if ((mouseConstraint as unknown as { body?: Matter.Body }).body === b) continue;
        if (Math.abs(b.angularVelocity) > 0.4) {
          Matter.Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 0.4);
        }
        const anyB = b as unknown as { __spawnAt?: number };
        const spawnAt = anyB.__spawnAt;
        if (spawnAt && now - spawnAt < 1500) {
          Matter.Body.setVelocity(b, { x: b.velocity.x * 0.985, y: b.velocity.y * 0.985 });
        }
        const sp = Math.hypot(b.velocity.x, b.velocity.y);
        if (sp < 0.07 && Math.abs(b.angularVelocity) < 0.025) {
          Matter.Body.setVelocity(b, { x: 0, y: 0 });
          Matter.Body.setAngularVelocity(b, 0);
        }
      }
    });

    let lastHoverCheck = 0;
    const onMouseMove = (e: MouseEvent) => {
      if (draggedBody) return;
      const now = performance.now();
      if (now - lastHoverCheck < 16) return;
      lastHoverCheck = now;
      const rect = canvasEl.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const hit = Matter.Query.point(bodiesRef.current, pt)[0];
      canvasEl.style.cursor = hit ? "grab" : "default";
    };
    canvasEl.addEventListener("mousemove", onMouseMove);

    // Forgiving grab for clicks just outside a pill.
    const GRAB_RADIUS = 28;
    const onMouseDownPick = () => {
      const mc = mouseConstraint as unknown as {
        body: Matter.Body | null;
        constraint: {
          pointA: { x: number; y: number };
          bodyB: Matter.Body;
          pointB: { x: number; y: number };
        };
      };
      if (mc.body) return;
      const pos = (mouse as unknown as { position?: { x: number; y: number } }).position;
      if (!pos) return;
      const exact = Matter.Query.point(bodiesRef.current, pos)[0];
      if (exact) return;
      let target: Matter.Body | null = null;
      let bestDist = GRAB_RADIUS * GRAB_RADIUS;
      for (const b of bodiesRef.current) {
        const dx = b.position.x - pos.x;
        const dy = b.position.y - pos.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
          bestDist = d2;
          target = b;
        }
      }
      if (target) {
        const dx = pos.x - target.position.x;
        const dy = pos.y - target.position.y;
        const cos = Math.cos(-target.angle);
        const sin = Math.sin(-target.angle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        mc.body = target;
        mc.constraint.pointA = { x: pos.x, y: pos.y };
        mc.constraint.bodyB = target;
        mc.constraint.pointB = { x: localX, y: localY };
      }
    };
    Matter.Events.on(mouseConstraint, "mousedown", onMouseDownPick);

    // Scroll-driven gentle nudge.
    let lastScrollY = window.scrollY;
    let pendingDelta = 0;
    let rafId = 0;
    const MAX_SPEED = 12;
    const flushScroll = () => {
      rafId = 0;
      const delta = Math.max(-60, Math.min(60, pendingDelta));
      pendingDelta = 0;
      if (Math.abs(delta) < 0.5) return;
      const cx = (render.options.width || width) / 2;
      const nudge = -delta * 0.05;
      for (const b of bodiesRef.current) {
        if ((mouseConstraint as unknown as { body?: Matter.Body }).body === b) continue;
        const v = b.velocity;
        let nvx = v.x;
        let nvy = v.y + nudge;
        const sp = Math.hypot(nvx, nvy);
        if (sp > MAX_SPEED) {
          const k = MAX_SPEED / sp;
          nvx *= k;
          nvy *= k;
        }
        Matter.Body.setVelocity(b, { x: nvx, y: nvy });
        const side = cx > 0 ? (b.position.x - cx) / cx : 0;
        Matter.Body.setAngularVelocity(b, b.angularVelocity + delta * 0.0005 * side);
      }
    };
    const onScroll = () => {
      const y = window.scrollY;
      pendingDelta += y - lastScrollY;
      lastScrollY = y;
      if (!rafId) rafId = window.requestAnimationFrame(flushScroll);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Touch arbitration — decide drag vs. scroll on touchstart.
    type TouchState = {
      startX: number;
      startY: number;
      decided: "none" | "drag" | "scroll";
      bodyHit: Matter.Body | null;
    };
    let touchState: TouchState | null = null;
    const DRAG_THRESHOLD = 2;
    const NORMAL_STIFFNESS = 0.22;
    const TOUCH_STIFFNESS = 0.4;
    const MAX_DRAG_VEL = 25;

    const getCanvasPoint = (clientX: number, clientY: number) => {
      const rect = canvasEl.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const findBodyAt = (x: number, y: number): Matter.Body | null => {
      const found = Matter.Query.point(bodiesRef.current, { x, y });
      return found[0] || null;
    };

    const onTouchStart = (e: TouchEvent) => {
      touchState = null;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const pt = getCanvasPoint(t.clientX, t.clientY);
      // Direct hit first; otherwise fall back to nearest pill within ~36px so
      // an imprecise tap still grabs a pill instead of being treated as scroll.
      let hit = findBodyAt(pt.x, pt.y);
      if (!hit) {
        const TOUCH_GRAB_RADIUS = 36;
        let bestDist = TOUCH_GRAB_RADIUS * TOUCH_GRAB_RADIUS;
        for (const b of bodiesRef.current) {
          const dx = b.position.x - pt.x;
          const dy = b.position.y - pt.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestDist) {
            bestDist = d2;
            hit = b;
          }
        }
      }
      touchState = {
        startX: t.clientX,
        startY: t.clientY,
        decided: hit ? "none" : "scroll",
        bodyHit: hit,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState || e.touches.length !== 1) return;
      if (touchState.decided === "scroll") return;
      const t = e.touches[0];
      const dx = t.clientX - touchState.startX;
      const dy = t.clientY - touchState.startY;

      if (touchState.decided === "none") {
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if (adx < DRAG_THRESHOLD && ady < DRAG_THRESHOLD) return;
        if (ady > adx * 1.2) {
          touchState.decided = "scroll";
          return;
        }
        touchState.decided = "drag";
        const pt = getCanvasPoint(t.clientX, t.clientY);
        const mouseAny = mouse as unknown as {
          position: { x: number; y: number };
          mousedownPosition: { x: number; y: number };
          mouseupPosition: { x: number; y: number };
          button: number;
        };
        mouseAny.position = { x: pt.x, y: pt.y };
        mouseAny.mousedownPosition = { x: pt.x, y: pt.y };
        mouseAny.mouseupPosition = { x: pt.x, y: pt.y };
        mouseAny.button = 0;
        (mouseConstraint.constraint as unknown as { stiffness: number }).stiffness = TOUCH_STIFFNESS;
        (mouseConstraint as unknown as { body: Matter.Body | null }).body = touchState.bodyHit;
        canvasEl.style.touchAction = "none";
      }

      if (touchState.decided === "drag") {
        e.preventDefault();
        const pt = getCanvasPoint(t.clientX, t.clientY);
        (mouse as unknown as { position: { x: number; y: number } }).position = { x: pt.x, y: pt.y };
        const body = (mouseConstraint as unknown as { body: Matter.Body | null }).body;
        if (body) {
          const sp = Math.hypot(body.velocity.x, body.velocity.y);
          if (sp > MAX_DRAG_VEL) {
            const k = MAX_DRAG_VEL / sp;
            Matter.Body.setVelocity(body, { x: body.velocity.x * k, y: body.velocity.y * k });
          }
        }
      }
    };

    const onTouchEnd = () => {
      if (touchState && touchState.decided === "drag") {
        (mouseConstraint as unknown as { body: Matter.Body | null }).body = null;
        (mouse as unknown as { button: number }).button = -1;
        (mouseConstraint.constraint as unknown as { stiffness: number }).stiffness = NORMAL_STIFFNESS;
      }
      canvasEl.style.touchAction = "pan-y";
      touchState = null;
    };

    canvasEl.addEventListener("touchstart", onTouchStart, { passive: true });
    canvasEl.addEventListener("touchmove", onTouchMove, { passive: false });
    canvasEl.addEventListener("touchend", onTouchEnd, { passive: true });
    canvasEl.addEventListener("touchcancel", onTouchEnd, { passive: true });

    Render.run(render);
    const runner = Runner.create({ delta: 1000 / 60, isFixed: true } as unknown as Matter.IRunnerOptions);
    Runner.run(runner, engine);

    // Custom render — flat Kitsys pills (solid color, no gradient/border).
    Matter.Events.on(render, "afterRender", () => {
      const c = render.context;
      c.save();
      c.font = `600 ${FONT_SIZE}px Inter, system-ui, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";

      // Soft contact shadow when resting near the floor.
      bodiesRef.current.forEach((b) => {
        const anyB = b as unknown as { __h?: number; __w?: number };
        if (!anyB.__h || !anyB.__w) return;
        const distToFloor = h - (b.position.y + anyB.__h / 2);
        if (distToFloor < 30 && distToFloor > -2) {
          const t = 1 - Math.max(0, Math.min(1, distToFloor / 30));
          const shadowW = anyB.__w * 0.5;
          c.save();
          c.fillStyle = `rgba(15, 23, 42, ${0.07 * t})`;
          c.beginPath();
          c.ellipse(b.position.x, h - 1, shadowW, 4, 0, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      });

      // Pills — flat fill, just like Kitsys.
      bodiesRef.current.forEach((b) => {
        const anyB = b as unknown as {
          __label?: string;
          __w?: number;
          __h?: number;
          __bg?: string;
          __fg?: string;
        };
        if (!anyB.__label || !anyB.__w || !anyB.__h || !anyB.__bg || !anyB.__fg) return;
        const w = anyB.__w;
        const hh = anyB.__h;
        c.save();
        c.translate(b.position.x, b.position.y);
        c.rotate(b.angle);
        c.fillStyle = anyB.__bg;
        const r = hh / 2;
        c.beginPath();
        c.moveTo(-w / 2 + r, -hh / 2);
        c.lineTo(w / 2 - r, -hh / 2);
        c.arc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
        c.lineTo(-w / 2 + r, hh / 2);
        c.arc(-w / 2 + r, 0, r, Math.PI / 2, -Math.PI / 2);
        c.closePath();
        c.fill();
        c.fillStyle = anyB.__fg;
        c.fillText(anyB.__label, 0, 1);
        c.restore();
      });
      c.restore();
    });

    const onResize = () => {
      const newW = container.clientWidth;
      render.canvas.width = newW * (window.devicePixelRatio || 1);
      render.canvas.height = h * (window.devicePixelRatio || 1);
      render.canvas.style.width = `${newW}px`;
      render.canvas.style.height = `${h}px`;
      render.options.width = newW;
      render.options.height = h;
      Matter.Render.setPixelRatio(render, window.devicePixelRatio || 1);
      Matter.Body.setPosition(floor, { x: newW / 2, y: h + WALL_T / 2 });
      Matter.Body.setPosition(leftWall, { x: -WALL_T / 2, y: h / 2 });
      Matter.Body.setPosition(rightWall, { x: newW + WALL_T / 2, y: h / 2 });
    };
    window.addEventListener("resize", onResize);

    return () => {
      clearTimers();
      window.clearInterval(cleanupId);
      canvasEl.removeEventListener("touchstart", onTouchStart);
      canvasEl.removeEventListener("touchmove", onTouchMove);
      canvasEl.removeEventListener("touchend", onTouchEnd);
      canvasEl.removeEventListener("touchcancel", onTouchEnd);
      canvasEl.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
      Matter.Events.off(mouseConstraint, "mousedown", onMouseDownPick);
      Render.stop(render);
      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      render.canvas.width = 0;
      render.canvas.height = 0;
      engineRef.current = null;
      worldRef.current = null;
      bodiesRef.current = [];
      spawnFnRef.current = null;
    };
  }, [pills, height, started]);

  return (
    <div
      ref={sceneRef}
      className={`relative w-full ${className}`}
      style={{ height, touchAction: "auto" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
      />
    </div>
  );
});