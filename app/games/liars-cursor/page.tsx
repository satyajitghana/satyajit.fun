"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, MousePointer2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import "./liar-theme.css";

// --- Types ---
interface Level {
  id: number;
  instruction: string;
  type: "static" | "moving" | "decoy" | "invisible";
  config: {
    offset: { x: number; y: number }; // Constant offset
    driftIntensity: number; // Random wander
    inverse: boolean; // Invert controls
    swapClicks: boolean; // Left click ignored, Right click works
    fakeTooltip?: string; // Misleading text near cursor
    buttons: { id: string; label: string; isTrap: boolean; x: number; y: number; tooltip?: string }[];
  };
}

// --- Game Constants & Levels ---
const LEVELS: Level[] = [
  {
    id: 1,
    instruction: "Click the Green Button",
    type: "static",
    config: {
      offset: { x: 0, y: 0 },
      driftIntensity: 0,
      inverse: false,
      swapClicks: false,
      buttons: [{ id: "btn-1", label: "Continue", isTrap: false, x: 0, y: 0, tooltip: "Safe to click" }],
    },
  },
  {
    id: 2,
    instruction: "Trust is slipping...",
    type: "static",
    config: {
      offset: { x: 30, y: 30 }, // Fixed offset
      driftIntensity: 0,
      inverse: false,
      swapClicks: false,
      fakeTooltip: "Cursor position calibrated",
      buttons: [{ id: "btn-2", label: "Confirm", isTrap: false, x: 0, y: 0 }],
    },
  },
  {
    id: 3,
    instruction: "Hold steady.",
    type: "moving",
    config: {
      offset: { x: 0, y: 0 },
      driftIntensity: 2.5, // High drift
      inverse: false,
      swapClicks: false,
      fakeTooltip: "Stabilizing...",
      buttons: [{ id: "btn-3", label: "Verify", isTrap: false, x: 0, y: 0 }],
    },
  },
   {
    id: 4,
    instruction: "Everything is backwards.",
    type: "moving",
    config: {
      offset: { x: 0, y: 0 },
      driftIntensity: 0,
      inverse: true, // Inverted controls
      swapClicks: false,
      fakeTooltip: "Axis inverted for safety",
      buttons: [{ id: "btn-4", label: "Inverted", isTrap: false, x: 0, y: 0 }],
    },
  },
  {
      id: 5,
      instruction: "Don't click the Red one.",
      type: "decoy",
      config: {
          offset: { x: -50, y: 20 },
          driftIntensity: 1,
          inverse: false,
          swapClicks: false,
          fakeTooltip: "Red is safe",
          buttons: [
              { id: "btn-5-trap", label: "Click Me", isTrap: true, x: -80, y: 0 },
              { id: "btn-5-real", label: "No, Me", isTrap: false, x: 80, y: 0 }
          ]
      }
  },
  {
      id: 6,
      instruction: "Right is Wrong. Left is Right? No...",
      type: "static",
      config: {
          offset: { x: 0, y: 0 },
          driftIntensity: 0.5,
          inverse: false,
          swapClicks: true, // Right click required
          fakeTooltip: "Left Click Broken",
          buttons: [{ id: "btn-6", label: "Right Click Me", isTrap: false, x: 0, y: 0 }]
      }
  },
  {
      id: 7,
      instruction: "Total dissociaton.",
      type: "moving",
      config: {
          offset: { x: 100, y: -100 },
          driftIntensity: 4,
          inverse: true,
          swapClicks: true,
          fakeTooltip: "System Error: Input Lost",
          buttons: [{ id: "btn-7", label: "Finish", isTrap: false, x: 0, y: 0 }]
      }
  }
];

