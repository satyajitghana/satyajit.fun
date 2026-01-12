"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Play, RotateCcw, Activity, Zap, Timer } from "lucide-react";
import "./lag-theme.css";

// --- Constants & Types ---
const FPS = 60;
const TICK = 1000 / FPS;
const PLAYER_SIZE = 20;
const BASE_SPEED = 5;

type Vector = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

type InputType = "UP" | "DOWN" | "LEFT" | "RIGHT" | "NONE";

interface QueuedInput {
  id: number;
  type: InputType;
  timestamp: number; // When it was pressed
  executeAt: number; // When it should happen
}

interface LevelConfig {
  id: number;
  name: string;
  description: string;
  lag: (time: number) => number; // Dynamic lag function
  walls: Rect[];
  start: Vector;
  goal: Rect;
}

// --- Levels ---
const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "Latency 101",
    description: "500ms Delay. Predict your movement.",
    lag: () => 500,
    start: { x: 50, y: 300 },
    goal: { x: 700, y: 250, w: 50, h: 100 },
    walls: [
      { x: 200, y: 0, w: 50, h: 400 },
      { x: 400, y: 200, w: 50, h: 400 },
    ],
  },
  {
    id: 2,
    name: "The Pulse",
    description: "Lag fluctuates between 200ms and 1000ms.",
    lag: (t) => 600 + 400 * Math.sin(t / 2000),
    start: { x: 50, y: 50 },
    goal: { x: 700, y: 500, w: 60, h: 60 },
    walls: [
        { x: 150, y: 100, w: 500, h: 40 },
        { x: 150, y: 250, w: 40, h: 250 },
        { x: 150, y: 460, w: 400, h: 40 },
        { x: 550, y: 250, w: 40, h: 250 },
    ],
  },
  {
    id: 3,
    name: "Zero Point",
    description: "Watch out for the drop.",
    // Lag drops to 0 periodically
    lag: (t) => (Math.floor(t / 3000) % 2 === 0 ? 800 : 0),
    start: { x: 50, y: 50 },
    goal: { x: 720, y: 520, w: 40, h: 40 },
    walls: [
        { x: 100, y: 100, w: 600, h: 20 },
        { x: 100, y: 200, w: 20, h: 300 },
        { x: 200, y: 200, w: 20, h: 300 },
        { x: 300, y: 200, w: 20, h: 300 },
        { x: 400, y: 200, w: 20, h: 300 },
        { x: 500, y: 200, w: 20, h: 300 },
        { x: 600, y: 200, w: 20, h: 300 },
    ],
  },
];

