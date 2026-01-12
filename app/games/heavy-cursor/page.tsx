'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, RefreshCcw, Info } from 'lucide-react';
import Link from 'next/link';
import './heavy-theme.css';
import { cn } from '@/lib/utils';

// --- Types ---

type Point = { x: number; y: number };
type Level = {
  id: number;
  name: string;
  walls: Rect[];
  start: Point;
  end: Rect;
};
type Rect = { x: number; y: number; w: number; h: number };

// --- Physics Constants ---

const BASE_MASS = 1.0;
const MAX_MASS = 5.0; // Very heavy when fatigued
const SPRING_STRENGTH = 0.08; // How snappy the string is
const DAMPING = 0.92; // Air resistance (0-1)
const FATIGUE_RATE = 0.02; // Mass added per frame of high speed
const RECOVERY_RATE = 0.05; // Mass removed per frame of rest
const HIGH_SPEED_THRESHOLD = 15; // Speed to trigger fatigue

// --- Levels ---

const LEVELS: Level[] = [
  {
    id: 1,
    name: "Calibration",
    walls: [
      { x: 200, y: 0, w: 50, h: 400 },
      { x: 200, y: 600, w: 50, h: 400 },
      { x: 600, y: 200, w: 400, h: 50 },
    ],
    start: { x: 100, y: 500 },
    end: { x: 800, y: 500, w: 100, h: 100 },
  },
  {
    id: 2,
    name: "Inertia Check",
    walls: [
      { x: 300, y: 0, w: 50, h: 600 },
      { x: 600, y: 300, w: 50, h: 600 },
    ],
    start: { x: 100, y: 100 },
    end: { x: 800, y: 800, w: 100, h: 100 },
  },
  {
    id: 3,
    name: "Fatigue Test",
    walls: [
        { x: 0, y: 300, w: 400, h: 50 },
        { x: 500, y: 300, w: 500, h: 50 },
        { x: 400, y: 500, w: 50, h: 300 },
        { x: 400, y: 0, w: 50, h: 200 },
    ],
    start: { x: 100, y: 100 },
    end: { x: 800, y: 800, w: 100, h: 100 },
  }
];

