"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Play, Volume2, VolumeX } from "lucide-react";
import "./pixel-theme.css";

// --- Types ---
interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  score: number;
  time: number;
  cameraZoom: number;
}

// --- Constants ---
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 2000;
const PLAYER_SIZE = 1; // logical size
const RENDER_SCALE = 3; // visual size multiplier
const FRICTION = 0.9;
const ACCELERATION = 0.5;
const MAX_SPEED = 4;
const DASH_SPEED = 12;
const DASH_COOLDOWN = 60; // frames
const WIND_FORCE = 0.05;

export default function OnePixelHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game State Refs (for performance loop)
  const playerRef = useRef({ x: 200, y: 1000, vx: 0, vy: 0, dead: false, dashTimer: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1, targetZoom: 1 });
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  
  // React State (for UI)
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isGameOver: false,
    isVictory: false,
    score: 0,
    time: 0,
    cameraZoom: 1,
  });

  // --- Level Design (The "ESC" Key Shape) ---
  const wallsRef = useRef<Rect[]>([
    // Outer Borders
    { x: 0, y: 0, w: WORLD_WIDTH, h: 50 }, // Top
    { x: 0, y: WORLD_HEIGHT - 50, w: WORLD_WIDTH, h: 50 }, // Bottom
    { x: 0, y: 0, w: 50, h: WORLD_HEIGHT }, // Left
    { x: WORLD_WIDTH - 50, y: 0, w: 50, h: WORLD_HEIGHT }, // Right
    
    // "E" Shape
    { x: 200, y: 200, w: 50, h: 800 }, // E Vertical
    { x: 200, y: 200, w: 400, h: 50 }, // E Top
    { x: 200, y: 575, w: 300, h: 50 }, // E Middle
    { x: 200, y: 950, w: 400, h: 50 }, // E Bottom

    // "S" Shape
    { x: 800, y: 200, w: 400, h: 50 }, // S Top
    { x: 800, y: 200, w: 50, h: 400 }, // S Top Vertical
    { x: 800, y: 575, w: 400, h: 50 }, // S Middle
    { x: 1150, y: 575, w: 50, h: 425 }, // S Bottom Vertical
    { x: 800, y: 950, w: 400, h: 50 }, // S Bottom

    // "C" Shape
    { x: 1400, y: 200, w: 50, h: 800 }, // C Vertical
    { x: 1400, y: 200, w: 400, h: 50 }, // C Top
    { x: 1400, y: 950, w: 400, h: 50 }, // C Bottom

    // Obstacles
    { x: 600, y: 400, w: 100, h: 100 },
    { x: 1000, y: 800, w: 150, h: 20 },
  ]);

  const enemiesRef = useRef([
    { x: 500, y: 300, r: 40, vx: 2, vy: 1, type: 'patrol' },
    { x: 900, y: 700, r: 60, vx: -1.5, vy: 0.5, type: 'bouncer' },
    { x: 1600, y: 500, r: 120, vx: 0.5, vy: 0.5, type: 'giant' },
    // More enemies for difficulty
    { x: 2200, y: 300, r: 30, vx: 3, vy: 2, type: 'fast' },
    { x: 2400, y: 800, r: 80, vx: -0.2, vy: 2, type: 'vertical' },
  ]);

  const goalRef = useRef({ x: 2800, y: 1000, r: 50 });

  const spawnParticles = (x: number, y: number, count: number, color: string, speed: number = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = Math.random() * speed;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 1.0,
        color
      });
    }
  };

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- Game Loop ---
  const update = useCallback(() => {
    if (!gameState.isPlaying || gameState.isGameOver || gameState.isVictory) return;

    const player = playerRef.current;
    
    // 1. Movement & Dash
    if (player.dashTimer > 0) player.dashTimer--;

    let ax = 0;
    let ay = 0;

    if (keysRef.current["ArrowUp"] || keysRef.current["w"]) ay -= ACCELERATION;
    if (keysRef.current["ArrowDown"] || keysRef.current["s"]) ay += ACCELERATION;
    if (keysRef.current["ArrowLeft"] || keysRef.current["a"]) ax -= ACCELERATION;
    if (keysRef.current["ArrowRight"] || keysRef.current["d"]) ax += ACCELERATION;

    // Dash Trigger
    if (keysRef.current[" "] && player.dashTimer === 0 && (ax !== 0 || ay !== 0)) {
      player.dashTimer = DASH_COOLDOWN;
      // Normalize direction for dash
      const len = Math.sqrt(ax*ax + ay*ay);
      player.vx = (ax/len) * DASH_SPEED;
      player.vy = (ay/len) * DASH_SPEED;
      spawnParticles(player.x, player.y, 10, "#ffffff", 2);
    } else {
      player.vx += ax;
      player.vy += ay;
    }

    // Wind Effect (Blows East occasionally)
    const time = Date.now() / 1000;
    if (Math.sin(time) > 0.5) {
       player.vx += WIND_FORCE;
       // Minimal particle indication of wind
       if (Math.random() < 0.1) {
           particlesRef.current.push({
               x: cameraRef.current.x - 100, // spawn off screen left
               y: cameraRef.current.y + Math.random() * 500 - 250,
               vx: 2 + Math.random(),
               vy: 0,
               life: 1.0,
               color: "rgba(255,255,255,0.1)"
           });
       }
    }

    // Friction
    player.vx *= FRICTION;
    player.vy *= FRICTION;
    
    // 2. Collision with Walls (Simple AABB)
    let nextX = player.x + player.vx;
    let nextY = player.y + player.vy;
    
    // Bounds check
    if (nextX < 0) nextX = 0;
    if (nextX > WORLD_WIDTH) nextX = WORLD_WIDTH;
    if (nextY < 0) nextY = 0;
    if (nextY > WORLD_HEIGHT) nextY = WORLD_HEIGHT;

    // Wall collision
    wallsRef.current.forEach(wall => {
      if (
        nextX < wall.x + wall.w &&
        nextX + PLAYER_SIZE > wall.x &&
        nextY < wall.y + wall.h &&
        nextY + PLAYER_SIZE > wall.y
      ) {
        // Simple bounce/slide (very naive)
        player.vx *= -0.5;
        player.vy *= -0.5;
        nextX = player.x;
        nextY = player.y;
      }
    });

    player.x = nextX;
    player.y = nextY;

    // 3. Enemy Movement & Collision
    enemiesRef.current.forEach(enemy => {
      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      // Bounce enemies off world bounds
      if (enemy.x - enemy.r < 0 || enemy.x + enemy.r > WORLD_WIDTH) enemy.vx *= -1;
      if (enemy.y - enemy.r < 0 || enemy.y + enemy.r > WORLD_HEIGHT) enemy.vy *= -1;

      // Player Collision
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < enemy.r + PLAYER_SIZE) {
        setGameState(prev => ({ ...prev, isGameOver: true }));
        player.dead = true;
        spawnParticles(player.x, player.y, 30, "#ff3333", 3);
      }
    });

    // 4. Particles Update
    particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // 5. Goal Check
    const distToGoal = Math.sqrt(Math.pow(player.x - goalRef.current.x, 2) + Math.pow(player.y - goalRef.current.y, 2));
    if (distToGoal < goalRef.current.r) {
       setGameState(prev => ({ ...prev, isVictory: true }));
    }

    // 6. Camera Follow
    // Target position is player position
    // Lerp for smoothness
    let targetZoom = 3;
    // Zoom out slightly when moving fast
    const speed = Math.sqrt(player.vx*player.vx + player.vy*player.vy);
    if (speed > 2) targetZoom = 2.5;
    
    cameraRef.current.x += (player.x - cameraRef.current.x) * 0.1;
    cameraRef.current.y += (player.y - cameraRef.current.y) * 0.1;
    cameraRef.current.targetZoom = targetZoom;

    // Zoom Logic
    // If moving fast, zoom out slightly? Or just steady zoom based on progress?
    // For now, static zoom or "Zoom Out" on victory
    
  }, [gameState.isPlaying, gameState.isGameOver, gameState.isVictory]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear Screen
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Camera Transform
    const cam = cameraRef.current;
    
    // If Victory, zoom WAY out to show the whole map
    if (gameState.isVictory) {
      cam.targetZoom = 0.15; // Zoom to see whole world
      cam.x += (WORLD_WIDTH/2 - cam.x) * 0.05; // Center camera
      cam.y += (WORLD_HEIGHT/2 - cam.y) * 0.05;
    }
    
    cam.zoom += (cam.targetZoom - cam.zoom) * 0.05;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    // --- Draw World ---
    
    // Grid (Subtle)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 2;
    const gridSize = 100;
    // Optimize grid drawing to only visible area if needed, but simple loop is fine for now
    for(let x = 0; x <= WORLD_WIDTH; x+=gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke();
    }
    for(let y = 0; y <= WORLD_HEIGHT; y+=gridSize) {
       ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke();
    }

    // Walls
    ctx.fillStyle = "#1a1a1a";
    wallsRef.current.forEach(w => {
      ctx.fillRect(w.x, w.y, w.w, w.h);
      // Highlight edge
      ctx.strokeStyle = "#333";
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    });

    // Goal
    ctx.beginPath();
    ctx.arc(goalRef.current.x, goalRef.current.y, goalRef.current.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 255, 170, 0.1)";
    ctx.fill();
    ctx.strokeStyle = "#00ffaa";
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Enemies
    enemiesRef.current.forEach(e => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ff3333";
      ctx.fill();
      
      // Enemy Glow
      ctx.shadowColor = "#ff3333";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Particles
    particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, 2, 2);
        ctx.globalAlpha = 1.0;
    });

    // Player
    if (!playerRef.current.dead) {
        ctx.fillStyle = playerRef.current.dashTimer > 0 ? "#888888" : "#ffffff";
        // Make player visible despite being 1px logic
        const visualSize = Math.max(1, PLAYER_SIZE * RENDER_SCALE / cam.zoom); 
        // Inverse scale visual size so it's always at least a visible dot even when zoomed out
        // Actually, "One Pixel Hero" implies it should stay 1 screen pixel? 
        // No, that's too hard to see. Let's make it a constant small screen size or world size.
        // Let's keep it world relative for now.
        ctx.fillRect(playerRef.current.x - 1, playerRef.current.y - 1, 2, 2); // 2x2 world units
        
        // Player Glow
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 10;
        ctx.fillRect(playerRef.current.x - 1, playerRef.current.y - 1, 2, 2);
        ctx.shadowBlur = 0;
    }

    // Victory Text on Map
    if (gameState.isVictory) {
       ctx.fillStyle = "white";
       ctx.font = "bold 200px Courier New";
       ctx.textAlign = "center";
       ctx.fillText("ONE PIXEL", WORLD_WIDTH/2, WORLD_HEIGHT/2 - 100);
       ctx.fillText("HERO", WORLD_WIDTH/2, WORLD_HEIGHT/2 + 100);
    }

    ctx.restore();
    
    // --- HUD ---
    if (gameState.isVictory) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [gameState.isVictory]);

  // Loop Driver
  useEffect(() => {
    let animationFrameId: number;

    const render = (time: number) => {
      frameRef.current = time;
      update();
      draw();
      animationFrameId = requestAnimationFrame(render);
    };
    
    render(0);
    return () => cancelAnimationFrame(animationFrameId);
  }, [update, draw]);

  // Resize Handler
  useEffect(() => {
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

  const startGame = () => {
    playerRef.current = { x: 200, y: 1000, vx: 0, vy: 0, dead: false, dashTimer: 0 };
    particlesRef.current = [];
    setGameState({
        isPlaying: true,
        isGameOver: false,
        isVictory: false,
        score: 0,
        time: 0,
        cameraZoom: 1
    });
    startTimeRef.current = Date.now();
  };

  return (
    <div className="pixel-game-theme min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans overflow-hidden select-none">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
        <Link href="/" className="pointer-events-auto flex items-center gap-2 text-sm font-medium text-[var(--foreground)] opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="text-xs font-mono opacity-50">
             POS: {Math.round(playerRef.current.x)}, {Math.round(playerRef.current.y)}
        </div>
      </div>

      <main className="h-screen w-full relative flex items-center justify-center">
        
        {/* Game Container */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full bg-[#050505]">
          <canvas ref={canvasRef} className="block w-full h-full" />
          
          {/* Scanline Effect */}
          <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
        </div>

        {/* Start Screen */}
        {!gameState.isPlaying && !gameState.isGameOver && !gameState.isVictory && (
            <div className="absolute z-10 flex flex-col items-center gap-6 p-12 bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl max-w-md text-center">
                <h1 className="text-4xl font-bold tracking-widest uppercase pixel-font">One Pixel Hero</h1>
                <p className="text-sm text-gray-400">
                    You are a single pixel. <br/>
                    The world is massive and dangerous. <br/>
                    Use <span className="text-white font-bold">Arrow Keys</span> to move.<br/>
                    Press <span className="text-white font-bold">Space</span> to Dash.
                </p>
                <button
                    onClick={startGame}
                    className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                >
                    <Play className="w-4 h-4" /> Initialize
                </button>
            </div>
        )}

        {/* Game Over Screen */}
        {gameState.isGameOver && (
             <div className="absolute z-10 flex flex-col items-center gap-6 p-12 bg-red-900/20 backdrop-blur-sm border border-red-500/30 rounded-2xl max-w-md text-center animate-in fade-in zoom-in duration-300">
             <h2 className="text-3xl font-bold tracking-widest uppercase text-red-500 pixel-font">Signal Lost</h2>
             <p className="text-sm text-gray-400">
                 The pixel has been extinguished.
             </p>
             <button 
                 onClick={startGame}
                 className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white font-bold uppercase tracking-widest hover:bg-red-500 transition-colors"
             >
                 <RefreshCw className="w-4 h-4" /> Reboot System
             </button>
         </div>
        )}

        {/* Victory Screen Overlay (Minimal, since we zoom out) */}
        {gameState.isVictory && (
             <div className="absolute bottom-10 z-10 flex flex-col items-center gap-4 animate-in slide-in-from-bottom duration-1000 delay-500">
                 <div className="px-6 py-2 bg-black/50 backdrop-blur text-white text-xs font-mono border border-white/20 rounded-full">
                     SECTOR CLEARED
                 </div>
                 <button 
                 onClick={startGame}
                 className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm uppercase tracking-widest border border-white/20 transition-colors"
             >
                 <RefreshCw className="w-3 h-3" /> Replay
             </button>
             </div>
        )}

      </main>
    </div>
  );
}