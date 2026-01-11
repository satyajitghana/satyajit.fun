"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, RefreshCw, Flame, Thermometer, Zap } from "lucide-react";
import "./heat-theme.css";

// --- Game Constants ---
const HEAT_INCREMENT = 15; // Heat added per key press
const COOL_DOWN_RATE = 0.5; // Heat removed per frame
const OVERHEAT_THRESHOLD = 100; // Max heat before overheat
const OVERHEAT_PENALTY_TIME = 2000; // Time a key stays locked after overheating
const WORDS = ["react", "nextjs", "typescript", "heat", "cool", "fire", "ice", "keyboard", "typing", "speed", "slow", "burn", "freeze", "code", "logic", "syntax", "error", "debug", "compile", "execute"];

interface KeyState {
  char: string;
  heat: number;
  isLocked: boolean;
  lockReleaseTime: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function KeyboardHeatGame() {
  // --- State ---
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start");
  const [score, setScore] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [typedWord, setTypedWord] = useState("");
  const [keys, setKeys] = useState<Record<string, KeyState>>({});
  const [particles, setParticles] = useState<Particle[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [globalHeat, setGlobalHeat] = useState(0);

  // --- Refs ---
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<Record<string, KeyState>>({});

  // --- Initialization ---
  const initKeys = useCallback(() => {
    const initialKeys: Record<string, KeyState> = {};
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < alphabet.length; i++) {
      initialKeys[alphabet[i]] = {
        char: alphabet[i],
        heat: 0,
        isLocked: false,
        lockReleaseTime: 0,
      };
    }
    setKeys(initialKeys);
    keysRef.current = initialKeys;
  }, []);

  const spawnWord = useCallback(() => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    setCurrentWord(word);
    setTypedWord("");
  }, []);

  const startGame = () => {
    initKeys();
    setScore(0);
    setGlobalHeat(0);
    spawnWord();
    setGameState("playing");
  };

  // --- Game Logic ---
  const updateHeat = useCallback(() => {
    if (gameState !== "playing") return;

    const now = Date.now();
    let newGlobalHeat = 0;
    const newKeys = { ...keysRef.current };
    let changed = false;

    Object.keys(newKeys).forEach((char) => {
      const key = newKeys[char];

      // Cooldown
      if (key.heat > 0) {
        key.heat = Math.max(0, key.heat - COOL_DOWN_RATE);
        changed = true;
      }

      // Check lock release
      if (key.isLocked && now > key.lockReleaseTime) {
        key.isLocked = false;
        changed = true;
      }

      newGlobalHeat += key.heat;
    });

    if (changed) {
      keysRef.current = newKeys;
      setKeys(newKeys);
    }
    
    // Average heat for global meter
    setGlobalHeat(newGlobalHeat / 26); // Normalize somewhat

    requestRef.current = requestAnimationFrame(updateHeat);
  }, [gameState]);

  // --- Input Handling ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== "playing") return;

    const char = e.key.toLowerCase();
    if (!keysRef.current[char]) return;

    const key = { ...keysRef.current[char] };

    if (key.isLocked) {
      // Penalty for hitting locked key?
      // Maybe play a sound or shake screen
      return;
    }

    // Add heat
    key.heat = Math.min(OVERHEAT_THRESHOLD + 20, key.heat + HEAT_INCREMENT); // Allow slight overshoot

    // Check overheat
    if (key.heat >= OVERHEAT_THRESHOLD) {
      key.isLocked = true;
      key.lockReleaseTime = Date.now() + OVERHEAT_PENALTY_TIME;
      key.heat = OVERHEAT_THRESHOLD; // Cap visual heat
      
      // Spawn explosion particles
      spawnParticles(key.char);
    }

    // Update typed word logic
    if (char === currentWord[typedWord.length]) {
      const newTyped = typedWord + char;
      setTypedWord(newTyped);
      
      if (newTyped === currentWord) {
        setScore(s => s + 10 + Math.floor(currentWord.length * 2));
        spawnWord();
      }
    } else {
        // Wrong key reset word progress? Or just ignore?
        // Let's just ignore for now, maybe add a 'shake' to the word display
    }

