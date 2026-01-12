'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './game-theme.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RotateCcw, Skull } from 'lucide-react';

// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 20;
const PLAYER_SPEED = 4;
const CHECKPOINT_INTERVAL = 3000; // Save state every 3 seconds

interface GameState {
  player: { x: number; y: number; vx: number; vy: number };
  obstacles: Array<{ x: number; y: number; w: number; h: number; type: 'static' | 'moving'; speedX: number; speedY: number }>;
  boss: { x: number; y: number; active: boolean };
  level: number;
  time: number;
}

export default function TemporalCorruption() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [corruption, setCorruption] = useState(0);
  const [message, setMessage] = useState("Press Start to Begin");
  const [rewindCount, setRewindCount] = useState(0);

  // Game Logic Refs (to avoid closure staleness in loop)
  const gameStateRef = useRef<GameState>({
    player: { x: 50, y: 300, vx: 0, vy: 0 },
    obstacles: [],
    boss: { x: -100, y: 300, active: false },
    level: 1,
    time: 0,
  });
  
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastCheckpointTime = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const historyStackRef = useRef<GameState[]>([]); // Keep local history to verify restoration

  // --- Initialization ---
  const initLevel = (level: number) => {
    const obstacles = [];
    // Generate obstacles based on level
    for (let i = 0; i < 5 + level * 2; i++) {
      obstacles.push({
        x: 200 + Math.random() * (CANVAS_WIDTH - 300),
        y: Math.random() * (CANVAS_HEIGHT - 50),
        w: 30 + Math.random() * 50,
        h: 30 + Math.random() * 50,
        type: (Math.random() > 0.7 ? 'moving' : 'static') as 'moving' | 'static',
        speedX: (Math.random() - 0.5) * (2 + level),
        speedY: (Math.random() - 0.5) * (2 + level),
      });
    }

    gameStateRef.current = {
      player: { x: 50, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0 },
      obstacles,
      boss: { x: -150, y: CANVAS_HEIGHT / 2, active: level >= 3 },
      level,
      time: 0,
    };
    
    lastCheckpointTime.current = performance.now();
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setGameWon(false);
    setCorruption(0);
    setRewindCount(0);
    historyStackRef.current = [];
    initLevel(1);
    
    // Initial State Push
    if (typeof window !== 'undefined') {
      // Clear forward history if possible by pushing new state
      window.history.pushState({ tick: 0, level: 1 }, '', window.location.pathname + '#start');
    }
    
    cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // --- Core Game Loop ---
  const gameLoop = (timestamp: number) => {
    if (!isPlaying || gameOver || gameWon) return;

    update(timestamp);
    draw();
    
    // Checkpoint Logic
    if (timestamp - lastCheckpointTime.current > CHECKPOINT_INTERVAL) {
      saveCheckpoint(timestamp);
      lastCheckpointTime.current = timestamp;
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const update = (timestamp: number) => {
    const state = gameStateRef.current;
    
    // 1. Player Movement
    let speed = PLAYER_SPEED;
    
    // Corruption Effect: Controls Flip at high corruption
    const controlsFlipped = corruption > 60 && Math.random() > 0.8;
    
    const dx = (keysPressed.current['ArrowRight'] ? 1 : 0) - (keysPressed.current['ArrowLeft'] ? 1 : 0);
    const dy = (keysPressed.current['ArrowDown'] ? 1 : 0) - (keysPressed.current['ArrowUp'] ? 1 : 0);
    
    state.player.vx = (controlsFlipped ? -dx : dx) * speed;
    state.player.vy = (controlsFlipped ? -dy : dy) * speed;

    state.player.x += state.player.vx;
    state.player.y += state.player.vy;

    // Boundaries
    if (state.player.x < 0) state.player.x = 0;
    if (state.player.x > CANVAS_WIDTH - PLAYER_SIZE) state.player.x = CANVAS_WIDTH - PLAYER_SIZE;
    if (state.player.y < 0) state.player.y = 0;
    if (state.player.y > CANVAS_HEIGHT - PLAYER_SIZE) state.player.y = CANVAS_HEIGHT - PLAYER_SIZE;

    // 2. Obstacles
    state.obstacles.forEach(obs => {
      if (obs.type === 'moving') {
        obs.x += obs.speedX;
        obs.y += obs.speedY;
        // Bounce
        if (obs.x <= 0 || obs.x + obs.w >= CANVAS_WIDTH) obs.speedX *= -1;
        if (obs.y <= 0 || obs.y + obs.h >= CANVAS_HEIGHT) obs.speedY *= -1;
      }
      
      // Collision Detection
      if (
        state.player.x < obs.x + obs.w &&
        state.player.x + PLAYER_SIZE > obs.x &&
        state.player.y < obs.y + obs.h &&
        state.player.y + PLAYER_SIZE > obs.y
      ) {
        handleCollision();
      }
    });

    // 3. Level Completion
    if (state.player.x > CANVAS_WIDTH - 50) {
      if (state.level < 3) {
        initLevel(state.level + 1);
        saveCheckpoint(timestamp, true); // Force save on level transition
        setMessage(`Level ${state.level}`);
        setTimeout(() => setMessage(""), 2000);
      } else {
        setGameWon(true);
        setMessage("You Escaped Time!");
      }
    }

    // 4. Boss Logic (The Time Eater)
    if (state.boss.active) {
      // Boss moves towards player slowly but constantly
      const angle = Math.atan2(state.player.y - state.boss.y, state.player.x - state.boss.x);
      const bossSpeed = 1.5 + (corruption / 50); // Gets faster with corruption
      
      state.boss.x += Math.cos(angle) * bossSpeed;
      state.boss.y += Math.sin(angle) * bossSpeed;

      // Boss Collision
      const dist = Math.hypot(state.player.x - state.boss.x, state.player.y - state.boss.y);
      if (dist < 40) { // Boss radius approx
         handleCollision();
      }
    }

    state.time += 1;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Visual Corruption
    if (corruption > 20) {
        ctx.save();
        if (Math.random() < corruption * 0.001) {
            ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
        }
    }

    const state = gameStateRef.current;

    // Draw Player
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.arc(state.player.x + PLAYER_SIZE/2, state.player.y + PLAYER_SIZE/2, PLAYER_SIZE/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Obstacles
    ctx.fillStyle = '#ff0000';
    state.obstacles.forEach(obs => {
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    });

    // Draw Goal
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH - 30, CANVAS_HEIGHT / 2, 20, 0, Math.PI * 2);
    ctx.fill();

    // Draw Boss
    if (state.boss.active) {
       ctx.fillStyle = '#800080';
       ctx.shadowBlur = 20;
       ctx.shadowColor = '#800080';
       ctx.beginPath();
       ctx.arc(state.boss.x, state.boss.y, 40, 0, Math.PI * 2);
       ctx.fill();
       
       // Boss Eyes
       ctx.fillStyle = '#fff';
       ctx.beginPath();
       ctx.arc(state.boss.x - 15, state.boss.y - 10, 5, 0, Math.PI * 2);
       ctx.arc(state.boss.x + 15, state.boss.y - 10, 5, 0, Math.PI * 2);
       ctx.fill();
       ctx.shadowBlur = 0;
    }
    
    if (corruption > 20) ctx.restore();
    
    // Corruption Overlay Drawing
    if (corruption > 0) {
        ctx.fillStyle = `rgba(0, 255, 0, ${corruption * 0.002})`;
        ctx.font = '20px Courier New';
        // Random Hex Strings
        if (Math.random() < 0.1) {
             ctx.fillText(Math.random().toString(16).substring(2, 8), Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT);
        }
    }
  };

  // --- History / Checkpoint System ---
  const saveCheckpoint = (timestamp: number, force = false) => {
    const currentState = JSON.parse(JSON.stringify(gameStateRef.current));
    
    const historyId = Date.now();
    historyStackRef.current.push(currentState);
    
    // Limit stack size
    if (historyStackRef.current.length > 50) historyStackRef.current.shift();

    window.history.pushState(
        { id: historyId, tick: gameStateRef.current.time }, 
        '', 
        `#t=${gameStateRef.current.time}`
    );
    
    setMessage("Checkpoint Saved");
    setTimeout(() => setMessage(""), 1000);
  };

  const handlePopState = (event: PopStateEvent) => {
    // This function is triggered when user presses Back
    console.log("Popstate event:", event.state);

    if (!isPlaying) return;

    // Logic: browser back has happened, so we are now at a "previous" URL/state conceptually.
    // We treat this as the rewind trigger.
    rewindTime();
  };

  const rewindTime = () => {
    if (historyStackRef.current.length < 2) {
        setMessage("No history to rewind to!");
        // If we can't rewind, maybe we shouldn't have allowed the popstate to leave us stranded?
        // But the browser already changed the URL. We might need to pushState back to where we were?
        // For gameplay flow, let's just penalty and maybe reset slightly.
        return;
    }

    // historyStackRef.current has [..., State A, State B, State C]
    // We were at State C. User hit back.
    // We want to go to State B (or A).
    // The browser URL is now at State B's timestamp (theoretically).
    
    // Remove the latest state (where we died/failed)
    historyStackRef.current.pop();
    
    // Get the state before that
    const previousState = historyStackRef.current[historyStackRef.current.length - 1]; 
    
    if (previousState) {
        // Restore State
        gameStateRef.current = JSON.parse(JSON.stringify(previousState));
        
        // APPLY PENALTY
        setCorruption(c => Math.min(c + 10, 100));
        setRewindCount(c => c + 1);
        setMessage("REWINDING... CORRUPTION INCREASING");
        
        // Modify Boss Position - Boss resists time travel
        if (gameStateRef.current.boss.active) {
            gameStateRef.current.boss.x += 50; // Boss pushes forward against the rewind
        }

        // Resume
        setGameOver(false);
        lastCheckpointTime.current = performance.now();
        
        // Restart loop if it stopped
        if (!requestRef.current) {
            requestRef.current = requestAnimationFrame(gameLoop);
        }
    }
  };
  
  const handleCollision = () => {
    setGameOver(true);
    setMessage("TIMELINE FRACTURED. PRESS BROWSER BACK BUTTON TO REWIND.");
  };

  // --- Event Listeners ---
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => keysPressed.current[e.code] = true;
    const handleUp = (e: KeyboardEvent) => keysPressed.current[e.code] = false;

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('popstate', handlePopState);
      cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  // --- Render Helpers ---
  const getCorruptionClass = () => {
      if (corruption > 75) return 'corrupted-3';
      if (corruption > 50) return 'corrupted-2';
      if (corruption > 25) return 'corrupted-1';
      return '';
  };

  return (
    <div className={`temporal-game-container ${getCorruptionClass()}`}>
      <div className="glitch-overlay"></div>
      
      <div className="absolute top-4 left-4 z-50 flex gap-4">
        <Button onClick={() => window.location.href = '/'} variant="outline">
            Exit
        </Button>
        <div className="flex flex-col gap-2 bg-black/80 p-4 border border-green-500 rounded">
            <div className="text-green-500 font-jetbrains font-bold">TEMPORAL CORRUPTION</div>
            <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${corruption > 50 ? 'text-red-500' : 'text-yellow-500'}`} />
                <span className="text-white text-sm">Integrity: {100 - corruption}%</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded overflow-hidden">
                <div 
                    className={`h-full ${corruption > 50 ? 'bg-red-600' : 'bg-green-500'}`} 
                    style={{ width: `${Math.min(corruption, 100)}%` }}
                />
            </div>
            <div className="text-xs text-gray-400">Rewinds: {rewindCount}</div>
        </div>
      </div>

      <div className="relative">
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={`game-canvas ${corruption > 80 ? 'glitching' : ''}`}
        />
        
        {!isPlaying && !gameWon && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-50">
                <h1 className="text-4xl font-bold mb-4 text-green-500 glitch-text">TEMPORAL CORRUPTION</h1>
                <p className="max-w-md text-center mb-8 font-jetbrains text-sm text-gray-300">
                    Navigate the timeline. Reach the goal.<br/><br/>
                    If you fail, use your <strong className="text-white border px-1">BROWSER BACK BUTTON</strong> to rewind time.<br/><br/>
                    WARNING: Excessive time travel corrupts reality.
                </p>
                <Button onClick={startGame} className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-xl">
                    INITIATE SEQUENCE
                </Button>
            </div>
        )}

        {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/40 text-white animate-pulse pointer-events-none z-50">
                <Skull className="w-16 h-16 mb-4 text-red-500" />
                <h2 className="text-3xl font-bold text-red-500 bg-black px-4 py-2">TIMELINE FRACTURED</h2>
                <p className="mt-4 text-xl bg-black px-4 py-1">PRESS BACK TO REWIND</p>
            </div>
        )}
        
        {gameWon && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-900/80 text-white z-50">
                <h2 className="text-3xl font-bold text-yellow-400">TIMELINE STABILIZED</h2>
                <p className="mt-4">You escaped with {corruption}% corruption.</p>
                <Button onClick={startGame} className="mt-8 bg-yellow-600 hover:bg-yellow-700">
                    Re-enter Timeline
                </Button>
            </div>
        )}

        {message && !gameOver && !gameWon && (
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <span className="bg-black/70 text-green-400 px-4 py-2 text-xl font-jetbrains border border-green-500">
                    {message}
                </span>
             </div>
        )}
      </div>
    </div>
  );
}