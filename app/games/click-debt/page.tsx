"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, MousePointerClick, TrendingDown, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import "./debt-theme.css";
import { cn } from "@/lib/utils";

// --- Configuration ---
const DEBT_CEILING = 100; // The hidden limit
const DEBT_PER_CLICK = 12; // How much debt a click generates
const DEBT_DECAY = 20; // How much debt recovers per second (Waiting is powerful)
const SETTLEMENT_TIME = 4000; // ms of silence to trigger ending

type GameState = "INTRO" | "PLAYING" | "BANKRUPT" | "SETTLED";
type Verdict = "OBSERVER" | "PRUDENT" | "CONSUMER" | "GAMBLER" | "MASTERMIND" | "HOARDER" | "INSOLVENT";

export default function ClickDebtGame() {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>("INTRO");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [verdict, setVerdict] = useState<Verdict>("OBSERVER");
  const [debugDebt, setDebugDebt] = useState(0); // For dev/tuning, technically hidden from user visuals mostly

  // Visual State
  const [vignetteOpacity, setVignetteOpacity] = useState(0);
  const [shakeLevel, setShakeLevel] = useState<"none" | "low" | "high">("none");
  const [glitch, setGlitch] = useState(false);

  // Refs
  const debtRef = useRef(0);
  const lastClickTimeRef = useRef(0);
  const settlementTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loopRef = useRef<number>(0);

  // --- Helpers ---
  const loadHighScore = () => {
    const saved = localStorage.getItem("click-debt-highscore");
    if (saved) setHighScore(parseInt(saved));
  };

  useEffect(() => {
    loadHighScore();
  }, []);

  // --- Game Loop (Visuals & Decay) ---
  const gameLoop = useCallback(() => {
    if (gameState !== "PLAYING") return;

    // Decay Debt (Waiting is powerful)
    if (debtRef.current > 0) {
      // Decay is per frame, approx 60fps
      debtRef.current = Math.max(0, debtRef.current - (DEBT_DECAY / 60));
    }

    // Check Bankruptcy
    if (debtRef.current >= DEBT_CEILING) {
      triggerEnding("BANKRUPT");
      return;
    }

    // Update Visuals
    const stress = debtRef.current / DEBT_CEILING;
    setVignetteOpacity(stress);
    
    if (stress > 0.75) {
        setShakeLevel("high");
        setGlitch(true);
    } else if (stress > 0.4) {
        setShakeLevel("low");
        setGlitch(false);
    } else {
        setShakeLevel("none");
        setGlitch(false);
    }
    
    // For React DevTools monitoring, but we don't render this directly usually
    // setDebugDebt(debtRef.current); 

    loopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState]);

  useEffect(() => {
    if (gameState === "PLAYING") {
      loopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gameState, gameLoop]);

  // --- Interaction ---
  const handleClick = () => {
    if (gameState === "INTRO") {
        setGameState("PLAYING");
        setScore(0);
        debtRef.current = 0;
        return;
    }
    
    if (gameState !== "PLAYING") return;

    // Logic
    setScore(s => s + 1);
    
    // Impulse Penalty: Rapid clicks cost more?
    // Let's keep it simple first: Fixed cost, linear decay.
    // Actually, non-linear debt makes it spicier.
    const now = Date.now();
    const timeSinceLast = now - lastClickTimeRef.current;
    
    let penalty = 1;
    if (timeSinceLast < 150) penalty = 2.5; // Spam penalty
    else if (timeSinceLast < 300) penalty = 1.5;

    debtRef.current += (DEBT_PER_CLICK * penalty);
    lastClickTimeRef.current = now;

    // Reset Settlement Timer
    if (settlementTimerRef.current) clearTimeout(settlementTimerRef.current);
    settlementTimerRef.current = setTimeout(() => {
        triggerEnding("SETTLED");
    }, SETTLEMENT_TIME);
  };

  // --- Endings ---
  const triggerEnding = (type: "BANKRUPT" | "SETTLED") => {
    setGameState(type);
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    if (settlementTimerRef.current) clearTimeout(settlementTimerRef.current);

    if (type === "BANKRUPT") {
        setVerdict("INSOLVENT");
        setShakeLevel("high");
        setTimeout(() => setShakeLevel("none"), 500);
    } else {
        // Calculate Verdict
        // Factors: Score vs Risk
        // If score is high, they managed risk well.
        if (score === 0) setVerdict("OBSERVER");
        else if (score < 10) setVerdict("PRUDENT");
        else if (score < 50) setVerdict("CONSUMER");
        else if (score < 100) setVerdict("GAMBLER");
        else if (score < 200) setVerdict("MASTERMIND");
        else setVerdict("HOARDER");

        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem("click-debt-highscore", score.toString());
        }
    }
  };

  const restart = () => {
    setGameState("INTRO");
    setScore(0);
    debtRef.current = 0;
    setVignetteOpacity(0);
    setShakeLevel("none");
    setGlitch(false);
    setVerdict("OBSERVER");
  };

  // --- Visual Helper ---
  const getVerdictData = () => {
    switch(verdict) {
        case "INSOLVENT": return { color: "text-red-500", desc: "You borrowed more time than you had.", quote: "Bankruptcy is instant." };
        case "OBSERVER": return { color: "text-gray-500", desc: "You watched. You waited. Nothing happened.", quote: "Zero risk. Zero reward." };
        case "PRUDENT": return { color: "text-blue-400", desc: "Safe. Controlled. Boring.", quote: "Slow and steady survives." };
        case "CONSUMER": return { color: "text-yellow-400", desc: "You clicked. You paid. You survived.", quote: "Average performance." };
        case "GAMBLER": return { color: "text-orange-500", desc: "You walked the line.", quote: "High risk tolerance detected." };
        case "MASTERMIND": return { color: "text-purple-400", desc: "Perfect equilibrium.", quote: "You understood the assignment." };
        case "HOARDER": return { color: "text-emerald-400", desc: "Greed is good, apparently.", quote: "Unnatural clicking ability." };
        default: return { color: "text-white", desc: "", quote: "" };
    }
  };

  const verdictData = getVerdictData();

  return (
    <div 
        className={cn(
            "debt-theme min-h-screen flex flex-col items-center justify-center select-none overflow-hidden relative debt-container font-mono",
            shakeLevel === "low" && "shake-low",
            shakeLevel === "high" && "shake-high"
        )}
        onMouseDown={handleClick}
        onTouchStart={handleClick}
    >
      {/* Dynamic CSS Variables */}
      <style jsx global>{`
        :root {
          --debt-opacity: ${vignetteOpacity};
        }
      `}</style>

      {/* Vignette */}
      <div className="vignette" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 mix-blend-difference pointer-events-none">
        <Link href="/" className="flex items-center gap-2 text-xs font-bold opacity-50 pointer-events-auto hover:opacity-100 transition-opacity uppercase tracking-widest text-white">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="text-right">
            <div className="text-xs opacity-50 uppercase tracking-widest mb-1 text-white">High Score</div>
            <div className="text-xl font-bold text-white tabular-nums">{highScore}</div>
        </div>
      </div>

      {/* Center Stage */}
      <div className="z-20 text-center pointer-events-none relative w-full max-w-md px-6">
        
        {gameState === "INTRO" && (
            <div className="animate-in fade-in zoom-in duration-1000 space-y-6">
                <h1 className="text-5xl md:text-7xl font-light tracking-tighter">CLICK DEBT</h1>
                <p className="text-sm uppercase tracking-[0.2em] opacity-60 max-w-xs mx-auto leading-relaxed">
                    Clicks borrow from the future.<br/>
                    Waiting repays the debt.
                </p>
                <div className="pt-12">
                    <p className="text-xs animate-pulse opacity-40 uppercase tracking-widest">
                        Tap anywhere to begin
                    </p>
                </div>
            </div>
        )}

        {gameState === "PLAYING" && (
            <div className="space-y-4">
                <div className={cn(
                    "text-9xl font-bold tracking-tighter transition-colors duration-100 tabular-nums",
                    glitch ? "glitch-text text-[#ff3333]" : "text-white"
                )} data-text={score}>
                    {score}
                </div>
                {/* Subtle visual cue for debt if needed, but maybe hidden is better as per prompt */}
                {/* <div className="h-1 bg-white/10 w-32 mx-auto rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${vignetteOpacity * 100}%` }} />
                </div> */}
            </div>
        )}

        {gameState === "BANKRUPT" && (
            <div className="animate-in zoom-in duration-300 space-y-6">
                <AlertTriangle className="w-16 h-16 mx-auto text-[#ff3333] mb-4" />
                <h2 className="text-6xl md:text-8xl font-black text-[#ff3333] tracking-tighter glitch-text" data-text="DEBT LIMIT">
                    BUSTED
                </h2>
                <p className="text-sm uppercase tracking-widest opacity-60">
                    Impulse control failed.
                </p>
                <div className="pt-8 pointer-events-auto">
                    <button onClick={(e) => { e.stopPropagation(); restart(); }} className="px-8 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform">
                        Try Again
                    </button>
                </div>
            </div>
        )}

        {gameState === "SETTLED" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
                <div className="space-y-2">
                    <div className="text-xs uppercase tracking-widest opacity-50">Final Score</div>
                    <div className="text-8xl font-bold">{score}</div>
                </div>
                
                <div className="space-y-4 border-t border-white/10 pt-8">
                    <div className={`text-2xl md:text-3xl font-light ${verdictData.color}`}>
                        "{verdict}"
                    </div>
                    <p className="text-sm italic opacity-60">
                        {verdictData.quote}
                    </p>
                </div>

                <div className="pt-8 pointer-events-auto">
                    <button 
                        onClick={(e) => { e.stopPropagation(); restart(); }}
                        className="group flex items-center gap-2 mx-auto text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                    >
                        <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                        Re-Initialize
                    </button>
                </div>
            </div>
        )}

      </div>

      {/* Warning Overlay */}
      {gameState === "PLAYING" && vignetteOpacity > 0.8 && (
          <div className="absolute inset-0 z-10 bg-red-500/10 pointer-events-none animate-pulse" />
      )}

    </div>
  );
}