export default function HeavyCursorGame() {
  // Game State
  // 'idle' = waiting to be picked up
  // 'dragging' = attached to mouse via spring
  // 'dropped' = failed/crashed
  // 'won' = level complete
  const [gameState, setGameState] = useState<'start' | 'idle' | 'dragging' | 'dropped' | 'won'>('start');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [crashPos, setCrashPos] = useState<Point | null>(null);
  const [isSafetyMode, setIsSafetyMode] = useState(false);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInvulnerableRef = useRef(false);

  // Physics State Refs (mutable for loop performance)
  const targetRef = useRef<Point>({ x: 100, y: 500 }); // Mouse pos
  const posRef = useRef<Point>({ x: 100, y: 500 }); // Heavy cursor pos
  const velRef = useRef<Point>({ x: 0, y: 0 }); // Velocity
  const massRef = useRef<number>(BASE_MASS);
  const animationFrameRef = useRef<number>(0);
  
  // React State for UI rendering (updated less frequently if needed, or every frame)
  const [renderPos, setRenderPos] = useState<Point>({ x: 100, y: 500 });
  const [massVisual, setMassVisual] = useState(BASE_MASS);
  const [isHoveringStart, setIsHoveringStart] = useState(false);
  const [isInvulnerable, setIsInvulnerable] = useState(false);
  
  // Shake effect state
  const [shake, setShake] = useState(0);

  // Level Data
  const currentLevel = useMemo(() => LEVELS[currentLevelIdx], [currentLevelIdx]);

  // --- Physics Loop ---
  
  useEffect(() => {
    // We run physics loop even in 'idle' to let it settle or react slightly
    if (gameState === 'start' || gameState === 'won') return;

    if (gameState === 'idle') {
        // Snap to start position initially
        posRef.current = { ...currentLevel.start };
        velRef.current = { x: 0, y: 0 };
        massRef.current = BASE_MASS;
        setRenderPos({ ...currentLevel.start });
        setMassVisual(BASE_MASS);
        return;
    }

    const loop = () => {
      if (gameState !== 'dragging') return;

      const target = targetRef.current;
      const pos = posRef.current;
      const vel = velRef.current;
      const mass = massRef.current;

      // 1. Calculate Spring Force
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      
      const ax = (dx * SPRING_STRENGTH) / mass;
      const ay = (dy * SPRING_STRENGTH) / mass;

      // 2. Update Velocity
      vel.x += ax;
      vel.y += ay;
      
      // 3. Apply Damping (Friction)
      const currentDamping = isSafetyMode ? 0.8 : DAMPING; // More drag in safety mode
      vel.x *= currentDamping;
      vel.y *= currentDamping;

      // 4. Update Position
      pos.x += vel.x;
      pos.y += vel.y;

      // 5. Fatigue Logic
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      if (!isSafetyMode && speed > HIGH_SPEED_THRESHOLD) {
        massRef.current = Math.min(mass + FATIGUE_RATE, MAX_MASS);
        // Shake screen if going too fast (danger)
        if (massRef.current > MAX_MASS * 0.8) {
           setShake(Math.random() * 5);
        } else {
           setShake(0);
        }
      } else {
        massRef.current = Math.max(mass - RECOVERY_RATE, BASE_MASS);
        setShake(0);
      }

      // 6. Collision Detection
      if (!isInvulnerableRef.current) {
          const cursorRadius = 16 + (massRef.current * 2); // Cursor grows with mass
          
          // Walls
          let crashed = false;
          for (const wall of currentLevel.walls) {
            if (
              pos.x + cursorRadius > wall.x &&
              pos.x - cursorRadius < wall.x + wall.w &&
              pos.y + cursorRadius > wall.y &&
              pos.y - cursorRadius < wall.y + wall.h
            ) {
              crashed = true;
              break;
            }
          }

          // Screen bounds
          if (
            pos.x - cursorRadius < 0 ||
            pos.x + cursorRadius > window.innerWidth ||
            pos.y - cursorRadius < 0 ||
            pos.y + cursorRadius > window.innerHeight
          ) {
             crashed = true;
          }

          if (crashed) {
            setCrashPos({ ...pos });
            setGameState('dropped');
            setShake(20); // Big impact
            return; // Stop loop
          }
      }

      // Goal
      const end = currentLevel.end;
      // Check if CENTER of cursor is in goal, not just any part
      if (
        pos.x > end.x && pos.x < end.x + end.w &&
        pos.y > end.y && pos.y < end.y + end.h
      ) {
         // Must settle in goal? Or just touch? Let's say touch for now but maybe require low speed
         if (speed < 5) {
             if (currentLevelIdx < LEVELS.length - 1) {
                setCurrentLevelIdx(prev => prev + 1);
                setGameState('idle');
             } else {
                setGameState('won');
                return;
             }
         }
      }

      // 7. Update UI
      setRenderPos({ ...pos });
      setMassVisual(massRef.current); // May want to throttle this if it causes lag, but usually React 18 handles it well enough
      setIsInvulnerable(isInvulnerableRef.current);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState, currentLevel, currentLevelIdx]);

  // --- Event Handlers ---

  const handleMouseDown = () => {
    if (gameState === 'idle' && isHoveringStart) {
        setGameState('dragging');
        // Initialize position to start exactly
        posRef.current = { ...currentLevel.start };
        velRef.current = { x: 0, y: 0 };
        targetRef.current = { x: mousePos.x, y: mousePos.y };
        
        // Grant temporary invulnerability to prevent instant spawn kills
        isInvulnerableRef.current = true;
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = setTimeout(() => {
            isInvulnerableRef.current = false;
        }, 500); // 0.5s grace period
    }
  };

  const handleMouseUp = () => {
      if (gameState === 'dragging') {
          // Drop it!
          setGameState('dropped');
          setCrashPos({ ...posRef.current });
      }
  };

  const handleStart = () => {
    setGameState('idle');
  };

  const handleRetry = () => {
    setGameState('idle');
    setCrashPos(null);
  };

  // --- Render Helpers ---
  
  // Track mouse
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
      const updateMouse = (e: MouseEvent) => {
          setMousePos({ x: e.clientX, y: e.clientY });
          if (gameState === 'dragging') {
             targetRef.current = { x: e.clientX, y: e.clientY };
          }
      };
      const handleGlobalUp = () => {
         if (gameState === 'dragging') {
             handleMouseUp();
         }
      };

      window.addEventListener('mousemove', updateMouse);
      window.addEventListener('mouseup', handleGlobalUp);
      return () => {
          window.removeEventListener('mousemove', updateMouse);
          window.removeEventListener('mouseup', handleGlobalUp);
      };
  }, [gameState]);

  // Check if mouse is hovering over the heavy cursor start pos
  useEffect(() => {
    if (gameState !== 'idle') {
        setIsHoveringStart(false);
        return;
    }
    const dist = Math.sqrt(
        Math.pow(mousePos.x - currentLevel.start.x, 2) +
        Math.pow(mousePos.y - currentLevel.start.y, 2)
    );
    setIsHoveringStart(dist < 40); // 40px radius activation zone
  }, [mousePos, gameState, currentLevel]);


  return (
    <motion.div
        className="heavy-cursor-game relative w-full h-screen overflow-hidden select-none bg-neutral-950 text-neutral-200"
        onMouseDown={handleMouseDown}
        animate={{ x: shake * (Math.random() > 0.5 ? 1 : -1), y: shake * (Math.random() > 0.5 ? 1 : -1) }}
        transition={{ duration: 0.05 }}
    >
      <div className="absolute inset-0 blueprint-grid opacity-20 pointer-events-none" />

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-50 flex gap-4 pointer-events-none">
        <Link href="/" className="pointer-events-auto bg-black/50 backdrop-blur border border-neutral-700 p-2 rounded hover:bg-neutral-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-neutral-400" />
        </Link>
        <div className="bg-black/50 backdrop-blur px-4 py-2 rounded border border-neutral-700 font-mono text-xs flex items-center gap-4 text-neutral-400">
           <span>SECURE CARGO TRANSPORT SIMULATION</span>
           <span className="text-neutral-600">|</span>
           <span className="text-yellow-500 font-bold">LEVEL {currentLevel.id}: {currentLevel.name.toUpperCase()}</span>
        </div>
        
        <div className="bg-black/50 backdrop-blur px-4 py-2 rounded border border-neutral-700 font-mono text-xs flex items-center gap-2">
            <span className="text-neutral-500">LOAD_MASS:</span>
            <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden relative">
                <div
                    className={cn(
                        "h-full transition-all duration-100",
                        massVisual > 3 ? "bg-red-500" : "bg-cyan-400"
                    )}
                    style={{ width: `${((massVisual - BASE_MASS) / (MAX_MASS - BASE_MASS)) * 100}%` }}
                />
            </div>
            <span className={cn(massVisual > 3 ? "text-red-500 animate-pulse" : "text-cyan-400")}>
                {massVisual.toFixed(2)}kg
            </span>
        </div>
      </div>

      {/* Game Area */}
      {/* Walls */}
      {currentLevel.walls.map((wall, i) => (
        <div
          key={i}
          className="absolute hazard-stripe border-2 border-yellow-600"
          style={{
            left: wall.x,
            top: wall.y,
            width: wall.w,
            height: wall.h,
          }}
        />
      ))}

      {/* Goal */}
      <div 
        className="absolute border-4 border-dashed border-green-500 bg-green-500/10 flex items-center justify-center font-bold text-green-500 tracking-widest"
        style={{
            left: currentLevel.end.x,
            top: currentLevel.end.y,
            width: currentLevel.end.w,
            height: currentLevel.end.h,
        }}
      >
        DROP ZONE
      </div>

      {/* String */}
      <svg className="absolute inset-0 pointer-events-none z-10 overflow-visible">
          {gameState === 'dragging' && (
             <line
                x1={mousePos.x}
                y1={mousePos.y}
                x2={renderPos.x}
                y2={renderPos.y}
                stroke={massVisual > 3 ? "#ef4444" : "#22d3ee"}
                strokeWidth={massVisual > 3 ? 1 : 2}
                strokeDasharray="4 2"
                className="opacity-50"
             />
          )}
      </svg>

      {/* Heavy Cursor */}
      <div
        className={cn(
            "absolute z-20 rounded-full flex items-center justify-center metal-texture cursor-shadow border transition-all duration-75",
            gameState === 'dropped' ? "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]" : "border-neutral-600",
            (gameState === 'idle' && isHoveringStart) && "ring-4 ring-yellow-500 ring-opacity-50 scale-105",
            isInvulnerable && "opacity-80 ring-2 ring-cyan-500"
        )}
        style={{
          width: (16 + massVisual * 2) * 2, // Radius * 2
          height: (16 + massVisual * 2) * 2,
          left: renderPos.x,
          top: renderPos.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
         <div className={cn(
             "w-2 h-2 rounded-full transition-colors",
             gameState === 'dragging' ? "bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" : "bg-neutral-800"
         )} />
         
         {/* Drag instructions tooltip */}
         {gameState === 'idle' && isHoveringStart && (
             <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-bold text-xs px-2 py-1 whitespace-nowrap rounded">
                 CLICK & HOLD TO LIFT
             </div>
         )}
      </div>

      {/* Mouse Target (The "Ghost") */}
      <div
        className={cn(
            "absolute w-8 h-8 rounded-full z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-100",
            gameState === 'dragging' ? "border-2 border-cyan-400 scale-75" : "border border-neutral-500 opacity-50"
        )}
        style={{ left: mousePos.x, top: mousePos.y }}
      >
         <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-0.5 h-full bg-current opacity-30" />
            <div className="h-0.5 w-full bg-current opacity-30" />
         </div>
      </div>


      {/* Overlays */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="border border-neutral-800 bg-neutral-900 p-12 rounded-lg text-center max-w-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                
                <h1 className="text-6xl font-black text-neutral-200 mb-2 tracking-tighter">HEAVY<span className="text-yellow-500">CURSOR</span></h1>
                <div className="text-xs font-mono text-neutral-500 mb-8 tracking-[0.5em]">INDUSTRIAL PHYSICS SIMULATOR</div>
                
                <div className="grid gap-4 text-left bg-neutral-950 p-6 rounded border border-neutral-800 mb-8 font-mono text-sm text-neutral-400">
                    <div className="flex gap-4">
                        <span className="text-yellow-500 font-bold">01.</span>
                        <span>CLICK & HOLD the payload to engage magnetic lift.</span>
                    </div>
                    <div className="flex gap-4">
                        <span className="text-yellow-500 font-bold">02.</span>
                        <span>Drag to destination. RELEASING causes instant drop.</span>
                    </div>
                    <div className="flex gap-4">
                        <span className="text-yellow-500 font-bold">03.</span>
                        <span>Momentum increases mass. Avoid wall impacts.</span>
                    </div>
                </div>

                <button
                    onClick={handleStart}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    INITIALIZE
                </button>

                <div className="mt-6 flex items-center justify-center gap-3">
                    <input
                        type="checkbox"
                        id="safetyMode"
                        checked={isSafetyMode}
                        onChange={(e) => setIsSafetyMode(e.target.checked)}
                        className="w-4 h-4 accent-yellow-500 bg-neutral-800 border-neutral-700"
                    />
                    <label htmlFor="safetyMode" className="text-neutral-500 font-mono text-xs cursor-pointer select-none hover:text-neutral-300">
                        ENABLE INERTIA DAMPENERS (EASY MODE)
                    </label>
                </div>
            </div>
        </div>
      )}

      {gameState === 'dropped' && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
             <div className="border-l-4 border-red-500 bg-black/50 p-8 max-w-md">
                <h2 className="text-4xl font-black text-white mb-2">CONTAINMENT BREACH</h2>
                <p className="text-red-400 font-mono mb-8 text-sm">PAYLOAD STABILITY LOST. CARGO DAMAGED.</p>
                <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold text-sm tracking-widest hover:bg-red-500 transition-colors w-full justify-center"
                >
                    <RefreshCcw className="w-4 h-4" />
                    RESTART SEQUENCE
                </button>
             </div>
        </div>
      )}
      
      {gameState === 'won' && (
        <div className="absolute inset-0 bg-green-900/80 flex flex-col items-center justify-center z-50">
             <h2 className="text-5xl font-bold text-white mb-2">OPERATIONS COMPLETE</h2>
             <p className="text-green-200 font-mono mb-8">All heavy loads delivered successfully.</p>
             <button 
                onClick={() => {
                    setCurrentLevelIdx(0);
                    setGameState('start');
                }}
                className="px-6 py-3 bg-green-500 text-black font-bold text-lg hover:bg-green-400"
            >
                RESET SIMULATION
            </button>
        </div>
      )}

    </motion.div>
  );
}