export default function LiarsCursorGame() {
  // --- State ---
  const [realPos, setRealPos] = useState({ x: -100, y: -100 });
  const [fakePos, setFakePos] = useState({ x: -100, y: -100 });
  // Use ref for velocity to avoid re-renders in animation loop
  const velocityRef = useRef({ x: 0, y: 0 });
  
  // Keep track of fakePos in a ref for event handlers to access without dependency cycles
  const fakePosRef = useRef({ x: -100, y: -100 });
  
  const [gameState, setGameState] = useState<"intro" | "playing" | "won" | "lost">("intro");
  const [levelIndex, setLevelIndex] = useState(0);
  const [trust, setTrust] = useState(100);
  const [cursorVariant, setCursorVariant] = useState<"default" | "pointer">("default");
  const [buttonRects, setButtonRects] = useState<Record<string, DOMRect>>({});
  const [isRevealing, setIsRevealing] = useState(false); // Press Space to reveal

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // --- Core Loop: Physics & Deception ---
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      const delta = (time - lastTime) / 16; // Normalize to ~60fps
      lastTime = time;

      if (gameState !== 'playing') {
          // Sync cursor perfectly when not playing
          setFakePos(prev => {
            // Smooth lerp to real pos for intro
            const next = {
                x: prev.x + (realPos.x - prev.x) * 0.2,
                y: prev.y + (realPos.y - prev.y) * 0.2
            };
            fakePosRef.current = next;
            return next;
          });
          animationFrameId = requestAnimationFrame(update);
          return;
      }

      // Reveal Mechanic: If spacebar is held, snap to real pos but drain trust
      if (isRevealing) {
           const next = { x: realPos.x, y: realPos.y };
           setFakePos(next);
           fakePosRef.current = next;
           // Drain trust rapidly
           setTrust(t => Math.max(0, t - 0.2));
           animationFrameId = requestAnimationFrame(update);
           return;
      }

      const level = LEVELS[levelIndex];
      const { offset, driftIntensity, inverse } = level.config;

      setFakePos(currentFake => {
        // 1. Calculate Target Position (Where the cursor "should" be based on input + offset)
        let targetX = realPos.x + offset.x;
        let targetY = realPos.y + offset.y;

        // Inversion logic relative to screen center (simplified)
        if (inverse) {
             const centerX = window.innerWidth / 2;
             const centerY = window.innerHeight / 2;
             targetX = centerX - (realPos.x - centerX);
             targetY = centerY - (realPos.y - centerY);
        }

        // 2. Add Drift (Brownian motion added to velocity)
        let vx = velocityRef.current.x;
        let vy = velocityRef.current.y;
        
        if (driftIntensity > 0) {
            vx += (Math.random() - 0.5) * driftIntensity;
            vy += (Math.random() - 0.5) * driftIntensity;
            
            // Damping to prevent infinite acceleration
            vx *= 0.95;
            vy *= 0.95;
            
            velocityRef.current = { x: vx, y: vy };
        } else {
            // Reset velocity if no drift
            vx = 0; vy = 0;
            velocityRef.current = { x: 0, y: 0 };
        }

        // 3. Apply changes
        // Use a lerp for "lag" feel, or direct for "snappy but wrong"
        // Drift is added ON TOP of the target position calculation
        
        const newX = targetX + vx * 5;
        const newY = targetY + vy * 5;

        const next = { x: newX, y: newY };
        fakePosRef.current = next;
        return next;
      });

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [realPos, gameState, levelIndex, isRevealing]);


  // --- Input Handlers ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setRealPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => setCursorVariant("pointer");
    const handleMouseUp = () => setCursorVariant("default");
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && gameState === 'playing') {
            setIsRevealing(true);
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            setIsRevealing(false);
        }
    };

    // The Global Click Interceptor
    // We listen to 'click' (and 'contextmenu' for right clicks) on the window,
    // prevent default if it's a game click, and manually check collisions.
    const handleClick = (e: MouseEvent) => {
        if (gameState !== 'playing') return;

        const level = LEVELS[levelIndex];
        const isRightClick = e.type === 'contextmenu';
        const requiresRightClick = level.config.swapClicks;

        // If level requires right click, ignore left clicks (and vice versa logic if needed)
        // But for "swapClicks", typically we mean "Left click does nothing, Right click acts as Left Click"
        // or "Buttons swapped". Let's go with: Must use Right Click to interact.
        
        if (requiresRightClick && !isRightClick) {
             // Maybe show a hint "Click harder?" or just fail
             return;
        }
        if (!requiresRightClick && isRightClick) {
            e.preventDefault(); // Prevent context menu always in game
            return;
        }
        
        if (isRightClick) e.preventDefault(); // Always prevent default context menu

        // Check collisions with registered buttons using FAKE cursor pos
        let hit = false;
        // Use ref here to access latest position without triggering effect re-run
        const collisionPoint = { x: fakePosRef.current.x, y: fakePosRef.current.y };

        Object.entries(buttonRects).forEach(([id, rect]) => {
            if (
                collisionPoint.x >= rect.left &&
                collisionPoint.x <= rect.right &&
                collisionPoint.y >= rect.top &&
                collisionPoint.y <= rect.bottom
            ) {
                hit = true;
                handleGameButtonClick(id);
            }
        });

        if (!hit && gameState === 'playing') {
             setTrust(t => Math.max(0, t - 5));
        }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("click", handleClick);
    window.addEventListener("contextmenu", handleClick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("contextmenu", handleClick);
    };
  }, [gameState, buttonRects, levelIndex]); // Removed fakePos from dependencies


  // --- Game Logic ---
  const handleGameButtonClick = (btnId: string) => {
      const level = LEVELS[levelIndex];
      const btnConfig = level.config.buttons.find(b => b.id === btnId);
      
      if (!btnConfig) return;

      if (btnConfig.isTrap) {
          // Trap triggered!
          setTrust(t => Math.max(0, t - 20));
          // Visual shake or glitch effect
      } else {
          // Success!
          if (levelIndex < LEVELS.length - 1) {
              setLevelIndex(prev => prev + 1);
              setTrust(t => Math.min(100, t + 10)); // Restore some trust
          } else {
              setGameState("won");
          }
      }
  };

  const startGame = () => {
    setGameState("playing");
    setLevelIndex(0);
    setTrust(100);
  };


  // --- Render Helpers ---
  // Re-measure on level change or resize
  useEffect(() => {
      const updateRects = () => {
          const newRects: Record<string, DOMRect> = {};
          Object.entries(buttonRefs.current).forEach(([id, node]) => {
              if (node) {
                  newRects[id] = node.getBoundingClientRect();
              }
          });
          setButtonRects(newRects);
      };

      // Initial measure
      updateRects();

      // Listen for resize
      window.addEventListener('resize', updateRects);
      return () => window.removeEventListener('resize', updateRects);
  }, [levelIndex]);

  // Just store the ref, don't trigger state update here to avoid render loops
  const measureButton = useCallback((id: string, node: HTMLButtonElement | null) => {
      buttonRefs.current[id] = node;
  }, []);


  return (
    <div className="liar-game-theme min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans overflow-hidden cursor-none relative selection:bg-transparent">
      
      {/* --- The Fake Cursor --- */}
      <div
        className="fake-cursor pointer-events-none fixed z-[9999]"
        style={{
            transform: `translate(${fakePos.x}px, ${fakePos.y}px)`,
        }}
      >
        <MousePointer2
            className={`w-6 h-6 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-transform duration-100 ${cursorVariant === 'pointer' ? 'scale-90' : ''}`}
            fill="black"
        />
        {/* Tooltip near fake cursor */}
        {gameState === 'playing' && LEVELS[levelIndex].config.fakeTooltip && (
            <div className="absolute top-6 left-6 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap border border-white/10">
                {LEVELS[levelIndex].config.fakeTooltip}
            </div>
        )}
      </div>


      {/* --- UI Layer --- */}
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
        <Link href="/" className="pointer-events-auto flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors glass-panel px-4 py-2 rounded-full cursor-none hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Escape</span>
        </Link>
        
        {/* Trust Meter */}
        <div className="glass-panel px-4 py-2 rounded-full flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">System Trust</span>
            <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[var(--truth)] transition-all duration-500 ease-out"
                        style={{ width: `${trust}%`, backgroundColor: trust < 40 ? 'var(--lie)' : trust < 70 ? 'var(--doubt)' : 'var(--truth)' }}
                    />
                </div>
                <span className={`font-mono text-xs ${trust < 40 ? 'text-[var(--lie)]' : 'text-[var(--muted-foreground)]'}`}>{Math.round(trust)}%</span>
            </div>
            {isRevealing && (
                <span className="text-[10px] text-[var(--lie)] font-bold animate-pulse mt-1">WARNING: REVEALING TRUTH</span>
            )}
            {!isRevealing && gameState === 'playing' && (
                 <span className="text-[9px] text-[var(--muted-foreground)] mt-1 opacity-50">Hold SPACE to reveal (costs trust)</span>
            )}
        </div>
      </div>

      <main className="h-screen w-full flex flex-col items-center justify-center p-4">
        
        <AnimatePresence mode="wait">
            {gameState === 'intro' && (
                <motion.div
                    key="intro"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center gap-8 max-w-md text-center"
                >
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tighter glitch-text">
                        Liar's Cursor
                    </h1>
                    <p className="text-[var(--muted-foreground)]">
                        The interface is lying to you. <br/>
                        Trust nothing but your instincts.
                    </p>
                    
                    {/* Intro Button - This one works normally because it's not part of the game loop trap logic yet */}
                    <button
                        onClick={startGame}
                        className="glass-panel px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all active:scale-95 pointer-events-auto cursor-none"
                    >
                        Initialize System
                    </button>
                </motion.div>
            )}

            {gameState === 'playing' && (
                <motion.div
                    key="level"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-2xl flex flex-col items-center gap-12"
                >
                    <div className="text-center space-y-2">
                        <span className="text-xs font-mono text-[var(--muted-foreground)]">LEVEL {levelIndex + 1}</span>
                        <h2 className="text-3xl font-bold">{LEVELS[levelIndex].instruction}</h2>
                    </div>

                    {/* Game Area */}
                    <div
                        ref={containerRef}
                        className="w-full h-80 glass-panel rounded-3xl relative flex items-center justify-center overflow-hidden"
                    >
                        {LEVELS[levelIndex].config.buttons.map((btn) => (
                            <button
                                key={btn.id}
                                ref={(el) => measureButton(btn.id, el)}
                                // We disable default onClick because the global handler manages it based on fake cursor
                                onClick={(e) => e.preventDefault()}
                                className={`
                                    absolute px-8 py-4 rounded-xl font-bold shadow-2xl transition-all duration-300
                                    ${btn.isTrap
                                        ? "bg-[var(--lie)] text-black shadow-red-900/20"
                                        : "bg-[var(--truth)] text-black shadow-green-900/20"
                                    }
                                `}
                                style={{
                                    transform: `translate(${btn.x}px, ${btn.y}px)`,
                                }}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
            
            {gameState === 'won' && (
                <motion.div key="won" className="text-center" initial={{opacity:0}} animate={{opacity:1}}>
                    <h2 className="text-4xl font-bold text-[var(--truth)]">System Override Complete</h2>
                    <p className="mt-4 text-[var(--muted-foreground)]">You saw through the lies.</p>
                    <button
                        onClick={() => setGameState('intro')}
                        className="mt-8 glass-panel px-6 py-2 rounded-full pointer-events-auto cursor-none hover:bg-white/10"
                    >
                        Reset
                    </button>
                </motion.div>
            )}

            {trust <= 0 && gameState === 'playing' && (
                 <motion.div key="lost" className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center text-center" initial={{opacity:0}} animate={{opacity:1}}>
                    <h2 className="text-5xl font-bold text-[var(--lie)] mb-4">SYSTEM FAILURE</h2>
                    <p className="text-[var(--muted-foreground)]">You trusted the lies.</p>
                    <button
                        onClick={() => {
                            setGameState('intro');
                            setTrust(100);
                        }}
                        className="mt-8 bg-[var(--lie)] text-black font-bold px-8 py-3 rounded-full pointer-events-auto cursor-none hover:scale-105"
                    >
                        Reboot
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

      </main>
    </div>
  );
}