    // Update Ref & State immediately for responsiveness
    keysRef.current[char] = key;
    setKeys(prev => ({ ...prev, [char]: key }));

  }, [gameState, currentWord, typedWord, spawnWord]);

  // --- Effects ---
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (gameState === "playing") {
      requestRef.current = requestAnimationFrame(updateHeat);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, updateHeat]);

  // --- Visuals ---
  const spawnParticles = (char: string) => {
      // Find key position logic would go here if we had DOM refs to keys
      // For now, just center screen explosion or random
      // TODO: Implement proper particle system tied to key locations
  };

  const getKeyColor = (heat: number, isLocked: boolean) => {
      if (isLocked) return "#333";
      // Lerp from cool to hot
      if (heat < 30) return "#2a2a2a";
      if (heat < 60) return "#553311";
      if (heat < 90) return "#884400";
      return "#aa2200";
  };

  // --- Render ---
  return (
    <div className="keyboard-heat-theme min-h-screen flex flex-col items-center justify-center p-4">
      
      {/* Navbar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center w-full">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-mono text-sm">EXIT SYSTEM</span>
        </Link>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-orange-500">
                <Flame className="w-5 h-5" />
                <span className="font-mono text-xl font-bold">{Math.round(globalHeat)}°C</span>
            </div>
            <div className="flex items-center gap-2 text-white">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="font-mono text-xl font-bold">{score}</span>
            </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="w-full max-w-4xl flex flex-col items-center gap-12">
        
        {/* Word Display */}
        <div className="h-24 flex items-center justify-center">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={currentWord}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-6xl font-black tracking-widest uppercase font-mono relative"
                >
                    <span className="text-white/20 absolute left-0 top-0">{currentWord}</span>
                    <span className="text-white relative z-10">
                        <span className="text-green-400">{typedWord}</span>
                        <span>{currentWord.slice(typedWord.length)}</span>
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Global Heat Meter */}
        <div className="w-full max-w-lg h-1 bg-white/10 rounded-full overflow-hidden relative">
            <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-orange-500 to-red-600 transition-all duration-300"
                style={{ width: `${Math.min(100, globalHeat * 2)}%` }} // Scale up for visibility
            />
        </div>

        {/* Keyboard Grid */}
        <div className="key-container select-none">
            {["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-2 mb-2 w-full">
                    {row.split("").map((char) => {
                        const key = keys[char] || { heat: 0, isLocked: false };
                        const heatPercent = (key.heat / OVERHEAT_THRESHOLD) * 100;
                        
                        return (
                            <div 
                                key={char}
                                className={`
                                    relative w-12 h-12 md:w-16 md:h-16 rounded-lg border-2 flex items-center justify-center text-xl font-bold uppercase transition-all duration-75
                                    ${key.isLocked ? 'border-red-600 bg-red-900/20 opacity-50 scale-95' : 'border-white/20 bg-white/5'}
                                    ${char === currentWord[typedWord.length] ? 'ring-2 ring-yellow-400/50' : ''}
                                `}
                                style={{
                                    borderColor: key.isLocked ? '#ef4444' : `rgba(255, 255, 255, ${0.2 + (key.heat/200)})`,
                                    transform: key.isLocked ? `translate(${Math.random()*2-1}px, ${Math.random()*2-1}px)` : 'none'
                                }}
                            >
                                {/* Heat Fill */}
                                <div 
                                    className="absolute bottom-0 left-0 w-full bg-orange-500/30 transition-all duration-100"
                                    style={{ height: `${heatPercent}%` }}
                                />
                                
                                <span className="relative z-10">{char}</span>
                                
                                {key.isLocked && (
                                    <motion.div 
                                        initial={{ scale: 0 }} 
                                        animate={{ scale: 1 }} 
                                        className="absolute -top-2 -right-2 text-red-500 bg-black rounded-full p-1 border border-red-500"
                                    >
                                        <Thermometer className="w-3 h-3" />
                                    </motion.div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>

        {/* Start Overlay */}
        {gameState === "start" && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
                <div className="text-center max-w-md p-8 border border-white/20 bg-black rounded-2xl">
                    <h1 className="text-4xl font-bold mb-4 text-orange-500">KEYBOARD HEAT</h1>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Typing generates heat. Overheating a key locks it down.
                        <br/>
                        <span className="text-white">Balance speed with cooldowns.</span>
                    </p>
                    <button 
                        onClick={startGame}
                        className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-orange-500 hover:text-white transition-all"
                    >
                        INITIALIZE COOLING SYSTEM
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}