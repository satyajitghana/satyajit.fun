"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Play, AlertTriangle, ShieldAlert, Skull, Ban, Siren, Fingerprint } from "lucide-react";
import "./tab-escape-theme.css";

// Game Constants
const CHANNEL_NAME = "tab_escape_channel";
const GAME_DURATION = 60; // 60 seconds survival
const SPAWN_INTERVAL_INITIAL = 3000;
const SPAWN_INTERVAL_MIN = 800; // Gets chaotic fast

interface GameState {
  isPlaying: boolean;
  score: number;
  timeRemaining: number;
  gameOverReason: string | null;
  activeTabs: string[];
}

export default function TabEscapeGame() {
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    score: 0,
    timeRemaining: GAME_DURATION,
    gameOverReason: null,
    activeTabs: [],
  });

  const [permissionGranted, setPermissionGranted] = useState(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Broadcast Channel
  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel(CHANNEL_NAME);
    
    broadcastChannelRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      handleMessage(type, payload);
    };

    return () => {
      stopGame();
      broadcastChannelRef.current?.close();
    };
  }, []);

  const handleMessage = (type: string, payload: any) => {
    switch (type) {
      case "TAB_EXPLODED":
        gameOver("BOOM! A bomb exploded.");
        break;
      case "SAFE_TAB_CLOSED":
        // Penalty or Game Over? Let's do penalty for now, or instant fail for "Safe Zone"
        setGameState(prev => ({ ...prev, score: Math.max(0, prev.score - 500) }));
        break;
      case "BOMB_DEFUSED":
        setGameState(prev => ({ ...prev, score: prev.score + 100 }));
        break;
      case "TAB_REGISTERED":
        setGameState(prev => ({ 
          ...prev, 
          activeTabs: [...prev.activeTabs, payload.id] 
        }));
        break;
      case "TAB_CLOSED_GRACEFULLY":
         setGameState(prev => ({ 
          ...prev, 
          activeTabs: prev.activeTabs.filter(id => id !== payload.id) 
        }));
        break;
    }
  };

  const startGame = () => {
    // Reset State
    setGameState({
      isPlaying: true,
      score: 0,
      timeRemaining: GAME_DURATION,
      gameOverReason: null,
      activeTabs: [],
    });

    // Attempt to open a test tab to check popup blocker
    try {
      const testWindow = window.open("", "_blank", "width=100,height=100");
      if (!testWindow) {
        alert("Please allow popups for this site to play Tab Escape!");
        setGameState(prev => ({ ...prev, isPlaying: false }));
        return;
      }
      testWindow.close();
      setPermissionGranted(true);
    } catch (e) {
      alert("Please allow popups for this site to play Tab Escape!");
      return;
    }

    // Start Timer
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timeRemaining <= 1) {
          gameWin();
          return prev;
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    // Start Spawner
    startSpawner();
  };

  const startSpawner = () => {
    if (spawnerRef.current) clearInterval(spawnerRef.current);
    
    // Initial spawn
    spawnTab();

    let interval = SPAWN_INTERVAL_INITIAL;
    
    // Dynamic spawner loop with escalation
    const loop = () => {
        spawnTab();
        
        // Escalate difficulty (spawn faster as time goes on)
        if (interval > SPAWN_INTERVAL_MIN) {
            interval = Math.max(SPAWN_INTERVAL_MIN, interval * 0.95);
        }

        spawnerRef.current = setTimeout(loop, interval);
    };

    spawnerRef.current = setTimeout(loop, interval);
  };

  const spawnTab = () => {
    // Difficulty Progression
    // 0-10s: Easy (Bomb, Decoy)
    // 10-30s: Medium (Bomb, Safe, Decoy)
    // 30s+: Hard (Liar types added)
    
    const elapsedTime = GAME_DURATION - (timerRef.current ? (timerRef.current as any)._idleTimeout === 1000 ? 0 : 0 : 0); // Hacky, better to use state but we are inside callback
    // We'll use random probabilities that shift over time conceptually
    
    const roll = Math.random();
    let type = "decoy";

    if (roll < 0.4) {
        type = "bomb";
    } else if (roll < 0.6) {
        type = "decoy";
    } else if (roll < 0.8) {
        type = "safe";
    } else {
        // Chaos tier (Liars)
        type = Math.random() > 0.5 ? "liar-bomb" : "liar-safe";
    }
    
    // Random position offset to make it chaotic
    const left = Math.floor(Math.random() * (window.screen.availWidth - 400));
    const top = Math.floor(Math.random() * (window.screen.availHeight - 300));

    window.open(
      `/games/tab-escape/tab?type=${type}&id=${Date.now()}-${Math.random()}`, 
      `_blank`, 
      `width=400,height=300,left=${left},top=${top}`
    );
  };

  const stopGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnerRef.current) {
        clearTimeout(spawnerRef.current); // Changed to timeout for dynamic loop
        clearInterval(spawnerRef.current);
    }
    
    // Send Emergency Stop to all children
    broadcastChannelRef.current?.postMessage({ type: "EMERGENCY_STOP" });
  }, []);

  const gameOver = (reason: string) => {
    stopGame();
    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      gameOverReason: reason
    }));
  };

  const gameWin = () => {
    stopGame();
    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      gameOverReason: "YOU SURVIVED!"
    }));
  };

  return (
    <div className="tab-escape-theme min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-[var(--primary)] selection:text-white overflow-hidden flex flex-col items-center justify-center p-4 relative">
        
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
         {/* Could add some glitchy visuals here later */}
      </div>

      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors glass-panel px-4 py-2 rounded-full">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center space-y-8">
        
        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase glitch-text">
            Tab Escape
          </h1>
          <p className="text-xl text-[var(--muted-foreground)]">
            Your browser is the enemy. Manage the chaos.
          </p>
        </div>

        {/* Game Status / Menu */}
        <div className="glass-panel p-8 rounded-3xl space-y-6">
          
          {!gameState.isPlaying && !gameState.gameOverReason && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
                      <Skull className="w-5 h-5" /> 
                      <span className="font-bold uppercase">Bomb Tabs</span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">Close them before the timer runs out, or BOOM.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-[var(--safe)] mb-2">
                      <ShieldAlert className="w-5 h-5" /> 
                      <span className="font-bold uppercase">Safe Tabs</span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">Do NOT close these. They keep you alive.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-[var(--secondary)] mb-2">
                      <Ban className="w-5 h-5" />
                      <span className="font-bold uppercase">Decoys</span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">Annoying but harmless. Clear them to reduce clutter.</p>
                  </div>
                  
                  {/* Liar Instructions */}
                  <div className="col-span-1 md:col-span-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                      <Fingerprint className="w-5 h-5" />
                      <span className="font-bold uppercase">Liars (Advanced)</span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                        Some tabs lie. A "Safe" tab might glitch and reveal a skull (it's a bomb!). A "Bomb" might be a bluff.
                        Watch for <b>glitches</b> to reveal the truth.
                    </p>
                  </div>
               </div>
               
               <div className="p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl text-sm text-[var(--primary)] flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Warning: This game opens multiple popups. You MUST allow popups for this site to play. Don't worry, we'll close them when you're done.</span>
               </div>

               <button 
                onClick={startGame}
                className="w-full py-4 bg-[var(--foreground)] text-[var(--background)] font-bold text-xl rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6" />
                START CHAOS
              </button>
            </div>
          )}

          {gameState.isPlaying && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                 <div className="text-left">
                    <div className="text-sm text-[var(--muted-foreground)] uppercase tracking-wider font-bold">Time Remaining</div>
                    <div className="text-6xl font-black tabular-nums">{gameState.timeRemaining}s</div>
                 </div>
                 <div className="text-right">
                    <div className="text-sm text-[var(--muted-foreground)] uppercase tracking-wider font-bold">Score</div>
                    <div className="text-4xl font-bold tabular-nums text-[var(--primary)]">{gameState.score}</div>
                 </div>
              </div>

              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[var(--primary)]" 
                  initial={{ width: "100%" }}
                  animate={{ width: `${(gameState.timeRemaining / GAME_DURATION) * 100}%` }}
                  transition={{ ease: "linear", duration: 1 }}
                />
              </div>
              
              <button 
                onClick={stopGame}
                className="w-full py-3 border-2 border-[var(--primary)] text-[var(--primary)] font-bold rounded-xl hover:bg-[var(--primary)] hover:text-white transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <Siren className="w-5 h-5" />
                Emergency Stop
              </button>
            </div>
          )}

          {gameState.gameOverReason && (
            <div className="space-y-6">
               <div className="text-4xl font-black uppercase mb-4">
                 {gameState.gameOverReason === "YOU SURVIVED!" ? (
                    <span className="text-[var(--safe)]">Mission Complete</span>
                 ) : (
                    <span className="text-[var(--primary)]">Game Over</span>
                 )}
               </div>
               <p className="text-xl">{gameState.gameOverReason}</p>
               <div className="text-2xl font-bold">Final Score: {gameState.score}</div>
               
               <button 
                onClick={startGame}
                className="w-full py-4 bg-[var(--foreground)] text-[var(--background)] font-bold text-xl rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6" />
                TRY AGAIN
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}