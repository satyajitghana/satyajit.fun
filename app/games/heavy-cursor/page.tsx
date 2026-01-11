'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  const [gameState, setGameState] = useState<'start' | 'playing' | 'crashed' | 'won'>('start');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [crashPos, setCrashPos] = useState<Point | null>(null);
  const [isSafetyMode, setIsSafetyMode] = useState(false);

  // Physics State Refs (mutable for loop performance)
  const targetRef = useRef<Point>({ x: 100, y: 500 }); // Mouse pos
  const posRef = useRef<Point>({ x: 100, y: 500 }); // Heavy cursor pos
  const velRef = useRef<Point>({ x: 0, y: 0 }); // Velocity
  const massRef = useRef<number>(BASE_MASS);
  const animationFrameRef = useRef<number>(0);
  
  // React State for UI rendering (updated less frequently if needed, or every frame)
  const [renderPos, setRenderPos] = useState<Point>({ x: 100, y: 500 });
  const [massVisual, setMassVisual] = useState(BASE_MASS);

  // Level Data
  const currentLevel = useMemo(() => LEVELS[currentLevelIdx], [currentLevelIdx]);

  // --- Physics Loop ---
  
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Reset physics on start
    posRef.current = { ...currentLevel.start };
    velRef.current = { x: 0, y: 0 };
    targetRef.current = { ...currentLevel.start };
    massRef.current = BASE_MASS;
    setCrashPos(null);

    const loop = () => {
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
      } else {
        massRef.current = Math.max(mass - RECOVERY_RATE, BASE_MASS);
      }

      // 6. Collision Detection
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
        setGameState('crashed');
        return; // Stop loop
      }

      // Goal
      const end = currentLevel.end;
      if (
        pos.x > end.x && pos.x < end.x + end.w &&
        pos.y > end.y && pos.y < end.y + end.h
      ) {
         if (currentLevelIdx < LEVELS.length - 1) {
            setCurrentLevelIdx(prev => prev + 1);
            // Quick reset for next level
            posRef.current = LEVELS[currentLevelIdx + 1].start;
            targetRef.current = LEVELS[currentLevelIdx + 1].start;
            velRef.current = { x: 0, y: 0 };
         } else {
            setGameState('won');
            return;
         }
      }

      // 7. Update UI
      setRenderPos({ ...pos });
      setMassVisual(massRef.current); // May want to throttle this if it causes lag, but usually React 18 handles it well enough
      
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState, currentLevel, currentLevelIdx]);

  // --- Event Handlers ---

  const handleMouseMove = (e: React.MouseEvent) => {
    if (gameState === 'playing') {
      targetRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleStart = () => {
    setGameState('playing');
  };

  const handleRetry = () => {
    setGameState('playing');
  };

  const handleNextLevel = () => {
      // Logic handled in loop mainly, but good for manual debug
  };

  // --- Render Helpers ---
  
  // Calculate string SVG path
  const stringPath = useMemo(() => {
    if (gameState !== 'playing' && gameState !== 'crashed') return '';
    // Draw a line from mouse (if we tracked it for render) to cursor
    // Actually, we need tracking mouse state for rendering the line even if not playing physics
    // But for now let's just use the last known targetRef for the line start
    return `M ${targetRef.current.x} ${targetRef.current.y} L ${renderPos.x} ${renderPos.y}`;
  }, [renderPos, gameState]);


  // Track mouse for rendering 'ghost' cursor even when not playing? 
  // We can just rely on native cursor for the "target" or hide it and render a custom one.
  // Let's render a custom "Target" reticle.
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
      const updateMouse = (e: MouseEvent) => {
          setMousePos({ x: e.clientX, y: e.clientY });
          if (gameState === 'playing') {
             targetRef.current = { x: e.clientX, y: e.clientY };
          }
      };
      window.addEventListener('mousemove', updateMouse);
      return () => window.removeEventListener('mousemove', updateMouse);
  }, [gameState]);


  return (
    <div className="heavy-cursor-game relative w-full h-screen overflow-hidden select-none bg-neutral-900">
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-50 flex gap-4 pointer-events-none">
        <Link href="/" className="pointer-events-auto bg-neutral-800 p-2 rounded border border-neutral-700 hover:bg-neutral-700 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="bg-neutral-800 px-4 py-2 rounded border border-neutral-700 font-mono text-sm">
          LEVEL {currentLevel.id} // {currentLevel.name.toUpperCase()}
        </div>
        <div className="bg-neutral-800 px-4 py-2 rounded border border-neutral-700 font-mono text-sm flex items-center gap-2">
            MASS: 
            <div className="w-24 h-2 bg-neutral-900 rounded-full overflow-hidden">
                <div 
                    className={cn(
                        "h-full transition-all duration-75",
                        massVisual > 3 ? "bg-red-500" : "bg-yellow-500"
                    )}
                    style={{ width: `${((massVisual - BASE_MASS) / (MAX_MASS - BASE_MASS)) * 100}%` }}
                />
            </div>
            {massVisual.toFixed(2)}kg
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
          {gameState === 'playing' && (
             <line 
                x1={mousePos.x} 
                y1={mousePos.y} 
                x2={renderPos.x} 
                y2={renderPos.y} 
                stroke="#666" 
                strokeWidth="2" 
                strokeDasharray="4 2"
             />
          )}
      </svg>

      {/* Heavy Cursor */}
      <div
        className={cn(
            "absolute z-20 rounded-full flex items-center justify-center metal-texture cursor-shadow border-2 border-neutral-400 transition-colors",
            gameState === 'crashed' && "border-red-500 bg-red-900/50"
        )}
        style={{
          width: (16 + massVisual * 2) * 2, // Radius * 2
          height: (16 + massVisual * 2) * 2,
          left: renderPos.x,
          top: renderPos.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
         <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      </div>

      {/* Mouse Target (The "Ghost") */}
      <div 
        className="absolute w-4 h-4 border-2 border-white rounded-full z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
        style={{ left: mousePos.x, top: mousePos.y }}
      />


      {/* Overlays */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
            <h1 className="text-6xl font-black text-yellow-500 mb-4 tracking-tighter">HEAVY CURSOR</h1>
            <p className="max-w-md text-center text-neutral-400 mb-8 font-mono">
                WARNING: Cursor exhibits extreme mass. <br/>
                Rapid movement causes fatigue and increases inertia. <br/>
                Move slowly. Be deliberate.
            </p>
            <button
                onClick={handleStart}
                className="px-8 py-4 bg-yellow-500 text-black font-bold text-xl hover:bg-yellow-400 hover:scale-105 transition-all"
            >
                INITIATE SEQUENCE
            </button>

            <div className="mt-8 flex items-center gap-2">
                <input
                    type="checkbox"
                    id="safetyMode"
                    checked={isSafetyMode}
                    onChange={(e) => setIsSafetyMode(e.target.checked)}
                    className="w-5 h-5 accent-yellow-500"
                />
                <label htmlFor="safetyMode" className="text-neutral-400 font-mono text-sm cursor-pointer select-none">
                    ENABLE SAFETY ASSIST (REDUCED INERTIA)
                </label>
            </div>
        </div>
      )}

      {gameState === 'crashed' && (
        <div className="absolute inset-0 bg-red-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-50">
             <h2 className="text-5xl font-bold text-white mb-2">CRITICAL FAILURE</h2>
             <p className="text-red-200 font-mono mb-8">Structural integrity compromised.</p>
             <button 
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-lg hover:bg-neutral-200"
            >
                <RefreshCcw className="w-5 h-5" />
                RETRY SYSTEM
            </button>
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

    </div>
  );
}