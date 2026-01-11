"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Wind, Circle } from "lucide-react";
import "./negative-theme.css";

interface Particle {
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  vx: number;
  vy: number;
  alpha: number;
  growthRate: number;
}

export default function NegativeSpaceGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chaosLevel, setChaosLevel] = useState(0); // 0 to 1, based on mouse movement
  const [fillPercent, setFillPercent] = useState(0);
  const [gameState, setGameState] = useState<"PLAYING" | "HARMONY" | "VOID">("PLAYING");
  
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, lastX: -1000, lastY: -1000, speed: 0 });
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize Particles
  const initParticles = useCallback((width: number, height: number) => {
    const p: Particle[] = [];
    const count = Math.floor((width * height) / 10000); // Density based on screen size
    
    for (let i = 0; i < count; i++) {
      p.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0,
        targetRadius: Math.random() * 40 + 20, // Varied maximum sizes
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        alpha: 0,
        growthRate: Math.random() * 0.05 + 0.01,
      });
    }
    particlesRef.current = p;
  }, []);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        initParticles(clientWidth, clientHeight);
      }
    };
    
    window.addEventListener("resize", handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener("resize", handleResize);
  }, [initParticles]);

  // Mouse Tracking
  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    mouseRef.current.lastX = mouseRef.current.x;
    mouseRef.current.lastY = mouseRef.current.y;
    mouseRef.current.x = clientX;
    mouseRef.current.y = clientY;
    
    // Calculate instantaneous speed
    const dx = mouseRef.current.x - mouseRef.current.lastX;
    const dy = mouseRef.current.y - mouseRef.current.lastY;
    const speed = Math.sqrt(dx * dx + dy * dy);
    
    mouseRef.current.speed = speed;
    
    // Immediate chaos spike on movement
    setChaosLevel(prev => Math.min(1, prev + speed * 0.005));
  }, []);

  // Game Loop
  const animate = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    
    if (!canvas || !ctx) return;

    // Clear with trail effect - Darker for more contrast
    ctx.fillStyle = "rgba(5, 5, 8, 0.15)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update Chaos Decay
    setChaosLevel(prev => Math.max(0, prev * 0.96)); // Slower decay for more weight
    
    // Mouse interaction sphere
    const mouse = mouseRef.current;
    
    // Update and Draw Particles
    let totalRadius = 0;
    let maxTotalRadius = 0;

    particlesRef.current.forEach(p => {
      // 1. Growth Logic
      // If chaos is low, grow. If chaos is high, shrink.
      // Growth is slower as they get bigger (logarithmic feel)
      if (chaosLevel < 0.05) {
        const growthFactor = 1 - (p.radius / p.targetRadius);
        p.radius = Math.min(p.targetRadius, p.radius + p.growthRate * (growthFactor + 0.2));
        p.alpha = Math.min(0.6, p.alpha + 0.005);
      } else {
        // Decay is aggressive
        const decay = chaosLevel * 3;
        p.radius = Math.max(0, p.radius - decay);
        p.alpha = Math.max(0, p.alpha - 0.02);
      }

      // 2. Mouse Repulsion
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const influenceRadius = 250 + (chaosLevel * 100);
      
      if (dist < influenceRadius) {
        const angle = Math.atan2(dy, dx);
        const force = Math.pow((influenceRadius - dist) / influenceRadius, 2); // Exponential force
        const push = force * (15 + chaosLevel * 60);
        
        p.vx += Math.cos(angle) * push * 0.15;
        p.vy += Math.sin(angle) * push * 0.15;
        
        // Being near the mouse shrinks them rapidly
        p.radius *= 0.85;
      }

      // 3. Movement & Friction
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92; // Less friction for floaty feel
      p.vy *= 0.92;
      
      // 4. Subtle ambient float
      p.x += Math.sin(time * 0.001 + p.y * 0.01) * 0.2;
      p.y += Math.cos(time * 0.001 + p.x * 0.01) * 0.2;

      // 5. Bounds wrapping
      if (p.x < -50) p.x = canvas.width + 50;
      if (p.x > canvas.width + 50) p.x = -50;
      if (p.y < -50) p.y = canvas.height + 50;
      if (p.y > canvas.height + 50) p.y = -50;

      // Draw
      if (p.radius > 0.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        // Gradient fill for depth
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${p.alpha * 1.2})`);
        gradient.addColorStop(1, `rgba(200, 220, 255, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        totalRadius += p.radius;
        maxTotalRadius += p.targetRadius;
      }
    });

    // Calculate Fill Percentage
    if (maxTotalRadius > 0) {
      const currentFill = totalRadius / maxTotalRadius;
      setFillPercent(currentFill);
      
      // Win Condition
      if (currentFill > 0.95 && gameState === "PLAYING") {
        setGameState("HARMONY");
      } else if (currentFill < 0.05 && chaosLevel > 0.8 && gameState === "HARMONY") {
        // Can break harmony if too chaotic
        setGameState("PLAYING");
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [chaosLevel, gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  return (
    <div 
      className="negative-space-theme min-h-screen relative overflow-hidden font-sans select-none"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      {/* Background Canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full"
      />

      {/* Header */}
      <div className="absolute top-0 left-0 p-8 z-50">
        <Link href="/" className="text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Exit
        </Link>
      </div>

      {/* Central Message / State Indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
        <div className={`transition-all duration-1000 ${gameState === 'HARMONY' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <h1 className="text-6xl md:text-9xl font-light text-white tracking-[0.2em] text-center text-glow">
            SILENCE
          </h1>
          <p className="text-center text-white/40 mt-4 uppercase tracking-widest text-sm">
            The void is full
          </p>
        </div>
      </div>

      {/* Instruction Overlay (fades out when playing) */}
      <div className={`absolute bottom-10 left-0 right-0 text-center transition-opacity duration-1000 ${fillPercent > 0.1 ? 'opacity-0' : 'opacity-100'}`}>
        <p className="text-white/30 uppercase tracking-[0.3em] text-xs">
          Be still to shape the void
        </p>
      </div>

      {/* Debug / Progress (Optional, maybe keep it minimal) */}
      {/* <div className="absolute bottom-4 right-4 text-white/20 font-mono text-xs">
        Fill: {(fillPercent * 100).toFixed(1)}% | Chaos: {(chaosLevel * 100).toFixed(0)}%
      </div> */}
    </div>
  );
}