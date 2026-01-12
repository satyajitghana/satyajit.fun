"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, RefreshCw, AlertTriangle, Fingerprint, Activity, Skull } from "lucide-react";
import "./human-theme.css";
import { usePrecisionTracker } from "./use-precision-tracker";

// --- Game Constants ---
const INITIAL_SPEED = 3;
const MAX_SPEED = 12; // Speed increases as you get more "perfect"
const INITIAL_GAP = 300;
const MIN_GAP = 60; // The squeeze
const GAP_REDUCTION_FACTOR = 2.5; // How much gap shrinks per machine score point
const CHECKPOINT_INTERVAL = 1000; // Distance between Turing Tests

interface Wall {
  y: number;
  height: number;
  gapX: number; // Center of the gap
  gapWidth: number;
}

interface TuringTestState {
    active: boolean;
    shape: "circle" | "triangle" | "square";
    points: {x: number, y: number}[];
    timeLeft: number;
}

export default function HumanErrorGame() {
  // --- State ---
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover" | "turing_test">("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [flavorText, setFlavorText] = useState("Status: Unknown Entity");
  const [machineState, setMachineState] = useState<"human" | "machine">("human");
  const [turingTest, setTuringTest] = useState<TuringTestState>({ active: false, shape: "circle", points: [], timeLeft: 5000 });
  
  // --- Refs & Hooks ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const playerPos = useRef({ x: 0, y: 0 }); // Relative to canvas
  const walls = useRef<Wall[]>([]);
  const distanceTraveled = useRef(0);
  const nextCheckpoint = useRef(CHECKPOINT_INTERVAL);
  
  // Precision Tracker
  const { metrics, addPoint, reset: resetTracker } = usePrecisionTracker();

  // --- Helpers ---
  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // --- Game Loop Logic ---
  const spawnWall = useCallback((y: number, currentGap: number, canvasWidth: number) => {
    // Determine gap position. It should wander slowly, not jump.
    // We can use Perlin noise or just a simple sine wave + random drift for now.
    // For "Machine" punishment, maybe the path becomes STRAIGHTER but NARROWER?
    // Actually, making it windier is harder for a human, making it straighter is harder if you are trying to be imperfect.
    // Let's stick to the concept:
    // High Precision -> Walls close in (Gap shrinks). Path straightens (Inviting you to be linear, which kills you).
    // Low Precision -> Walls widen. Path becomes erratic (Forcing you to move, which keeps you alive).
    
    const lastWall = walls.current[walls.current.length - 1];
    let newGapX = canvasWidth / 2;
    
    if (lastWall) {
        // Drift
        const maxDrift = 50;
        const drift = (Math.random() - 0.5) * maxDrift;
        newGapX = Math.max(currentGap/2 + 20, Math.min(canvasWidth - currentGap/2 - 20, lastWall.gapX + drift));
    }

    walls.current.push({
      y: y,
      height: 20, // distance between wall slices
      gapX: newGapX,
      gapWidth: currentGap
    });
  }, []);

  const startTuringTest = useCallback(() => {
      setGameState("turing_test");
      setTuringTest({
          active: true,
          shape: "circle", // For now just circle
          points: [],
          timeLeft: 5000
      });
      setFlavorText("AUTHENTICATION REQUIRED. PROVE HUMANITY.");
      // Clear walls near player
      walls.current = walls.current.filter(w => w.y > canvasRef.current!.height || w.y < 0);
  }, []);

  const evaluateTuringTest = useCallback(() => {
      const pts = turingTest.points;
      if (pts.length < 10) {
          // Failed to draw anything
          setGameState("gameover");
          return;
      }

      // Simple Circle Detection
      // Calc center
      const cx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
      const cy = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
      const radii = pts.map(p => Math.sqrt(Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2)));
      const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;
      
      // Variance
      const variance = radii.reduce((sum, r) => sum + Math.pow(r - avgRadius, 2), 0) / radii.length;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / avgRadius; // Coeff of Variation
      
      // If CV is low (< 0.15), it's a good circle -> ROBOT -> FAIL
      // If CV is high (> 0.15), it's a bad circle -> HUMAN -> PASS
      
      if (cv < 0.15) {
           setGameState("gameover"); // Too perfect
           setFlavorText("ERROR: CIRCLE TOO PERFECT. BOT DETECTED.");
      } else {
           // Success
           setGameState("playing");
           setTuringTest(prev => ({ ...prev, active: false }));
           nextCheckpoint.current = distanceTraveled.current + CHECKPOINT_INTERVAL;
      }

  }, [turingTest.points]);

  const updateGame = useCallback(() => {
    if (gameState !== "playing" && gameState !== "turing_test") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // --- Turing Test Mode ---
    if (gameState === "turing_test") {
        // Clear
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Timer
        setTuringTest(prev => {
             const newTime = prev.timeLeft - 16;
             if (newTime <= 0) {
                 evaluateTuringTest();
                 return prev;
             }
             return { ...prev, timeLeft: newTime };
        });

        // Instructions
        ctx.fillStyle = "#10b981";
        ctx.font = "20px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("DRAW A POTATO-SHAPED CIRCLE", canvas.width/2, 100);
        ctx.fillStyle = "#ef4444";
        ctx.fillText((turingTest.timeLeft / 1000).toFixed(1) + "s", canvas.width/2, 140);
        
        // Draw user path
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 4;
        ctx.beginPath();
        if (turingTest.points.length > 0) {
            ctx.moveTo(turingTest.points[0].x, turingTest.points[0].y);
            for (let i = 1; i < turingTest.points.length; i++) {
                ctx.lineTo(turingTest.points[i].x, turingTest.points[i].y);
            }
        }
        ctx.stroke();
        
        // Draw Player Cursor
        ctx.beginPath();
        ctx.arc(playerPos.current.x, playerPos.current.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        
        requestRef.current = requestAnimationFrame(updateGame);
        return;
    }

    // --- Normal Game Mode ---

    // 1. Calculate Difficulty Modifiers based on Machine Score
    // Machine Score 0 -> Gap 300, Speed 3
    // Machine Score 100 -> Gap 60, Speed 12
    const precisionFactor = metrics.machineScore / 100;
    
    const currentSpeed = INITIAL_SPEED + (MAX_SPEED - INITIAL_SPEED) * precisionFactor;
    const targetGap = Math.max(MIN_GAP, INITIAL_GAP - (metrics.machineScore * GAP_REDUCTION_FACTOR));
    
    // Smooth gap transition?
    // For now, let's just use the target gap for new walls.

    // 2. Move Walls
    distanceTraveled.current += currentSpeed;
    setScore(Math.floor(distanceTraveled.current / 100));

    // Checkpoint Trigger
    if (distanceTraveled.current > nextCheckpoint.current) {
        startTuringTest();
        return;
    }

    // Remove off-screen walls
    if (walls.current.length > 0 && walls.current[0].y > canvas.height) {
        walls.current.shift();
    }

    // Add new walls
    const lastWallY = walls.current.length > 0 ? walls.current[walls.current.length - 1].y : canvas.height;
    if (lastWallY > -50) { // Keep buffer above
       // Add slices upwards
       let nextY = lastWallY - 20; // slice height
       while (nextY > -50) {
           spawnWall(nextY, targetGap, canvas.width);
           nextY -= 20;
       }
    }
    
    // Move existing walls down
    walls.current.forEach(w => {
        w.y += currentSpeed;
    });

    // 3. Check Collision
    // Find the wall slice at player Y
    // Player is roughly at canvas.height - 100 usually? 
    // Wait, let's let player move freely in X and Y? 
    // Or just X? Let's do X and Y for maximum "tremor" expression.
    
    const playerRadius = 8;
    let hit = false;
    
    walls.current.forEach(w => {
       // Check vertical overlap
       if (playerPos.current.y + playerRadius > w.y && playerPos.current.y - playerRadius < w.y + w.height) {
           // Check horizontal collision (not in gap)
           const gapLeft = w.gapX - w.gapWidth / 2;
           const gapRight = w.gapX + w.gapWidth / 2;
           
           if (playerPos.current.x - playerRadius < gapLeft || playerPos.current.x + playerRadius > gapRight) {
               hit = true;
           }
       }
    });

    if (hit) {
        setGameState("gameover");
        if (score > highScore) setHighScore(score);
        return;
    }

    // 4. Update Flavor Text & Visual State
    if (metrics.machineScore > 80) {
        setMachineState("machine");
        setFlavorText("CRITICAL: BOT BEHAVIOR DETECTED. PURGING.");
    } else if (metrics.machineScore > 50) {
        setMachineState("machine");
        setFlavorText("WARNING: MOVEMENT TOO CLEAN.");
    } else {
        setMachineState("human");
        setFlavorText("Status: Human. Imperfection acceptable.");
    }

    // 5. Draw
    // Clear
    ctx.fillStyle = machineState === "machine" ? "#ffffff" : "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Walls
    ctx.fillStyle = machineState === "machine" ? "#000000" : "#1e293b";
    
    walls.current.forEach(w => {
        // Left Wall
        ctx.fillRect(0, w.y, w.gapX - w.gapWidth/2, w.height + 1); // +1 to seal gaps
        // Right Wall
        ctx.fillRect(w.gapX + w.gapWidth/2, w.y, canvas.width - (w.gapX + w.gapWidth/2), w.height + 1);
    });

    // Draw Player
    ctx.beginPath();
    ctx.arc(playerPos.current.x, playerPos.current.y, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = machineState === "machine" ? "#ff0000" : "#10b981";
    
    // Add "glitch" effect to player if human
    if (machineState === "human") {
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = 10;
    } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
    }
    
    ctx.fill();

    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameState, metrics.machineScore, spawnWall, score, highScore, machineState]);


  // --- Event Handlers ---
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      const point = getCanvasPoint(e);
      if (!point) return;
      
      playerPos.current = point;
      
      if (gameState === "playing") {
          addPoint(point.x, point.y);
      } else if (gameState === "turing_test") {
          // Drawing logic
          // Only add point if mouse is down? Or just trailing?
          // Let's say trailing for now to simplify, or check buttons.
          // Better: Always draw in turing test mode
          setTuringTest(prev => ({
              ...prev,
              points: [...prev.points, point]
          }));
      }
  };
  
  const startGame = () => {
      resetTracker();
      setScore(0);
      distanceTraveled.current = 0;
      walls.current = [];
      
      // Init walls
      if (canvasRef.current) {
         let y = canvasRef.current.height;
         while (y > -100) {
             spawnWall(y, INITIAL_GAP, canvasRef.current.width);
             y -= 20;
         }
         // Set player start pos
         playerPos.current = {
             x: canvasRef.current.width / 2,
             y: canvasRef.current.height - 100
         };
      }
      
      setGameState("playing");
  };

  // --- Effects ---
  useEffect(() => {
    // Canvas Resize
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
        }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
      if (gameState === "playing") {
          requestRef.current = requestAnimationFrame(updateGame);
      }
      return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, updateGame]);

  // --- Render ---
  return (
    <div 
        className="human-game-theme min-h-screen relative overflow-hidden select-none"
        data-state={machineState}
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
    >
        {/* CRT Scanline Overlay */}
        <div className="absolute inset-0 scanlines z-20 pointer-events-none" />
        
        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
            <Link href="/" className="pointer-events-auto flex items-center gap-2 text-sm font-medium opacity-50 hover:opacity-100 transition-opacity px-4 py-2 rounded-full border border-current bg-black/10 backdrop-blur-md">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
            </Link>
            
            <div className="flex flex-col items-end gap-2">
                 <div className="text-xs uppercase tracking-widest opacity-60 font-bold">
                     Sterility Level
                 </div>
                 <div className="flex items-center gap-2">
                     <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                         <div 
                            className={`h-full transition-all duration-300 ${machineState === 'machine' ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${metrics.machineScore}%` }}
                         />
                     </div>
                     <span className="font-ibm-plex font-bold w-8 text-right">{metrics.machineScore}%</span>
                 </div>
                 <div className="text-[10px] uppercase tracking-wider opacity-40">
                     {metrics.velocityStability > 0.8 ? "VELOCITY: SUSPICIOUS" : "VELOCITY: OK"} | 
                     {metrics.linearity > 0.8 ? " PATH: ROBOTIC" : " PATH: ORGANIC"}
                 </div>
            </div>
        </div>

        {/* Main Game Area */}
        <main className="w-full h-screen relative overflow-hidden" ref={containerRef}>
            <canvas
                ref={canvasRef}
                className={`block w-full h-full cursor-none touch-none bg-grid-pattern transition-colors duration-1000 ${machineState === 'machine' ? 'animate-shake' : ''}`}
            />
            
            {/* Status Text Overlay (In-world) */}
            <div className="absolute top-24 left-0 w-full text-center pointer-events-none z-10 px-4">
                 <h2 className={`text-sm md:text-xl font-bold uppercase tracking-[0.2em] ${machineState === 'machine' ? 'text-red-500 animate-pulse' : 'text-green-500/50'}`}>
                     {flavorText}
                 </h2>
                 {gameState === "playing" && (
                     <p className="mt-2 font-ibm-plex text-4xl opacity-20">{score}</p>
                 )}
            </div>

            {/* Start / Game Over Screens */}
            <AnimatePresence>
                {gameState !== "playing" && gameState !== "turing_test" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <div className="max-w-md w-full border border-white/20 bg-black/90 p-8 rounded-lg text-center relative overflow-hidden">
                            {/* Decorative elements */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />
                            
                            {gameState === "gameover" ? (
                                <>
                                    <Skull className="w-16 h-16 mx-auto text-red-500 mb-4" />
                                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tighter">TERMINATED</h1>
                                    <p className="text-red-400 font-ibm-plex text-sm mb-6">
                                        SYSTEM DETECTED IMPERFECTION.
                                        <br/>
                                        OR WAS IT TOO MUCH PERFECTION?
                                    </p>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-white/5 p-4 rounded border border-white/10">
                                            <div className="text-xs uppercase text-gray-500">Distance</div>
                                            <div className="text-2xl font-ibm-plex text-white">{score}m</div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded border border-white/10">
                                            <div className="text-xs uppercase text-gray-500">Peak Sterility</div>
                                            <div className="text-2xl font-ibm-plex text-red-400">{metrics.machineScore}%</div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Fingerprint className="w-16 h-16 mx-auto text-green-500 mb-4" />
                                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tighter">HUMAN ERROR</h1>
                                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                        The System purges efficiency.<br/>
                                        Move like a machine, and the walls close in.<br/>
                                        <span className="text-green-400">Shake. Wiggle. Err. Survive.</span>
                                    </p>
                                </>
                            )}

                            <button
                                onClick={startGame}
                                className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-green-400 transition-colors flex items-center justify-center gap-2 group"
                            >
                                <RefreshCw className={`w-4 h-4 ${gameState === "gameover" ? "" : "group-hover:rotate-180 transition-transform"}`} />
                                {gameState === "start" ? "Initialize Run" : "Re-Attempt"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    </div>
  );
}