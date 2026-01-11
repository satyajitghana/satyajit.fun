"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Loader2, Zap, Monitor, AlertTriangle, Clock, MousePointer2, Trophy, RotateCcw } from "lucide-react";
import Link from "next/link";
import "./loading-theme.css";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EndingType = "none" | "true" | "chaos" | "speedrunner";

interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  level: number;
  maxLevel: number;
  icon: any;
}

const INITIAL_UPGRADES: Upgrade[] = [
  {
    id: "faster_loader",
    name: "Faster Loader",
    description: "Increases passive loading speed slightly.",
    baseCost: 10,
    costMultiplier: 1.5,
    level: 0,
    maxLevel: 10,
    icon: Loader2,
  },
  {
    id: "click_power",
    name: "Rapid Click",
    description: "Clicking the bar gives more progress.",
    baseCost: 25,
    costMultiplier: 1.8,
    level: 0,
    maxLevel: 5,
    icon: MousePointer2,
  },
  {
    id: "fake_progress",
    name: "Visual Optimization",
    description: "Makes the bar look like it's moving faster.",
    baseCost: 50,
    costMultiplier: 2,
    level: 0,
    maxLevel: 5,
    icon: Monitor,
  },
  {
    id: "parallel_loading",
    name: "Parallel Loading",
    description: "Adds sub-tasks that definitely help.",
    baseCost: 100,
    costMultiplier: 2.5,
    level: 0,
    maxLevel: 1,
    icon: Zap,
  },
];

const RANDOM_MESSAGES = [
  "Optimizing shaders...",
  "Reticulating splines...",
  "Downloading more RAM...",
  "Defragmenting the cloud...",
  "Calculating infinity...",
  "Asking nicely...",
  "Reverting changes...",
  "Generating terrain...",
  "Loading assets...",
  "Compiling shaders...",
  "Updating updater...",
  "Patching the patch...",
];