export default function LagLabyrinth() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs
  const playerRef = useRef<Vector>({ x: 50, y: 300 });
  const inputQueueRef = useRef<QueuedInput[]>([]);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const levelRef = useRef<number>(0);
  const gameStateRef = useRef<"MENU" | "PLAYING" | "VICTORY" | "CRASH">("MENU");

  // React State for UI
  const [uiState, setUiState] = useRefState({
    lag: 0,
    levelIndex: 0,
    status: "MENU" as "MENU" | "PLAYING" | "VICTORY" | "CRASH",
  });

  // Helper for safe state updates
  function useRefState<T>(initial: T): [T, (v: T | ((prev: T) => T)) => void] {
    const [state, setState] = useState<T>(initial);
    const cbRef = useRef(state);
    useEffect(() => { cbRef.current = state; }, [state]);
    return [state, setState];
  }

  const startGame = (levelIndex: number) => {
    levelRef.current = levelIndex;
    const level = LEVELS[levelIndex];
    playerRef.current = { ...level.start };
    inputQueueRef.current = [];
    activeKeysRef.current.clear();
    startTimeRef.current = performance.now();
    gameStateRef.current = "PLAYING";
    setUiState(prev => ({ ...prev, levelIndex, status: "PLAYING" }));
  };

  const nextLevel = () => {
    if (uiState.levelIndex + 1 < LEVELS.length) {
      startGame(uiState.levelIndex + 1);
    } else {
        // Loop or end? Just restart last for now
        startGame(0);
    }
  };

  // --- Input Handling ---
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
        activeKeysRef.current.add(e.key);
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      activeKeysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, []);

  // --- Physics & Collision ---
  const checkCollision = (pos: Vector, walls: Rect[]): boolean => {
    // Wall Collision
    for (const w of walls) {
      if (
        pos.x < w.x + w.w &&
        pos.x + PLAYER_SIZE > w.x &&
        pos.y < w.y + w.h &&
        pos.y + PLAYER_SIZE > w.y
      ) {
        return true;
      }
    }
    // World Bounds
    if (pos.x < 0 || pos.y < 0 || pos.x > 800 - PLAYER_SIZE || pos.y > 600 - PLAYER_SIZE) {
        return true;
    }
    return false;
  };

  const checkGoal = (pos: Vector, goal: Rect): boolean => {
    return (
        pos.x < goal.x + goal.w &&
        pos.x + PLAYER_SIZE > goal.x &&
        pos.y < goal.y + goal.h &&
        pos.y + PLAYER_SIZE > goal.y
    );
  };

  const applyInput = (pos: Vector, keys: Set<string>): Vector => {
    let dx = 0;
    let dy = 0;
    if (keys.has("ArrowUp") || keys.has("w")) dy -= BASE_SPEED;
    if (keys.has("ArrowDown") || keys.has("s")) dy += BASE_SPEED;
    if (keys.has("ArrowLeft") || keys.has("a")) dx -= BASE_SPEED;
    if (keys.has("ArrowRight") || keys.has("d")) dx += BASE_SPEED;
    return { x: pos.x + dx, y: pos.y + dy };
  };

  // --- Game Loop ---
  const update = useCallback((time: number) => {
    if (gameStateRef.current !== "PLAYING") {
        requestAnimationFrame(update);
        return;
    }

    const dt = time - lastTimeRef.current;
    const gameTime = time - startTimeRef.current;
    
    // 1. Determine Current Lag
    const level = LEVELS[levelRef.current];
    const currentLag = level.lag(gameTime);
    setUiState(prev => prev.lag !== Math.round(currentLag) ? { ...prev, lag: Math.round(currentLag) } : prev);

    // 2. Queue Inputs
    // We sample inputs every frame. If keys are pressed, we queue a "movement command"
    // to be executed at (now + currentLag).
    if (activeKeysRef.current.size > 0) {
        // We store the set of keys active at this moment
        // For simplicity, let's just store the resultant vector or the keys themselves
        // Storing keys allows for precise replay
        inputQueueRef.current.push({
            id: Math.random(),
            type: "NONE", // Not used in this simplified logic, we store raw keys in a closure or object if needed?
            // Actually, let's queue the *position delta* or the specific keys active.
            // Better: Queue a "Tick State" which contains the active keys.
            // Refactoring Queue:
            // The queue needs to store "At Time X, Input Was Y".
            timestamp: time,
            executeAt: time + currentLag,
            // Custom field for this tick's input
            keys: new Set(activeKeysRef.current) 
        } as any);
    }

    // 3. Process Ready Inputs
    // We need to find the input that corresponds to "Now" in the timeline.
    // However, since we sample every frame, we might have multiple or gaps.
    // The robust way: We are at time T. We process all inputs where executeAt <= T.
    // BUT, we must be careful not to process them twice.
    // AND, if we process multiple, we move multiple times (speedup).
    
    // Better approach for continuous movement:
    // The queue contains "Input Snapshots".
    // We iterate through the queue. 
    // If an item's `executeAt` has passed, we apply it and remove it?
    // This works if we assume one snapshot per frame.
    // If FPS fluctuates, this might be jittery.
    
    // Let's stick to: "Process all events that are due"
    const now = time;
    const readyInputs = inputQueueRef.current.filter(i => i.executeAt <= now);
    
    // Remove processed
    inputQueueRef.current = inputQueueRef.current.filter(i => i.executeAt > now);

    // Apply movement for each ready input
    // NOTE: This assumes 1 input per frame tick. If lag causes a "bunch up" (lag decreases), we might get a speed burst.
    // That's actually a cool mechanic! (The Doppler Effect of Lag).
    // If lag increases, inputs stretch out (slowdown).
    let newPos = { ...playerRef.current };
    
    readyInputs.forEach((input: any) => {
       newPos = applyInput(newPos, input.keys);
    });

    // Collision Check (Real)
    if (checkCollision(newPos, level.walls)) {
        // Bounce or Slide? Or Stop?
        // Let's try Stop first, but slide is better for game feel.
        // Simple X/Y separation
        const tryX = { x: newPos.x, y: playerRef.current.y };
        if (!checkCollision(tryX, level.walls)) {
            newPos = tryX;
        } else {
            const tryY = { x: playerRef.current.x, y: newPos.y };
            if (!checkCollision(tryY, level.walls)) {
                newPos = tryY;
            } else {
                newPos = playerRef.current; // Blocked
            }
        }
    }

    // Victory Check
    if (checkGoal(newPos, level.goal)) {
        gameStateRef.current = "VICTORY";
        setUiState(prev => ({ ...prev, status: "VICTORY" }));
    }

    playerRef.current = newPos;

    // 4. Ghost Simulation (The "True" Position)
    // Predict where the player *will* be if they stop inputting right now,
    // considering all currently queued inputs.
    let ghostPos = { ...playerRef.current };
    inputQueueRef.current.forEach((input: any) => {
        ghostPos = applyInput(ghostPos, input.keys);
        // Simple collision for ghost (so it doesn't go through walls)
        if (checkCollision(ghostPos, level.walls)) {
             // Basic slide logic for ghost too
             const gx = { x: ghostPos.x, y: playerRef.current.y }; // approximation, ideally track ghost prev pos
             if(checkCollision(gx, level.walls)) ghostPos = { ...playerRef.current }; // simplistic fallback
             // Improving ghost collision is hard without history. 
             // Let's just clamp it or let it clip to show "invalid future"?
             // No, players need to know if they will hit a wall.
             // Let's do a quick naive slide check using the *previous iteration's* ghostPos? 
             // Actually, `ghostPos` accumulates.
             // We need `prevGhostPos`.
        }
        // Ideally we need full collision logic for the ghost to be accurate.
        // Let's assume the ghost logic matches the player logic exactly.
        // Re-running the exact same collision check:
        // (We can't easily do "slide" correctly without incremental steps, but `ghostPos` is incremental here)
        // So yes, we can check collision on the `ghostPos` as we update it.
    });


    // --- Render ---
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        // Clear
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = "rgba(0, 255, 65, 0.05)";
        ctx.beginPath();
        for(let x=0; x<width; x+=40) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
        for(let y=0; y<height; y+=40) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
        ctx.stroke();

        // Goal
        ctx.fillStyle = "rgba(0, 204, 255, 0.2)";
        ctx.strokeStyle = "#00ccff";
        ctx.lineWidth = 2;
        ctx.fillRect(level.goal.x, level.goal.y, level.goal.w, level.goal.h);
        ctx.strokeRect(level.goal.x, level.goal.y, level.goal.w, level.goal.h);
        // Goal Pulse
        ctx.fillStyle = `rgba(0, 204, 255, ${0.1 + Math.sin(time/200)*0.1})`;
        ctx.fillRect(level.goal.x, level.goal.y, level.goal.w, level.goal.h);


        // Walls
        ctx.fillStyle = "#1a1a1a";
        ctx.strokeStyle = "#333";
        level.walls.forEach(w => {
            ctx.fillRect(w.x, w.y, w.w, w.h);
            ctx.strokeRect(w.x, w.y, w.w, w.h);
        });

        // Ghost (Future)
        ctx.fillStyle = "rgba(0, 255, 65, 0.1)";
        ctx.strokeStyle = "rgba(0, 255, 65, 0.3)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(ghostPos.x + PLAYER_SIZE/2, ghostPos.y + PLAYER_SIZE/2, PLAYER_SIZE/2, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Ghost Trail (Optional, connect Player to Ghost)
        ctx.beginPath();
        ctx.moveTo(playerRef.current.x + PLAYER_SIZE/2, playerRef.current.y + PLAYER_SIZE/2);
        ctx.lineTo(ghostPos.x + PLAYER_SIZE/2, ghostPos.y + PLAYER_SIZE/2);
        ctx.strokeStyle = "rgba(0, 255, 65, 0.1)";
        ctx.stroke();

        // Player (Real)
        ctx.fillStyle = "#00ff41";
        // Glitch effect on player if lag is high
        if (currentLag > 600 && Math.random() > 0.9) {
             ctx.fillStyle = "#ccffcc";
        }
        ctx.shadowColor = "#00ff41";
        ctx.shadowBlur = 15;
        ctx.fillRect(playerRef.current.x, playerRef.current.y, PLAYER_SIZE, PLAYER_SIZE);
        ctx.shadowBlur = 0;

        // Render Input Timeline (Bottom Bar)
        const barHeight = 60;
        const barY = height - barHeight;
        
        // Background
        ctx.fillStyle = "#111";
        ctx.fillRect(0, barY, width, barHeight);
        ctx.strokeStyle = "#333";
        ctx.beginPath(); ctx.moveTo(0, barY); ctx.lineTo(width, barY); ctx.stroke();

        // "Now" Line (The execution point)
        const nowX = 100;
        ctx.strokeStyle = "#fff";
        ctx.beginPath(); ctx.moveTo(nowX, barY); ctx.lineTo(nowX, height); ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillText("EXECUTE", nowX - 20, barY + 10);

        // Inputs moving towards execution
        // Time Window: 2000ms
        const timeWindow = 2000;
        
        inputQueueRef.current.forEach((q: any) => {
            const timeUntil = q.executeAt - now;
            if (timeUntil < timeWindow && timeUntil > -100) {
                const x = nowX + (timeUntil / timeWindow) * (width - nowX);
                
                // Draw Input Indicator
                ctx.fillStyle = q.keys.size > 0 ? "#00ff41" : "#333";
                // Only draw significant inputs
                if (q.keys.size > 0) {
                     ctx.fillRect(x, barY + 20, 4, 20);
                }
            }
        });

        // Current Lag Indicator Text
        ctx.fillStyle = currentLag > 800 ? "#ff3333" : "#00ff41";
        ctx.font = "20px 'VT323', monospace"; // Keeping VT323 as it seems intentional, but fallback to IBM Plex Mono if needed
        ctx.font = "20px 'IBM Plex Mono', monospace";
        ctx.fillText(`LAG: ${Math.round(currentLag)}ms`, 10, barY + 35);
        
    }

    lastTimeRef.current = time;
    requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    requestAnimationFrame(update);
  }, [update]);

  return (
    <div className="lag-game-theme min-h-screen bg-[#050505] text-[#00ff41] font-ibm-plex flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-4">
        <Link href="/" className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <ArrowLeft className="w-4 h-4" /> Exit
        </Link>
        <div className="text-xl font-bold tracking-widest uppercase">
          {uiState.status === "PLAYING" ? LEVELS[uiState.levelIndex].name : "LAG LABYRINTH"}
        </div>
        <div className="flex gap-4 text-sm opacity-60">
           <div className="flex items-center gap-1"><Timer className="w-3 h-3"/> {uiState.lag}ms</div>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="relative border-2 border-[#1a1a1a] rounded-sm overflow-hidden shadow-[0_0_20px_rgba(0,255,65,0.1)]">
        <canvas 
            ref={canvasRef} 
            width={800} 
            height={600} 
            className="block bg-[#0a0a0a]"
        />
        
        {/* CRT Overlay */}
        <div className="absolute inset-0 crt-overlay pointer-events-none" />

        {/* UI Overlays */}
        {uiState.status === "MENU" && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-6 backdrop-blur-sm z-10">
                <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#00ff41] to-[#008f11] drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">
                    LAG LABYRINTH
                </h1>
                <p className="max-w-md text-center text-gray-400">
                    Your actions are delayed. Your future is already written. <br/>
                    Plan ahead. Trust the ghost.
                </p>
                <button 
                    onClick={() => startGame(0)}
                    className="flex items-center gap-2 px-8 py-4 bg-[#00ff41] text-black font-bold text-lg hover:scale-105 transition-transform"
                >
                    <Play className="w-5 h-5" /> INITIALIZE
                </button>
            </div>
        )}

        {uiState.status === "VICTORY" && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-6 z-10">
                <h2 className="text-4xl font-bold text-[#00ccff] tracking-widest">SEQUENCE COMPLETE</h2>
                <div className="text-sm text-gray-400">Lag Stabilized. Data Uploaded.</div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => startGame(uiState.levelIndex)}
                        className="px-6 py-2 border border-[#333] hover:bg-[#111] transition-colors"
                    >
                        RETRY
                    </button>
                    <button 
                        onClick={nextLevel}
                        className="px-6 py-2 bg-[#00ccff] text-black font-bold hover:bg-[#33eeff] transition-colors"
                    >
                        NEXT SEQUENCE
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Instructions / Footer */}
      <div className="w-full max-w-[800px] mt-6 flex justify-between text-xs text-[#333]">
        <div>WASD / ARROW KEYS to Move</div>
        <div>
            {LEVELS[uiState.levelIndex]?.description}
        </div>
      </div>
    </div>
  );
}