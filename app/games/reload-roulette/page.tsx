"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCcw, Shield, ShieldAlert, History, Trophy, AlertTriangle, Zap } from "lucide-react";
import { GameNavbar } from "@/components/game-navbar";
import "./roulette-theme.css";

// Game configuration
const CYCLE_DURATION = 8000; // 8 seconds total cycle (4s safe, 4s danger)
const SPAM_THRESHOLD = 1500; // 1.5s minimum between reloads

type GameState = "idle" | "success" | "failure" | "spam";

interface HistoryEntry {
  id: number;
  result: GameState;
  timestamp: number;
  streak: number;
}

export default function ReloadRoulette() {
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lastResult, setLastResult] = useState<GameState>("idle");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isClient, setIsClient] = useState(false);
  
  // Visual state
  const [isSafe, setIsSafe] = useState(true);
  const [phase, setPhase] = useState(0); // 0 to 1 representing cycle progress
  const requestRef = useRef<number>(0);

  // Initialize game state on mount
  useEffect(() => {
    setIsClient(true);
    
    // Load persisted state
    const storedHighScore = parseInt(localStorage.getItem("roulette_highscore") || "0");
    const storedStreak = parseInt(localStorage.getItem("roulette_streak") || "0");
    const storedHistory = JSON.parse(localStorage.getItem("roulette_history") || "[]");
    const attemptTime = localStorage.getItem("roulette_attempt_time");
    
    setHighScore(storedHighScore);
    setHistory(storedHistory);

    // Check if this page load is actually a reload
    const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const isReload = navigationEntry?.type === "reload";

    // If there was an attempt AND it was a reload, process it
    if (attemptTime && isReload) {
      const timestamp = parseInt(attemptTime);
      const timeSinceLastLoad = parseInt(localStorage.getItem("roulette_last_load") || "0");
      
      // Determine outcome
      let result: GameState = "idle";
      
      // Check for spamming (reloading too quickly after page load)
      if (timestamp - timeSinceLastLoad < SPAM_THRESHOLD) {
        result = "spam";
      } else {
        // Calculate the state AT THE MOMENT of reload
        const cyclePosition = (timestamp % CYCLE_DURATION) / CYCLE_DURATION;
        const wasSafe = cyclePosition < 0.5; // First half is safe
        
        if (wasSafe) {
          result = "success";
        } else {
          result = "failure";
        }
      }

      // Apply consequences
      let newStreak = storedStreak;
      
      if (result === "success") {
        newStreak += 1;
        if (newStreak > storedHighScore) {
          setHighScore(newStreak);
          localStorage.setItem("roulette_highscore", newStreak.toString());
        }
      } else if (result === "failure" || result === "spam") {
        newStreak = 0;
      }
      
      // Update state
      setStreak(newStreak);
      setLastResult(result);
      localStorage.setItem("roulette_streak", newStreak.toString());
      
      // Add to history
      const newEntry: HistoryEntry = {
        id: Date.now(),
        result,
        timestamp,
        streak: newStreak
      };
      const newHistory = [newEntry, ...storedHistory].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem("roulette_history", JSON.stringify(newHistory));
      
    } else {
      // Not a reload (or no attempt recorded), just restore state
      setStreak(storedStreak);
      setLastResult("idle");
    }

    // Always clear the attempt time after processing
    localStorage.removeItem("roulette_attempt_time");

    // Set load time for spam detection
    localStorage.setItem("roulette_last_load", Date.now().toString());

    // Setup beforeunload listener to capture reload attempts
    const handleBeforeUnload = () => {
      localStorage.setItem("roulette_attempt_time", Date.now().toString());
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Animation Loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const cyclePosition = (now % CYCLE_DURATION) / CYCLE_DURATION;
      
      setPhase(cyclePosition);
      setIsSafe(cyclePosition < 0.5);
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const getMessage = () => {
    switch (lastResult) {
      case "success": return "SYSTEM STABILIZED. SEQUENCE CONTINUED.";
      case "failure": return "CRITICAL FAILURE. RELOAD TIMED POORLY.";
      case "spam": return "INPUT OVERLOAD. PATIENCE REQUIRED.";
      default: return "AWAITING USER INPUT...";
    }
  };

  const getColor = () => {
    if (lastResult === "success") return "text-green-400";
    if (lastResult === "failure") return "text-red-500";
    if (lastResult === "spam") return "text-yellow-400";
    return "text-white/50";
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen roulette-bg selection:bg-green-500/30">
      <GameNavbar
        accentColor={isSafe ? "#4ade80" : "#ef4444"}
      />
      
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 roulette-grid">
        
        {/* Status Header */}
        <div className="absolute top-24 w-full max-w-2xl text-center space-y-2">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            key={lastResult}
            className={`font-mono text-xl tracking-widest ${getColor()}`}
          >
            {getMessage()}
          </motion.div>
          
          <div className="flex justify-center gap-8 text-sm font-mono text-white/40 mt-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>BEST: {highScore}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>CURRENT: {streak}</span>
            </div>
          </div>
        </div>

        {/* Main Core UI */}
        <div className="relative core-container my-12">
          {/* Breathing Core */}
          <motion.div
            className="absolute inset-0 rounded-full blur-3xl opacity-20"
            animate={{
              backgroundColor: isSafe ? "#4ade80" : "#ef4444",
              scale: isSafe ? [0.8, 1.2, 0.8] : [1.2, 0.8, 1.2],
            }}
            transition={{
              duration: CYCLE_DURATION / 2000, // half cycle in seconds
              ease: "linear",
              repeat: Infinity,
            }}
          />

          {/* The Ring */}
          <div 
            className="core-ring w-64 h-64 flex items-center justify-center backdrop-blur-sm bg-black/30 z-10"
            style={{
              borderColor: isSafe ? "rgba(74, 222, 128, 0.5)" : "rgba(239, 68, 68, 0.5)",
              boxShadow: isSafe 
                ? "0 0 30px rgba(74, 222, 128, 0.2)" 
                : "0 0 30px rgba(239, 68, 68, 0.2)"
            }}
          >
            <div className="text-center space-y-2">
              <div className={`text-4xl font-black tracking-tighter ${isSafe ? "text-green-400" : "text-red-500"}`}>
                {isSafe ? "SAFE" : "DANGER"}
              </div>
              <div className="text-xs text-white/50 font-mono">
                {Math.round(phase * 100)}% CYCLE
              </div>
            </div>
          </div>

          {/* Orbiting Indicator */}
          <div 
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              transform: `rotate(${phase * 360}deg)`
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
              <div className={`w-4 h-4 rounded-full ${isSafe ? "bg-green-400" : "bg-red-500"} shadow-[0_0_10px_currentColor]`} />
            </div>
          </div>

          {/* Pulse Waves */}
          {isSafe && (
            <div className="pulse-ring text-green-500/20" />
          )}
        </div>

        {/* Instructions */}
        <div className="max-w-md text-center space-y-6 z-10">
          <p className="text-white/60 font-mono text-sm leading-relaxed">
            The system cycle is predictable.
            <br />
            Reload the page when the core is <span className="text-green-400">SAFE</span>.
            <br />
            Avoid the <span className="text-red-500">DANGER</span> zone.
          </p>

          <div className="flex justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="group relative px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all hover:scale-105 active:scale-95"
            >
              <span className="flex items-center gap-2 text-white font-mono uppercase tracking-widest text-sm">
                <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                Initialize Reload
              </span>
            </button>
          </div>
        </div>

        {/* History Log */}
        <div className="absolute bottom-8 right-8 w-64 p-4 rounded-xl bg-black/40 border border-white/5 backdrop-blur-md hidden md:block">
          <div className="flex items-center gap-2 mb-3 text-xs font-mono text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">
            <History className="w-3 h-3" />
            System Log
          </div>
          <div className="history-log space-y-2">
            <AnimatePresence>
              {history.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="history-item flex items-center justify-between text-xs font-mono"
                >
                  <span className={
                    entry.result === "success" ? "text-green-400" :
                    entry.result === "failure" ? "text-red-500" : "text-yellow-400"
                  }>
                    {entry.result.toUpperCase()}
                  </span>
                  <span className="text-white/30">
                    S:{entry.streak}
                  </span>
                </motion.div>
              ))}
              {history.length === 0 && (
                <div className="text-white/20 text-xs italic">No data recorded</div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}