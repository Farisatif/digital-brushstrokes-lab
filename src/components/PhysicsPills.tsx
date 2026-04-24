import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import Matter from "matter-js";

interface PillData {
  label: string;
  variant: number;
  weight?: "bold" | "medium";
}

interface Props {
  pills: PillData[];
  height?: number;
  className?: string;
}

export interface PhysicsPillsHandle {
  replay: () => void;
}

const PALETTE = [
  { bg: "#BFD7F2", fg: "#0B2A4A" },
  { bg: "#1E3A8A", fg: "#FFFFFF" },
  { bg: "#2563EB", fg: "#FFFFFF" },
  { bg: "#3B82F6", fg: "#FFFFFF" },
  { bg: "#A5B4FC", fg: "#1E2A6B" },
  { bg: "#0F172A", fg: "#FFFFFF" },
];

// Lighten/darken a hex color by amount (0..1).
function shadeHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const adj = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))));
  const to = (c: number) => c.toString(16).padStart(2, "0");
  return `#${to(adj(r))}${to(adj(g))}${to(adj(b))}`;
}

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
      { rootMargin: "-10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started || !sceneRef.current || !canvasRef.current) return;
    const container = sceneRef.current;
    const width = container.clientWidth;
    const h = height;

    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const Runner = Matter.Runner;
    const Bodies = Matter.Bodies;
    const Composite = Matter.Composite;
    const Mouse = Matter.Mouse;
    const MouseConstraint = Matter.MouseConstraint;

    const engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.0014 },
      positionIterations: 14,
      velocityIterations: 12,
      constraintIterations: 4,
    });
    engine.timing.timeScale = 1;
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

    // Sizing — slightly smaller for breathing room near walls.
    const isMobile = width < 640;
    const FONT_SIZE = isMobile ? 16 : 18;
    const PAD_X = 23;
    const PILL_H = isMobile ? 41 : 47;
    const MIN_W = 82;

    ctx.font = `600 ${FONT_SIZE}px Inter, sans-serif`;

    const measured = pills.map((p) => {
      const textW = ctx.measureText(p.label).width;
      return Math.max(MIN_W, textW + PAD_X * 2);
    });

    // Walls placed AT the visible canvas edges (not outside). Pills stop at the
    // visible boundary, fully visible and fully clickable. Wall thickness 60px
    // sits OUTSIDE the canvas (negative coordinates), so the inner face aligns
    // exactly with x=0 / x=width / y=h.
    const WALL_T = 60;
    const wallOpts = {
      isStatic: true,
      friction: 0.02,
      frictionStatic: 0.25,
      restitution: 0.04,
      slop: 0.04,
      render: { visible: false },
    };
    const floor = Bodies.rectangle(width / 2, h + WALL_T / 2, width * 2, WALL_T, wallOpts);
    const leftWall = Bodies.rectangle(-WALL_T / 2, h / 2, WALL_T, h * 2, wallOpts);
    const rightWall = Bodies.rectangle(width + WALL_T / 2, h / 2, WALL_T, h * 2, wallOpts);
    // Top wall (well above visible area) prevents touch-drag slingshots from
    // launching pills off-screen upward and never returning.
    const topWall = Bodies.rectangle(width / 2, -WALL_T / 2 - 200, width * 2, WALL_T, wallOpts);
    Composite.add(engine.world, [floor, leftWall, rightWall, topWall]);

    const makePillBody = (i: number): Matter.Body => {
      const p = pills[i];
      const palette = PALETTE[(p.variant - 1) % PALETTE.length];
      const w = measured[i];
      const hh = PILL_H;
      // Distribute spawn x across full width using a golden-ratio sequence
      // so pills don't pile up on the centerline and create jitter.
      const margin = w / 2 + 8;
      const usable = Math.max(1, width - margin * 2);
      const phi = 0.61803398875;
      const t = (i * phi) % 1;
      const x = margin + t * usable + (Math.random() - 0.5) * 12;
      const y = -hh - 30 - (i % 4) * 90 - Math.random() * 80;
      const body = Bodies.rectangle(x, y, w, hh, {
        chamfer: { radius: hh / 2 },
        restitution: 0.06,
        friction: 0.18,
        frictionStatic: 0.55,
        frictionAir: 0.012,
        density: 0.0018,
        angle: (Math.random() - 0.5) * 0.4,
        slop: 0.04,
        render: { fillStyle: "transparent", strokeStyle: "transparent", lineWidth: 0 },
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.06);
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 0.9, y: 0 });
      (body as any).__label = p.label;
      (body as any).__fg = palette.fg;
      (body as any).__bg = palette.bg;
      (body as any).__fontSize = FONT_SIZE;
      (body as any).__w = w;
      (body as any).__h = hh;
      (body as any).__spawnAt = performance.now();
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
        const delay = 200 + i * (80 + Math.random() * 50);
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
    const m = mouse as any;
    if (m.element && m.mousewheel) m.element.removeEventListener("wheel", m.mousewheel);
    if (m.element && m.touchmove) m.element.removeEventListener("touchmove", m.touchmove);
    if (m.element && m.touchstart) m.element.removeEventListener("touchstart", m.touchstart);
    if (m.element && m.touchend) m.element.removeEventListener("touchend", m.touchend);

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.22, damping: 0.18, render: { visible: false } },
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    // Throw-to-fling: track recent pointer samples and apply velocity on release.
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
      const pos = (mouse as any).position as { x: number; y: number };
      if (!pos) return;
      samples.push({ x: pos.x, y: pos.y, t: performance.now() });
      if (samples.length > MAX_SAMPLES) samples.shift();
    };

    Matter.Events.on(mouseConstraint, "startdrag", (e: any) => {
      draggedBody = e.body as Matter.Body;
      if (draggedBody) {
        savedFrictionAir = draggedBody.frictionAir;
        savedFriction = draggedBody.friction;
        savedDensity = draggedBody.density;
        (draggedBody as any).frictionAir = 0.001;
        (draggedBody as any).friction = 0;
        Matter.Body.setDensity(draggedBody, Math.max(0.0008, (savedDensity ?? 0.0018) * 0.7));
      }
      samples.length = 0;
      pushSample();
      canvasEl.style.cursor = "grabbing";
    });

    Matter.Events.on(mouseConstraint, "enddrag", () => {
      const body = draggedBody;
      if (body && savedFrictionAir !== null) {
        (body as any).frictionAir = savedFrictionAir;
      }
      if (body && savedFriction !== null) {
        (body as any).friction = savedFriction;
      }
      if (body && savedDensity !== null) {
        Matter.Body.setDensity(body, savedDensity);
      }
      // Compute throw velocity from samples within window.
      if (body && samples.length >= 2) {
        const now = performance.now();
        const recent = samples.filter((s) => now - s.t <= THROW_WINDOW_MS);
        const first = recent[0] ?? samples[0];
        const last = samples[samples.length - 1];
        const dt = Math.max(1, last.t - first.t);
        let vx = ((last.x - first.x) / dt) * 16; // px per ~tick
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

    // Damp residual jitter: clamp angular velocity and zero out near-stationary
    // bodies so they settle cleanly on the floor instead of buzzing.
    Matter.Events.on(engine, "afterUpdate", () => {
      const now = performance.now();
      for (const b of bodiesRef.current) {
        if ((mouseConstraint as any).body === b) continue;
        if (Math.abs(b.angularVelocity) > 0.45) {
          Matter.Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 0.45);
        }
        // Settle damper for the first 1500ms after spawn so the cascade
        // calms down rather than buzzing around.
        const spawnAt = (b as any).__spawnAt as number | undefined;
        if (spawnAt && now - spawnAt < 1500) {
          Matter.Body.setVelocity(b, { x: b.velocity.x * 0.985, y: b.velocity.y * 0.985 });
        }
        const sp = Math.hypot(b.velocity.x, b.velocity.y);
        if (sp < 0.08 && Math.abs(b.angularVelocity) < 0.03) {
          Matter.Body.setVelocity(b, { x: 0, y: 0 });
          Matter.Body.setAngularVelocity(b, 0);
        }
      }
    });

    // Visual flash on hard collisions for tactile feedback (no physics cost).
    Matter.Events.on(engine, "collisionStart", (event: any) => {
      const now = performance.now();
      for (const pair of event.pairs) {
        const dvx = pair.bodyA.velocity.x - pair.bodyB.velocity.x;
        const dvy = pair.bodyA.velocity.y - pair.bodyB.velocity.y;
        const rel = Math.hypot(dvx, dvy);
        if (rel > 6) {
          (pair.bodyA as any).__flashUntil = now + 120;
          (pair.bodyB as any).__flashUntil = now + 120;
        }
      }
    });

    // Hover cursor feedback.
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

    // Fallback grab: only kick in for clicks that just barely missed a pill.
    const GRAB_RADIUS = 28;
    const onMouseDownPick = () => {
      const current = (mouseConstraint as any).body as Matter.Body | null;
      if (current) return;
      const pos = (mouse as any).position as { x: number; y: number };
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
        (mouseConstraint as any).body = target;
        (mouseConstraint.constraint as any).pointA = { x: pos.x, y: pos.y };
        (mouseConstraint.constraint as any).bodyB = target;
        (mouseConstraint.constraint as any).pointB = { x: localX, y: localY };
      }
    };
    Matter.Events.on(mouseConstraint, "mousedown", onMouseDownPick);

    // ---- Scroll-driven gentle impulse ----
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
      const nudge = -delta * 0.06;
      for (const b of bodiesRef.current) {
        if ((mouseConstraint as any).body === b) continue;
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
        Matter.Body.setAngularVelocity(
          b,
          b.angularVelocity + delta * 0.0006 * side,
        );
      }
    };
    const onScroll = () => {
      const y = window.scrollY;
      pendingDelta += y - lastScrollY;
      lastScrollY = y;
      if (!rafId) rafId = window.requestAnimationFrame(flushScroll);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Touch arbitration: decide drag-vs-scroll on touchstart (not mid-move) so
    // the browser can scroll natively when the touch starts on empty canvas.
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
      // Always reset stale state from a missed touchend.
      touchState = null;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const pt = getCanvasPoint(t.clientX, t.clientY);
      const hit = findBodyAt(pt.x, pt.y);
      touchState = {
        startX: t.clientX,
        startY: t.clientY,
        // If the touch did NOT land on a pill, decide scroll IMMEDIATELY so
        // the browser handles vertical scrolling without any arbitration delay.
        decided: hit ? "none" : "scroll",
        bodyHit: hit,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState || e.touches.length !== 1) return;
      // Already a scroll gesture — let the browser take over completely.
      if (touchState.decided === "scroll") return;
      const t = e.touches[0];
      const dx = t.clientX - touchState.startX;
      const dy = t.clientY - touchState.startY;

      if (touchState.decided === "none") {
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if (adx < DRAG_THRESHOLD && ady < DRAG_THRESHOLD) return;
        // Vertical-dominant gesture even on a pill = let user scroll.
        if (ady > adx * 1.2) {
          touchState.decided = "scroll";
          return;
        }
        touchState.decided = "drag";
        const pt = getCanvasPoint(t.clientX, t.clientY);
        // CRITICAL: prime the mouse state BEFORE attaching the constraint so
        // the soft constraint anchors at the current touch point, not at a
        // stale mousedownPosition from a previous gesture (which caused pills
        // to shoot off-screen upward).
        (mouse as any).position = { x: pt.x, y: pt.y };
        (mouse as any).mousedownPosition = { x: pt.x, y: pt.y };
        (mouse as any).mouseupPosition = { x: pt.x, y: pt.y };
        (mouse as any).button = 0;
        // Stiffen constraint for touch only — prevents slingshot on mobile
        // while preserving the weighty desktop feel.
        (mouseConstraint.constraint as any).stiffness = TOUCH_STIFFNESS;
        (mouseConstraint as any).body = touchState.bodyHit;
        canvasEl.style.touchAction = "none";
      }

      if (touchState.decided === "drag") {
        e.preventDefault();
        const pt = getCanvasPoint(t.clientX, t.clientY);
        (mouse as any).position = { x: pt.x, y: pt.y };
        // Clamp dragged body's velocity each tick to prevent runaway energy
        // accumulation in the constraint solver.
        const body = (mouseConstraint as any).body as Matter.Body | null;
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
        (mouseConstraint as any).body = null;
        (mouse as any).button = -1;
        (mouseConstraint.constraint as any).stiffness = NORMAL_STIFFNESS;
      }
      canvasEl.style.touchAction = "pan-y";
      touchState = null;
    };

    canvasEl.addEventListener("touchstart", onTouchStart, { passive: true });
    canvasEl.addEventListener("touchmove", onTouchMove, { passive: false });
    canvasEl.addEventListener("touchend", onTouchEnd, { passive: true });
    canvasEl.addEventListener("touchcancel", onTouchEnd, { passive: true });

    Render.run(render);
    const runner = Runner.create({ delta: 1000 / 60, isFixed: true } as any);
    Runner.run(runner, engine);

    Matter.Events.on(render, "afterRender", () => {
      const c = render.context;
      c.save();
      c.font = `600 ${FONT_SIZE}px Inter, system-ui, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      const now = performance.now();
      // Contact shadows for pills resting near the floor.
      bodiesRef.current.forEach((b) => {
        const anyB = b as any;
        if (!anyB.__h) return;
        const distToFloor = h - (b.position.y + (anyB.__h as number) / 2);
        if (distToFloor < 30 && distToFloor > -2) {
          const t = 1 - Math.max(0, Math.min(1, distToFloor / 30));
          const shadowW = (anyB.__w as number) * 0.55;
          c.save();
          c.fillStyle = `rgba(15, 23, 42, ${0.08 * t})`;
          c.beginPath();
          c.ellipse(b.position.x, h - 1, shadowW, 4, 0, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      });
      bodiesRef.current.forEach((b) => {
        const anyB = b as any;
        if (!anyB.__label) return;
        const w = anyB.__w as number;
        const hh = anyB.__h as number;
        const flashing = anyB.__flashUntil && now < anyB.__flashUntil;
        const bg = flashing ? shadeHex(anyB.__bg as string, 0.06) : (anyB.__bg as string);
        c.save();
        c.translate(b.position.x, b.position.y);
        c.rotate(b.angle);
        // Gradient highlight for a 3D chip feel — top lighter, bottom darker.
        const grad = c.createLinearGradient(0, -hh / 2, 0, hh / 2);
        grad.addColorStop(0, shadeHex(bg, 0.18));
        grad.addColorStop(0.55, bg);
        grad.addColorStop(1, shadeHex(bg, -0.18));
        c.fillStyle = grad;
        const r = hh / 2;
        c.beginPath();
        c.moveTo(-w / 2 + r, -hh / 2);
        c.lineTo(w / 2 - r, -hh / 2);
        c.arc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
        c.lineTo(-w / 2 + r, hh / 2);
        c.arc(-w / 2 + r, 0, r, Math.PI / 2, -Math.PI / 2);
        c.closePath();
        c.fill();
        // Subtle inner top highlight.
        c.fillStyle = "rgba(255,255,255,0.08)";
        c.beginPath();
        c.moveTo(-w / 2 + r, -hh / 2 + 1);
        c.lineTo(w / 2 - r, -hh / 2 + 1);
        c.arc(w / 2 - r, -hh / 2 + r * 0.6, r * 0.6, -Math.PI / 2, Math.PI / 2);
        c.lineTo(-w / 2 + r, -hh / 2 + r * 1.2);
        c.arc(-w / 2 + r, -hh / 2 + r * 0.6, r * 0.6, Math.PI / 2, -Math.PI / 2);
        c.closePath();
        c.fill();

        c.fillStyle = anyB.__fg;
        c.font = `600 ${FONT_SIZE}px Inter, system-ui, sans-serif`;
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
