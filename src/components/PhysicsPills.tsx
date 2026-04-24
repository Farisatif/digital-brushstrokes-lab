import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import Matter from "matter-js";

/**
 * PhysicsPills — KitSys-faithful falling pills field.
 *
 * Design contract:
 *  - Pills fall in only when the section enters the viewport.
 *  - Page scroll is NEVER blocked. The canvas only captures pointer events
 *    that land directly on a pill (or within a small forgiving radius).
 *  - Drag is mouse-only on desktop and pointer-only on touch — no custom
 *    scroll arbitration, no preventDefault on touchmove unless a pill is
 *    actively being held.
 *  - When released, pills get a natural fling proportional to recent pointer
 *    velocity, capped sensibly so they never fly off-screen.
 *  - Top wall + cleanup sweep guarantee no pill can disappear permanently.
 */

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
 * Theme-aware palette: pastels + brand accents that work on both light &
 * dark backgrounds without hardcoding to a section color.
 */
const PALETTE: { bg: string; fg: string }[] = [
  { bg: "#F1F5F9", fg: "#0F172A" }, // porcelain
  { bg: "#1E293B", fg: "#F8FAFC" }, // slate-800
  { bg: "#DBE3F1", fg: "#1E2A4A" }, // soft blue tint
  { bg: "#0F172A", fg: "#F8FAFC" }, // near-black
  { bg: "#FCE7C8", fg: "#3B2A14" }, // warm peach
  { bg: "#4338CA", fg: "#FFFFFF" }, // indigo accent
  { bg: "#FAFAF9", fg: "#27272A" }, // off-white
  { bg: "#475569", fg: "#F8FAFC" }, // slate-600
  { bg: "#C7D2FE", fg: "#1E2A6B" }, // periwinkle
  { bg: "#1D4ED8", fg: "#FFFFFF" }, // brand blue
  { bg: "#E7E5E4", fg: "#1C1917" }, // stone
  { bg: "#A7F3D0", fg: "#064E3B" }, // mint
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
    replay: () => spawnFnRef.current?.(),
  }));

  // Defer simulation start until the section is on/near the screen.
  useEffect(() => {
    if (!sceneRef.current) return;
    const el = sceneRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setStarted(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "-5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started || !sceneRef.current || !canvasRef.current) return;
    const container = sceneRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth;
    const h = height;

    const { Engine, Bodies, Composite, Body, Events, Query } = Matter;

    // ---------------- Engine ----------------
    const engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.0016 },
      positionIterations: 12,
      velocityIterations: 10,
      constraintIterations: 3,
    });
    engineRef.current = engine;
    worldRef.current = engine.world;

    // ---------------- Walls ----------------
    // Floor + sides at the visible edges. Top wall well above so falling pills
    // can spawn off-screen but no body can ever exit upward after spawn.
    const WALL_T = 80;
    const wallOpts = {
      isStatic: true,
      friction: 0.05,
      frictionStatic: 0.5,
      restitution: 0.0,
      slop: 0.04,
      render: { visible: false },
    };
    const floor = Bodies.rectangle(width / 2, h + WALL_T / 2, width * 4, WALL_T, wallOpts);
    const leftWall = Bodies.rectangle(-WALL_T / 2, h / 2, WALL_T, h * 4, wallOpts);
    const rightWall = Bodies.rectangle(width + WALL_T / 2, h / 2, WALL_T, h * 4, wallOpts);
    // Top ceiling far above to allow spawn drop, but catches anything launched up.
    const ceiling = Bodies.rectangle(width / 2, -800 - WALL_T / 2, width * 4, WALL_T, wallOpts);
    Composite.add(engine.world, [floor, leftWall, rightWall, ceiling]);

    // ---------------- Sizing ----------------
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const isMobile = width < 640;
    const FONT_SIZE = isMobile ? 16 : 19;
    const PAD_X = isMobile ? 20 : 26;
    const PILL_H = isMobile ? 42 : 50;
    const MIN_W = 84;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `600 ${FONT_SIZE}px Inter, system-ui, sans-serif`;

    const measured = pills.map((p) =>
      Math.max(MIN_W, ctx.measureText(p.label).width + PAD_X * 2),
    );

    // ---------------- Body factory ----------------
    const makePillBody = (i: number): Matter.Body => {
      const p = pills[i];
      const palette = PALETTE[(p.variant - 1 + PALETTE.length) % PALETTE.length];
      const w = measured[i];
      const margin = w / 2 + 12;
      const usable = Math.max(1, width - margin * 2);
      const phi = 0.61803398875;
      const t = (i * phi) % 1;
      const x = margin + t * usable + (Math.random() - 0.5) * 16;
      // Stagger spawn Y above the canvas so cascade looks natural.
      const y = -PILL_H - 50 - (i % 4) * 90 - Math.random() * 60;
      const body = Bodies.rectangle(x, y, w, PILL_H, {
        chamfer: { radius: PILL_H / 2 },
        restitution: 0.04,
        friction: 0.35,
        frictionStatic: 0.7,
        frictionAir: 0.012,
        density: 0.002,
        angle: (Math.random() - 0.5) * 0.4,
        slop: 0.04,
        render: { fillStyle: "transparent", strokeStyle: "transparent", lineWidth: 0 },
      });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.04);
      const meta = body as unknown as Record<string, unknown>;
      meta.__label = p.label;
      meta.__bg = palette.bg;
      meta.__fg = palette.fg;
      meta.__w = w;
      meta.__h = PILL_H;
      return body;
    };

    // ---------------- Spawn cascade ----------------
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
        const delay = 180 + i * (90 + Math.random() * 50);
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

    // Periodic safety sweep — resurrect any escaped body.
    const cleanupId = window.setInterval(() => {
      if (!worldRef.current) return;
      for (const b of bodiesRef.current) {
        const { x, y } = b.position;
        // If a body has escaped (shouldn't happen with walls, but be safe),
        // teleport it back to the top so the user never sees a missing pill.
        if (y > h + 400 || y < -1500 || x < -300 || x > width + 300) {
          Body.setPosition(b, { x: width / 2, y: -PILL_H });
          Body.setVelocity(b, { x: 0, y: 0 });
          Body.setAngularVelocity(b, 0);
        }
      }
    }, 800);

    // ---------------- Pointer drag (unified mouse + touch) ----------------
    // We DO NOT use Matter's MouseConstraint. We implement a simple, explicit
    // pointer drag that only activates when the pointer-down lands on a pill.
    // For everything else (empty canvas area), pointer events are ignored
    // entirely so the page scrolls and pans naturally.

    let dragBody: Matter.Body | null = null;
    let dragOffset = { x: 0, y: 0 }; // local point on body where the pointer grabbed
    let pointerId: number | null = null;
    let lastPos = { x: 0, y: 0, t: 0 };
    let prevPos = { x: 0, y: 0, t: 0 };
    let savedFrictionAir = 0.012;

    const TOUCH_GRAB_RADIUS = 40;
    const MAX_FLING_SPEED = 22; // px per frame after release

    const getCanvasPoint = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const findBodyNear = (pt: { x: number; y: number }, isTouch: boolean): Matter.Body | null => {
      // Direct hit first.
      const exact = Query.point(bodiesRef.current, pt)[0];
      if (exact) return exact;
      // Forgiving fallback (touch only — desktop click stays precise).
      if (!isTouch) return null;
      let best: Matter.Body | null = null;
      let bestDist = TOUCH_GRAB_RADIUS * TOUCH_GRAB_RADIUS;
      for (const b of bodiesRef.current) {
        const dx = b.position.x - pt.x;
        const dy = b.position.y - pt.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
          bestDist = d2;
          best = b;
        }
      }
      return best;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (dragBody) return; // already dragging something
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const pt = getCanvasPoint(e.clientX, e.clientY);
      const isTouch = e.pointerType !== "mouse";
      const hit = findBodyNear(pt, isTouch);
      if (!hit) return; // tap on empty area — let the browser scroll

      e.preventDefault();
      dragBody = hit;
      pointerId = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      // Compute local grab offset so the body rotates around the grab point.
      const cos = Math.cos(-hit.angle);
      const sin = Math.sin(-hit.angle);
      const dx = pt.x - hit.position.x;
      const dy = pt.y - hit.position.y;
      dragOffset = {
        x: dx * cos - dy * sin,
        y: dx * sin + dy * cos,
      };

      savedFrictionAir = hit.frictionAir;
      hit.frictionAir = 0.001;
      const now = performance.now();
      lastPos = { x: pt.x, y: pt.y, t: now };
      prevPos = { ...lastPos };
      canvas.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragBody || e.pointerId !== pointerId) {
        // If hovering on desktop without dragging, update cursor on hit.
        if (!dragBody && e.pointerType === "mouse") {
          const pt = getCanvasPoint(e.clientX, e.clientY);
          const hit = Query.point(bodiesRef.current, pt)[0];
          canvas.style.cursor = hit ? "grab" : "default";
        }
        return;
      }
      e.preventDefault();
      const pt = getCanvasPoint(e.clientX, e.clientY);
      const now = performance.now();
      prevPos = lastPos;
      lastPos = { x: pt.x, y: pt.y, t: now };

      // Compute target world position so the original grab point follows the cursor.
      const cos = Math.cos(dragBody.angle);
      const sin = Math.sin(dragBody.angle);
      const grabWorldX = dragOffset.x * cos - dragOffset.y * sin;
      const grabWorldY = dragOffset.x * sin + dragOffset.y * cos;
      const targetX = pt.x - grabWorldX;
      const targetY = pt.y - grabWorldY;

      // Move the body directly. This is more stable than a soft constraint.
      Body.setPosition(dragBody, { x: targetX, y: targetY });
      Body.setVelocity(dragBody, { x: 0, y: 0 });
      Body.setAngularVelocity(dragBody, dragBody.angularVelocity * 0.6);
    };

    const releaseDrag = () => {
      if (!dragBody) return;
      const body = dragBody;
      body.frictionAir = savedFrictionAir;
      // Compute fling velocity from the last two pointer samples.
      const dt = Math.max(8, lastPos.t - prevPos.t);
      let vx = ((lastPos.x - prevPos.x) / dt) * 16;
      let vy = ((lastPos.y - prevPos.y) / dt) * 16;
      const sp = Math.hypot(vx, vy);
      if (sp > MAX_FLING_SPEED) {
        const k = MAX_FLING_SPEED / sp;
        vx *= k;
        vy *= k;
      }
      Body.setVelocity(body, { x: vx * 0.9, y: vy * 0.9 });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
      dragBody = null;
      pointerId = null;
      canvas.style.cursor = "default";
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      releaseDrag();
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      releaseDrag();
    };

    // touch-action: pan-y allows native vertical scroll over empty canvas.
    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);

    // ---------------- Settle damper ----------------
    Events.on(engine, "afterUpdate", () => {
      for (const b of bodiesRef.current) {
        if (b === dragBody) continue;
        if (Math.abs(b.angularVelocity) > 0.5) {
          Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 0.5);
        }
        const sp = Math.hypot(b.velocity.x, b.velocity.y);
        if (sp < 0.06 && Math.abs(b.angularVelocity) < 0.02) {
          Body.setVelocity(b, { x: 0, y: 0 });
          Body.setAngularVelocity(b, 0);
        }
      }
    });

    // ---------------- Render loop (manual rAF, no Matter.Render) ----------------
    let rafId = 0;
    let lastFrame = performance.now();
    const FIXED_DT = 1000 / 60;
    let acc = 0;

    const renderFrame = (now: number) => {
      const delta = Math.min(50, now - lastFrame);
      lastFrame = now;
      acc += delta;
      while (acc >= FIXED_DT) {
        Engine.update(engine, FIXED_DT);
        acc -= FIXED_DT;
      }

      // Draw
      ctx.clearRect(0, 0, width, h);
      ctx.font = `600 ${FONT_SIZE}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Soft contact shadows near floor.
      for (const b of bodiesRef.current) {
        const meta = b as unknown as { __h?: number; __w?: number };
        if (!meta.__h || !meta.__w) continue;
        const distToFloor = h - (b.position.y + meta.__h / 2);
        if (distToFloor < 26 && distToFloor > -2) {
          const t = 1 - Math.max(0, Math.min(1, distToFloor / 26));
          const shadowW = meta.__w * 0.45;
          ctx.save();
          ctx.fillStyle = `rgba(15, 23, 42, ${0.08 * t})`;
          ctx.beginPath();
          ctx.ellipse(b.position.x, h - 1, shadowW, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Pills
      for (const b of bodiesRef.current) {
        const meta = b as unknown as {
          __label?: string;
          __w?: number;
          __h?: number;
          __bg?: string;
          __fg?: string;
        };
        if (!meta.__label || !meta.__w || !meta.__h || !meta.__bg || !meta.__fg) continue;
        const w = meta.__w;
        const hh = meta.__h;
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        ctx.fillStyle = meta.__bg;
        const r = hh / 2;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + r, -hh / 2);
        ctx.lineTo(w / 2 - r, -hh / 2);
        ctx.arc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-w / 2 + r, hh / 2);
        ctx.arc(-w / 2 + r, 0, r, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = meta.__fg;
        ctx.fillText(meta.__label, 0, 1);
        ctx.restore();
      }

      rafId = requestAnimationFrame(renderFrame);
    };
    rafId = requestAnimationFrame(renderFrame);

    // ---------------- Resize ----------------
    const onResize = () => {
      const newW = container.clientWidth;
      if (newW === width) return;
      const r = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(newW * r);
      canvas.height = Math.floor(h * r);
      canvas.style.width = `${newW}px`;
      canvas.style.height = `${h}px`;
      const c = canvas.getContext("2d");
      if (c) c.setTransform(r, 0, 0, r, 0, 0);
      Body.setPosition(floor, { x: newW / 2, y: h + WALL_T / 2 });
      Body.setPosition(leftWall, { x: -WALL_T / 2, y: h / 2 });
      Body.setPosition(rightWall, { x: newW + WALL_T / 2, y: h / 2 });
      Body.setPosition(ceiling, { x: newW / 2, y: -800 - WALL_T / 2 });
    };
    window.addEventListener("resize", onResize);

    // ---------------- Cleanup ----------------
    return () => {
      cancelAnimationFrame(rafId);
      clearTimers();
      window.clearInterval(cleanupId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("resize", onResize);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
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
      style={{ height, touchAction: "pan-y" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: "pan-y" }}
      />
    </div>
  );
});