export default function LoadingScreenTycoon() {
  const [progress, setProgress] = useState(0);
  const [patience, setPatience] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(INITIAL_UPGRADES);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [isPaused, setIsPaused] = useState(false);
  const [ending, setEnding] = useState<EndingType>("none");
  const [logs, setLogs] = useState<string[]>([]);
  const [parallelBars, setParallelBars] = useState<number[]>([]);
  const [glitchActive, setGlitchActive] = useState(false);
  const [startTime] = useState(Date.now());
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  const [totalClicks, setTotalClicks] = useState(0);
  
  // Game loop refs
  const progressRef = useRef(progress);
  const patienceRef = useRef(patience);
  
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    patienceRef.current = patience;
  }, [patience]);

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 5));
  };

  // The "True Ending" check: No interaction for 30s
  useEffect(() => {
    if (ending !== "none") return;

    const interval = setInterval(() => {
      if (Date.now() - lastInteractionTime > 30000 && progress < 100) {
        setEnding("true");
        addLog("You waited patiently. Good job.");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastInteractionTime, ending, progress]);

  // Main Game Loop
  useEffect(() => {
    if (ending !== "none") return;

    const interval = setInterval(() => {
      if (isPaused) return;

      // Base passive gain
      let progressGain = 0.05; 
      
      // Upgrades effect
      const fasterLoader = upgrades.find(u => u.id === "faster_loader");
      if (fasterLoader) progressGain += fasterLoader.level * 0.05;

      const fakeProgress = upgrades.find(u => u.id === "fake_progress");
      if (fakeProgress && fakeProgress.level > 0) {
        if (Math.random() < 0.1 * fakeProgress.level) {
           // Visual jump that might revert later
           setProgress(p => Math.min(p + 5, 99.9));
        }
      }

      // Random Events Logic (Trolling)
      if (Math.random() < 0.02) {
        const eventType = Math.random();
        if (eventType < 0.3) {
          // Setback
          const setback = Math.random() * 10 + 5;
          setProgress(p => Math.max(0, p - setback));
          addLog(`Error: Reverting changes (-${setback.toFixed(1)}%)`);
          setStatusMessage("Reverting changes...");
          setGlitchActive(true);
          setTimeout(() => setGlitchActive(false), 500);
        } else if (eventType < 0.6) {
          // Pause
          setIsPaused(true);
          const msg = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
          setStatusMessage(msg);
          setTimeout(() => {
            setIsPaused(false);
            setStatusMessage("Resuming...");
          }, 2000);
        } else {
          // Fake big jump
          if (progress < 90) {
            setProgress(99);
            setStatusMessage("Almost there...");
            setTimeout(() => {
              setProgress(12);
              setStatusMessage("Just kidding. File corrupted.");
              addLog("Critical Error: File corruption detected.");
            }, 1500);
          }
        }
      } else {
        // Normal increment
        setProgress(p => {
          const newP = p + progressGain;
          if (newP >= 100) {
            // Check for endings or loop
            const totalLevels = upgrades.reduce((acc, u) => acc + u.level, 0);
            const maxLevels = upgrades.reduce((acc, u) => acc + u.maxLevel, 0);
            
            if (totalLevels === maxLevels) {
              setEnding("chaos");
              return 100;
            }

            // Speedrunner check
            const timeElapsed = (Date.now() - startTime) / 1000;
            if (timeElapsed < 60 && totalClicks > 50) { // Arbitrary hard condition
               setEnding("speedrunner");
               return 100;
            }

            // Default infinite loop troll if not special ending
            if (Math.random() > 0.5) {
                addLog("Installation failed. Retrying...");
                return 0;
            } else {
                return 100;
            }
          }
          return newP;
        });
      }

      // Patience generation (Passive income)
      setPatience(p => p + 0.5);

    }, 100);

    return () => clearInterval(interval);
  }, [upgrades, isPaused, ending, startTime, totalClicks]);

  const handleInteraction = () => {
    if (ending !== "none") return;
    setLastInteractionTime(Date.now());
  };

  const handleBarClick = () => {
    handleInteraction();
    setTotalClicks(prev => prev + 1);

    // Trolling on click
    if (Math.random() < 0.05) {
      setProgress(p => Math.max(0, p - 2));
      addLog("Don't touch that!");
      return;
    }

    const clickPower = upgrades.find(u => u.id === "click_power");
    const power = 1 + (clickPower?.level || 0) * 0.5;
    
    setProgress(p => Math.min(p + power, 99.9)); // Hard to reach 100 by clicking
    setPatience(p => p + 1);
    
    // Spawn particles or something (simplified to log for now)
  };

  const buyUpgrade = (upgradeId: string) => {
    handleInteraction();
    const upgradeIndex = upgrades.findIndex(u => u.id === upgradeId);
    if (upgradeIndex === -1) return;

    const upgrade = upgrades[upgradeIndex];
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));

    if (patience >= cost && upgrade.level < upgrade.maxLevel) {
      setPatience(p => p - cost);
      const newUpgrades = [...upgrades];
      newUpgrades[upgradeIndex] = { ...upgrade, level: upgrade.level + 1 };
      setUpgrades(newUpgrades);
      addLog(`Upgraded ${upgrade.name} to level ${upgrade.level + 1}`);

      if (upgrade.id === "parallel_loading") {
        setParallelBars(prev => [...prev, 0]);
      }
    } else {
      toast.error("Not enough patience!");
    }
  };

  const resetGame = () => {
    window.location.reload();
  };

  // Parallel bars logic
  useEffect(() => {
    if (parallelBars.length === 0) return;
    const interval = setInterval(() => {
        setParallelBars(bars => bars.map(b => (b + Math.random() * 2) % 100));
    }, 100);
    return () => clearInterval(interval);
  }, [parallelBars]);


  // Rendering Endings
  if (ending !== "none") {
    return (
      <div className="min-h-screen bg-black text-green-500 font-mono flex flex-col items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-2xl border border-green-500 p-8 rounded bg-black"
        >
          <h1 className="text-4xl font-bold mb-4 glitch-text" data-text={
            ending === "true" ? "PATIENCE IS A VIRTUE" :
            ending === "chaos" ? "SYSTEM OVERLOAD" : "SPEED DEMON"
          }>
            {ending === "true" ? "PATIENCE IS A VIRTUE" :
             ending === "chaos" ? "SYSTEM OVERLOAD" : "SPEED DEMON"}
          </h1>
          <p className="text-xl mb-8 text-green-300">
            {ending === "true" && "You realized the only winning move is not to play (or click). You waited 30 seconds without doing anything. Zen master."}
            {ending === "chaos" && "You bought every upgrade. The loading bar consumed itself. The simulation has crashed."}
            {ending === "speedrunner" && "You clicked so fast the loading bar got scared and finished. Amazing APM."}
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/">
                <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-500 hover:text-black">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Exit
                </Button>
            </Link>
            <Button onClick={resetGame} variant="default" className="bg-green-500 text-black hover:bg-green-400">
                <RotateCcw className="mr-2 h-4 w-4" /> Restart
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Link 
            href="/" 
            className="flex items-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Arcade
          </Link>
          <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-purple-200">{Math.floor(patience)} Patience</span>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Center Column: The Loader */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
                {/* Glitch Overlay */}
                {glitchActive && (
                    <div className="absolute inset-0 bg-red-500/10 z-10 pointer-events-none mix-blend-overlay" />
                )}

                <div className="text-center mb-8">
                    <h1 className={cn("text-3xl font-bold mb-2", glitchActive && "glitch-text")} data-text="Loading...">
                        {statusMessage}
                    </h1>
                    <p className="text-slate-500 text-sm font-mono">
                        {(progress).toFixed(2)}% Complete
                    </p>
                </div>

                {/* Main Progress Bar */}
                <div 
                    className="h-12 bg-slate-950 rounded-full border-2 border-slate-800 relative cursor-pointer active:scale-[0.99] transition-transform overflow-hidden"
                    onClick={handleBarClick}
                >
                    <div 
                        className="h-full bg-purple-600 transition-all duration-200 loading-bar-stripe"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                    {/* Hover text */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-xs font-bold text-white uppercase tracking-widest drop-shadow-md">Click to Speed Up</span>
                    </div>
                </div>

                {/* Parallel Bars (Fake) */}
                <div className="mt-4 space-y-2">
                    {parallelBars.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="w-16">Thread {i+1}</span>
                            <Progress value={p} className="h-2 bg-slate-950" />
                        </div>
                    ))}
                </div>

            </div>

            {/* Console Log */}
            <div className="bg-black/80 font-mono text-xs p-4 rounded-xl border border-slate-800 h-48 overflow-hidden flex flex-col-reverse">
                {logs.map((log, i) => (
                    <motion.div 
                        key={`${i}-${log}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-green-400/80 py-0.5 border-l-2 border-green-900/50 pl-2 mb-1"
                    >
                        {">"} {log}
                    </motion.div>
                ))}
            </div>
          </div>

          {/* Right Column: Upgrades */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Upgrades
            </h2>
            
            <div className="space-y-3">
                {upgrades.map((upgrade) => {
                    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
                    const isMaxed = upgrade.level >= upgrade.maxLevel;
                    const canAfford = patience >= cost && !isMaxed;
                    const Icon = upgrade.icon;

                    return (
                        <button
                            key={upgrade.id}
                            onClick={() => buyUpgrade(upgrade.id)}
                            disabled={!canAfford && !isMaxed}
                            className={cn(
                                "w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                                isMaxed 
                                    ? "bg-purple-900/20 border-purple-500/50 opacity-80" 
                                    : canAfford 
                                        ? "bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-purple-500/50" 
                                        : "bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="p-2 rounded-lg bg-slate-950 group-hover:scale-110 transition-transform">
                                    <Icon className={cn("w-5 h-5", isMaxed ? "text-purple-400" : "text-slate-400")} />
                                </div>
                                <span className={cn("text-xs font-bold px-2 py-1 rounded-full", isMaxed ? "bg-purple-500/20 text-purple-300" : "bg-slate-950 text-slate-400")}>
                                    {isMaxed ? "MAX" : `${cost} P`}
                                </span>
                            </div>
                            <h3 className="font-bold text-sm mb-1">{upgrade.name}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">{upgrade.description}</p>
                            
                            {/* Level indicator */}
                            <div className="mt-3 flex gap-0.5">
                                {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "h-1 flex-1 rounded-full", 
                                            i < upgrade.level ? "bg-purple-500" : "bg-slate-700"
                                        )} 
                                    />
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}