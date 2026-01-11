"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, HelpCircle, MousePointer2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import "./unlearn-theme.css";

// --- Types ---

type ControlType = "standard" | "inverted" | "scroll-y" | "stillness" | "click-step" | "chaos";

interface Level {
  id: number;
  name: string;
  instruction: string;
  controlType: ControlType;
  targetCount: number; // How many targets to hit to pass
}

const LEVELS: Level[] = [
  {
    id: 1,
    name: "Reflection",
    instruction: "Up is Down. Left is Right.",
    controlType: "inverted",
    targetCount: 3,
  },
  {
    id: 2,
    name: "The Wheel",
    instruction: "X marks the spot. Scroll to rise.",
    controlType: "scroll-y",
    targetCount: 3,
  },
  {
    id: 3,
    name: "Zen",
    instruction: "Action hinders progress. Be still.",
    controlType: "stillness",
    targetCount: 3,
  },
  {
    id: 4,
    name: "Manual Transmission",
    instruction: "Movement is broken. Force it.",
    controlType: "click-step",
    targetCount: 3,
  },
  {
    id: 5,
    name: "Entropy",
    instruction: "Do not trust your hands.",
    controlType: "chaos",
    targetCount: 5,
  },
];

export default function UnlearnGame() {
  // --- State ---
  const [gameState, setGameState] = useState<"intro" | "playing" | "won" | "lost">("intro");
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0); // Targets hit in current level
  const [cursorVariant, setCursorVariant] = useState<"default" | "hit" | "fail">("default");

  // Cursor Physics
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 }); // The game cursor
  const [realMousePos, setRealMousePos] = useState({ x: 0, y: 0 }); // The actual invisible mouse
  const [scrollAccumulator, setScrollAccumulator] = useState(0); // For scroll control
  
  // Game Objects
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [targetSize, setTargetSize] = useState(40);
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 });
  
  // Chaos Mode State
  const [chaosMode, setChaosMode] = useState<ControlType>("standard");
  const chaosTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const getRandomPos = () => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 50;
    return {
      x: Math.random() * (rect.width - padding * 2) + padding,
      y: Math.random() * (rect.height - padding * 2) + padding,
    };
  };

  const spawnTarget = () => {
    setTargetPos(getRandomPos());
  };

  const resetLevel = () => {
    setScore(0);
    spawnTarget();
    // Center cursor
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCursorPos({ x: rect.width / 2, y: rect.height / 2 });
        setScrollAccumulator(rect.height / 2);
    }
  };

  // --- Game Loop / Input Handling ---
  
  // 1. Mouse Move Listener (Global)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== "playing") return;
      
      // Update real mouse ref relative to container if possible, else screen
      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setRealMousePos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
          });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [gameState]);

  // 2. Scroll Listener
  useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
        if (gameState !== "playing") return;
        setScrollAccumulator(prev => {
            const newVal = prev + e.deltaY * 0.5;
            // Clamp to container height? We'll do that in render/logic
            return newVal;
        });
      };
      
      window.addEventListener("wheel", handleWheel, { passive: false });
      return () => window.removeEventListener("wheel", handleWheel);
  }, [gameState]);
  
  // 3. Click Listener
  useEffect(() => {
      const handleClick = (e: MouseEvent) => {
          if (gameState !== "playing") return;
          
          const level = LEVELS[levelIndex];
          const currentMode = level.controlType === "chaos" ? chaosMode : level.controlType;
          
          if (currentMode === "click-step") {
              // Move cursor towards real mouse
              setCursorPos(prev => {
                  const dx = realMousePos.x - prev.x;
                  const dy = realMousePos.y - prev.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  const step = 50; // pixels per click
                  
                  if (dist < step) return { x: realMousePos.x, y: realMousePos.y };
                  
                  return {
                      x: prev.x + (dx / dist) * step,
                      y: prev.y + (dy / dist) * step
                  };
              });
          }
      };
      
      window.addEventListener("mousedown", handleClick);
      return () => window.removeEventListener("mousedown", handleClick);
  }, [gameState, levelIndex, chaosMode, realMousePos]);


  // 4. Main Tick Loop
  useEffect(() => {
    if (gameState !== "playing") return;

    let animationFrameId: number;
    
    const update = () => {
        if (!containerRef.current) {
            animationFrameId = requestAnimationFrame(update);
            return;
        }
        
        const rect = containerRef.current.getBoundingClientRect();
        const level = LEVELS[levelIndex];
        const currentMode = level.controlType === "chaos" ? chaosMode : level.controlType;

        setCursorPos(prev => {
            let nextX = prev.x;
            let nextY = prev.y;

            switch (currentMode) {
                case "standard":
                    // Should not happen in this game usually, but for fallback
                    nextX = realMousePos.x;
                    nextY = realMousePos.y;
                    break;

                case "inverted":
                    // Center of container
                    const cx = rect.width / 2;
                    const cy = rect.height / 2;
                    nextX = cx - (realMousePos.x - cx);
                    nextY = cy - (realMousePos.y - cy);
                    break;
                    
                case "scroll-y":
                    nextX = realMousePos.x;
                    // Map scroll accumulator to Y
                    // Ensure it stays within bounds
                    let sY = scrollAccumulator;
                    if (sY < 0) sY = 0;
                    if (sY > rect.height) sY = rect.height;
                    nextY = sY;
                    break;

                case "stillness":
                    // Move towards target ONLY if mouse hasn't moved much?
                    // Implementation: We need "last real mouse pos" to check delta.
                    // For simplicity in React state, let's say:
                    // If realMousePos is close to "last frame real mouse pos", we move cursor to target.
                    // Actually, getting delta inside this loop is tricky without ref.
                    // Let's change mechanic slightly:
                    // The cursor constantly drifts towards the target.
                    // BUT, if you move the mouse (trigger mousemove), it gets pushed AWAY from target.
                    // Since we can't easily detect "no movement" without a timer reset...
                    // Let's use a simpler "Auto-Drive".
                    // Cursor moves 2px/frame towards target.
                    // realMousePos adds an offset AWAY from center.
                    // So to hit target, you must keep mouse in center (neutral).
                    
                    const dx = targetPos.x - prev.x;
                    const dy = targetPos.y - prev.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    // Auto move
                    if (dist > 1) {
                        nextX += (dx / dist) * 2; // Speed
                        nextY += (dy / dist) * 2;
                    }
                    
                    // Disturbance from mouse movement? 
                    // Let's use distance from center of screen as "Disturbance"
                    const centerDistX = realMousePos.x - (rect.width/2);
                    const centerDistY = realMousePos.y - (rect.height/2);
                    
                    // If you aren't in center, you push the cursor away
                    nextX += centerDistX * 0.05;
                    nextY += centerDistY * 0.05;
                    break;

                case "click-step":
                    // Handled in click listener, but we preserve position here
                    // Maybe add friction or drift? No, static is fine.
                    break;
                    
                case "chaos":
                    // Handled by switching modes
                    break;
            }

            // Clamp to screen
            nextX = Math.max(0, Math.min(rect.width, nextX));
            nextY = Math.max(0, Math.min(rect.height, nextY));

            return { x: nextX, y: nextY };
        });
        
        // Collision Check
        const distToTarget = Math.sqrt(
            Math.pow(cursorPos.x - targetPos.x, 2) + 
            Math.pow(cursorPos.y - targetPos.y, 2)
        );
        
        if (distToTarget < targetSize / 2 + 10) { // 10 is approx cursor radius
            // Hit!
            handleTargetHit();
        }

        animationFrameId = requestAnimationFrame(update);
    };
    
    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, levelIndex, chaosMode, realMousePos, targetPos, scrollAccumulator]);




  // Chaos Mode Switcher
  useEffect(() => {
      if (LEVELS[levelIndex].controlType === "chaos" && gameState === "playing") {
          const modes: ControlType[] = ["inverted", "scroll-y", "stillness", "click-step"];
          
          const switchChaos = () => {
              const r = modes[Math.floor(Math.random() * modes.length)];
              setChaosMode(r);
          };
          
          // Initial random
          switchChaos();
          
          const interval = setInterval(switchChaos, 4000);
          return () => clearInterval(interval);
      }
  }, [levelIndex, gameState]);

  // Handle Resize
  useEffect(() => {
      const handleResize = () => {
          if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            setWindowSize({ w: width, h: height });
            // Keep target in bounds?
            spawnTarget();
          }
      };
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
  }, []);


  const handleTargetHit = () => {
      setCursorVariant("hit");
      setTimeout(() => setCursorVariant("default"), 200);

      const level = LEVELS[levelIndex];
      const newScore = score + 1;
      setScore(newScore);
      
      if (newScore >= level.targetCount) {
          // Level Complete
          if (levelIndex < LEVELS.length - 1) {
              setLevelIndex(prev => prev + 1);
              setScore(0);
              spawnTarget();
          } else {
              setGameState("won");
          }
      } else {
          spawnTarget();
      }
  };

  const startGame = () => {
      setGameState("playing");
      setLevelIndex(0);
      setScore(0);
      spawnTarget();
  };

  return (
    <div className="unlearn-theme min-h-screen relative overflow-hidden cursor-none selection:bg-transparent">
      
      {/* --- Cursor --- */}
      {gameState === 'playing' && (
          <div
            className={`unlearn-cursor ${cursorVariant}`}
            style={{
                left: cursorPos.x,
                top: cursorPos.y,
            }}
          >
              <div className="w-full h-full bg-white/50 rounded-full animate-pulse" />
          </div>
      )}

      {/* --- Main Container --- */}
      <main 
        ref={containerRef}
        className="w-full h-screen flex flex-col items-center justify-center relative"
      >
        
        {/* Navigation */}
        <div className="absolute top-0 left-0 p-6 z-50 pointer-events-none">
             <Link href="/" className="pointer-events-auto flex items-center gap-2 text-[var(--text-color)] opacity-50 hover:opacity-100 transition-opacity">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-mono text-sm">EXIT_SIMULATION</span>
             </Link>
        </div>

        {/* Level Info */}
        {gameState === 'playing' && (
             <div className="absolute top-6 right-6 text-right pointer-events-none z-40">
                <h2 className="text-xl font-bold uppercase tracking-widest text-[var(--accent-color)]">
                    {LEVELS[levelIndex].name}
                </h2>
                <p className="text-sm text-[var(--text-color)] opacity-70 mt-1 max-w-xs">
                    {LEVELS[levelIndex].instruction}
                </p>
                {LEVELS[levelIndex].controlType === 'chaos' && (
                    <p className="text-xs text-[var(--danger-color)] mt-2 animate-pulse uppercase">
                        Mode: {chaosMode}
                    </p>
                )}
                <div className="mt-4 flex gap-1 justify-end">
                    {Array.from({ length: LEVELS[levelIndex].targetCount }).map((_, i) => (
                        <div 
                            key={i}
                            className={`w-3 h-3 rounded-full border border-[var(--text-color)] ${i < score ? 'bg-[var(--success-color)] border-transparent' : 'bg-transparent'}`}
                        />
                    ))}
                </div>
             </div>
        )}

        {/* Game Area & Targets */}
        <AnimatePresence mode="wait">
            {gameState === 'intro' && (
                <motion.div 
                    key="intro"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="text-center max-w-md z-50"
                >
                    <h1 className="text-6xl font-bold mb-6 glitch-text text-[var(--accent-color)]">UNLEARN</h1>
                    <p className="text-lg text-[var(--text-color)] mb-12 opacity-80 leading-relaxed">
                        Your instincts are wrong here.<br/>
                        To move forward, you must let go of what you know.
                    </p>
                    <button
                        onClick={startGame}
                        className="px-8 py-4 border border-[var(--accent-color)] text-[var(--accent-color)] hover:bg-[var(--accent-color)] hover:text-black transition-all font-bold tracking-widest pointer-events-auto cursor-none"
                    >
                        INITIATE
                    </button>
                </motion.div>
            )}

            {gameState === 'playing' && (
                <motion.div
                    key="target"
                    className="absolute unlearn-target flex items-center justify-center"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                        left: targetPos.x,
                        top: targetPos.y,
                        scale: 1, 
                        opacity: 1 
                    }}
                    transition={{ 
                        type: "spring",
                        stiffness: 300,
                        damping: 20
                    }}
                    style={{
                        width: targetSize,
                        height: targetSize,
                        // We set left/top in animate, but initial position needs to be set too to prevent jump
                        left: targetPos.x,
                        top: targetPos.y,
                    }}
                >
                    <div className="w-full h-full rounded-full border-2 border-[var(--text-color)] animate-[spin_4s_linear_infinite]" />
                    <div className="absolute w-2/3 h-2/3 bg-[var(--accent-color)] rounded-full opacity-50 blur-sm" />
                </motion.div>
            )}

            {gameState === 'won' && (
                <motion.div 
                    key="won"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center z-50"
                >
                    <h2 className="text-4xl font-bold mb-4 text-[var(--success-color)]">SYNC COMPLETE</h2>
                    <p className="mb-8 opacity-70">You have successfully unlearned.</p>
                    <button
                        onClick={startGame}
                        className="px-6 py-2 border border-[var(--text-color)] hover:bg-white/10 transition-colors pointer-events-auto cursor-none"
                    >
                        Re-run Protocol
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Custom Render for Cursor inside main for correct Z-index if needed, but fixed overlay is safer */}
      </main>
      
      {/* Override global cursor logic from the container div class 'cursor-none' */}
      
      {/* Invisible Custom Cursor for "Click-Drive" or "Stillness" feedback? 
          For "Stillness", maybe show a "Noise" meter near the cursor?
      */}
      {LEVELS[levelIndex]?.controlType === 'stillness' && gameState === 'playing' && (
           <div 
             className="fixed pointer-events-none text-[10px] text-[var(--danger-color)] opacity-50"
             style={{ 
                 left: cursorPos.x + 20, 
                 top: cursorPos.y,
                 transform: 'translate(0, -50%)'
             }}
           >
             {Math.abs(realMousePos.x - (windowSize.w/2)) > 20 || Math.abs(realMousePos.y - (windowSize.h/2)) > 20 ? "DISTURBANCE DETECTED" : "STABLE"}
           </div>
      )}

    </div>
  );
}