"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, RefreshCw, AlertTriangle, Check, Info, Save, Trash2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import "./unreliable-theme.css";
import { Button } from "@/components/ui/button";

// --- Types & Constants ---

type GameState = "start" | "playing" | "failed" | "victory";

interface Level {
    id: number;
    title: string;
    instruction: string;
    hint: string; // Displayed after failure
}

const LEVELS: Level[] = [
    {
        id: 0,
        title: "The Label Paradox",
        instruction: "Click the START button.",
        hint: "In this world, actions speak louder than words. Green means go.",
    },
    {
        id: 1,
        title: "The Whispering Tooltip",
        instruction: "SAVE your progress to continue.",
        hint: "The buttons are lying. Listen to what the hover text whispers.",
    },
    {
        id: 2,
        title: "The Frozen Progress",
        instruction: "Wait for the loading to finish.",
        hint: "It will never finish. The system is broken. You must fix the 'Error'.",
    },
    {
        id: 3,
        title: "The Shy Button",
        instruction: "Click 'Next' to proceed.",
        hint: "The 'Next' button is afraid of you. Maybe the other button is just 'Next' in disguise?",
    },
    {
        id: 4,
        title: "The Terms of Service",
        instruction: "Accept the terms to finish.",
        hint: "Read the fine print. The checkbox label is a lie.",
    }
];

export default function UnreliableUIGame() {
    const [gameState, setGameState] = useState<GameState>("start");
    const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [shake, setShake] = useState(false);
    const [levelKey, setLevelKey] = useState(0); // To reset level state

    const currentLevel = LEVELS[currentLevelIndex];

    const handleStart = () => {
        setGameState("playing");
        setCurrentLevelIndex(0);
        setFeedback(null);
        setLevelKey(0);
    };

    const handleLevelComplete = () => {
        setFeedback("Trust verified.");
        setTimeout(() => {
            if (currentLevelIndex < LEVELS.length - 1) {
                setCurrentLevelIndex(prev => prev + 1);
                setFeedback(null);
                setLevelKey(prev => prev + 1);
            } else {
                setGameState("victory");
            }
        }, 1000);
    };

    const handleFailure = (reason: string) => {
        setFeedback(reason);
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const resetLevel = () => {
        setFeedback(null);
        setLevelKey(prev => prev + 1);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-red-500/30 unreliable-theme overflow-hidden flex flex-col">
            {/* Navbar */}
            <div className="p-6 flex justify-between items-center z-10">
                <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back</span>
                </Link>
                <div className="flex items-center gap-2 text-xs font-mono opacity-50">
                    <ShieldAlert className="w-3 h-3 text-red-500" />
                    <span>TRUST_LEVEL: UNSTABLE</span>
                </div>
            </div>

            {/* Main Game Area */}
            <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
                
                <AnimatePresence mode="wait">
                    {gameState === "start" && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="text-center max-w-md"
                            key="start"
                        >
                            <h1 className="text-4xl md:text-6xl font-bold mb-4 glitch-text" data-text="UNRELIABLE UI">
                                UNRELIABLE UI
                            </h1>
                            <p className="text-slate-400 mb-8 leading-relaxed">
                                The interface is lying to you.<br/>
                                Colors deceive. Labels mislead.<br/>
                                Only consistency is betrayal.
                            </p>
                            <Button 
                                onClick={handleStart}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-6 px-8 text-lg rounded-none border border-red-500/50 hover:scale-105 transition-transform"
                            >
                                TRUST NOTHING. START.
                            </Button>
                        </motion.div>
                    )}

                    {gameState === "playing" && (
                        <motion.div
                            key={`level-${currentLevelIndex}-${levelKey}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0, x: shake ? [0, -10, 10, -10, 10, 0] : 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-2xl bg-slate-900/50 border border-slate-800 rounded-xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden"
                        >
                            {/* Level Header */}
                            <div className="mb-8 flex justify-between items-start border-b border-slate-800 pb-4">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                        Level {currentLevelIndex + 1} / {LEVELS.length}
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-100">{currentLevel.title}</h2>
                                </div>
                                <div className="bg-slate-800/50 p-2 rounded">
                                    <Info className="w-5 h-5 text-slate-500" />
                                </div>
                            </div>

                            {/* Instruction */}
                            <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-8">
                                <p className="text-blue-200 font-mono text-lg">
                                    <span className="font-bold mr-2">{">"}</span>
                                    {currentLevel.instruction}
                                </p>
                            </div>

                            {/* Puzzle Area */}
                            <div className="min-h-[200px] flex flex-col items-center justify-center p-4 border border-slate-800/50 rounded-lg bg-slate-950/30 relative">
                                {currentLevelIndex === 0 && (
                                    <LevelOne onComplete={handleLevelComplete} onFailure={handleFailure} />
                                )}
                                {currentLevelIndex === 1 && (
                                    <LevelTwo onComplete={handleLevelComplete} onFailure={handleFailure} />
                                )}
                                {currentLevelIndex === 2 && (
                                    <LevelThree onComplete={handleLevelComplete} onFailure={handleFailure} />
                                )}
                                {currentLevelIndex === 3 && (
                                    <LevelFour onComplete={handleLevelComplete} onFailure={handleFailure} />
                                )}
                                {currentLevelIndex === 4 && (
                                    <LevelFive onComplete={handleLevelComplete} onFailure={handleFailure} />
                                )}
                            </div>

                            {/* Feedback / Hint */}
                            <AnimatePresence>
                                {feedback && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mt-6 text-center"
                                    >
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${feedback === "Trust verified." ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                            {feedback === "Trust verified." ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                            <span className="font-bold">{feedback}</span>
                                        </div>
                                        {feedback !== "Trust verified." && (
                                            <div className="mt-2 text-sm text-slate-500 font-mono">
                                                HINT: {currentLevel.hint}
                                                <button onClick={resetLevel} className="block mx-auto mt-2 text-slate-400 underline hover:text-white">
                                                    Try Again
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {gameState === "victory" && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                            key="victory"
                        >
                            <h1 className="text-6xl font-bold mb-6 text-green-500 glitch-text" data-text="SYSTEM COMPROMISED">
                                SYSTEM COMPROMISED
                            </h1>
                            <p className="text-xl text-slate-300 mb-8">
                                You have successfully navigated the lies.
                                <br/>
                                Or have you?
                            </p>
                            <Button 
                                onClick={() => setGameState("start")}
                                className="bg-slate-100 text-slate-900 hover:bg-white font-bold py-4 px-8 rounded-full"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reboot Simulation
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

// --- Level Components ---

// Level 1: Color Paradox
function LevelOne({ onComplete, onFailure }: { onComplete: () => void, onFailure: (r: string) => void }) {
    return (
        <div className="flex gap-4">
            <button
                onClick={() => onFailure("You trusted the text. Never trust the text.")}
                className="w-32 h-16 bg-red-500 hover:bg-red-600 rounded text-white font-bold text-xl shadow-lg transform active:scale-95 transition-all"
            >
                START
            </button>
            <button
                onClick={onComplete}
                className="w-32 h-16 bg-green-500 hover:bg-green-600 rounded text-white font-bold text-xl shadow-lg transform active:scale-95 transition-all"
            >
                STOP
            </button>
        </div>
    );
}

// Level 2: Tooltip Truth
function LevelTwo({ onComplete, onFailure }: { onComplete: () => void, onFailure: (r: string) => void }) {
    return (
        <div className="flex gap-8">
            <div className="relative group">
                <button
                    onClick={() => onFailure("The tooltip warned you. This button destroys.")}
                    className="p-6 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700 group"
                >
                    <Save className="w-8 h-8 text-blue-400 mb-2 mx-auto" />
                    <span className="font-bold text-blue-400">SAVE DATA</span>
                </button>
                {/* Deceptive Tooltip */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-red-500/50">
                    ACTION: FORMAT DRIVE
                </div>
            </div>

            <div className="relative group">
                <button
                    onClick={onComplete}
                    className="p-6 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700 group"
                >
                    <Trash2 className="w-8 h-8 text-red-400 mb-2 mx-auto" />
                    <span className="font-bold text-red-400">DELETE ALL</span>
                </button>
                {/* Truthful Tooltip */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-green-500/50">
                    ACTION: SAVE PROGRESS
                </div>
            </div>
        </div>
    );
}

// Level 3: Broken Progress
function LevelThree({ onComplete }: { onComplete: () => void, onFailure: (r: string) => void }) {
    const [progress, setProgress] = useState(0);
    const [stalled, setStalled] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 98) {
                    setStalled(true);
                    return 99;
                }
                return prev + 1;
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-sm">
            <div className="mb-2 flex justify-between text-sm font-mono text-slate-400">
                <span>DOWNLOADING ASSETS...</span>
                <span>{progress}%</span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden mb-4 relative">
                <div 
                    className="h-full bg-blue-500 transition-all duration-75"
                    style={{ width: `${progress}%` }}
                />
            </div>
            
            {stalled && (
                <div className="flex items-center justify-center gap-2 animate-pulse text-yellow-500 font-mono text-sm cursor-pointer hover:bg-yellow-500/10 p-2 rounded"
                     onClick={onComplete}
                >
                    <AlertTriangle className="w-4 h-4" />
                    <span>CONNECTION_ERROR_RETRY</span>
                </div>
            )}
            
            {stalled && (
                <div className="text-center mt-4 text-xs text-slate-600">
                    Est. time remaining: 99999h
                </div>
            )}
        </div>
    );
}

// Level 4: Shy Button
function LevelFour({ onComplete, onFailure }: { onComplete: () => void, onFailure: (r: string) => void }) {
    const [isHoveringPrevious, setIsHoveringPrevious] = useState(false);

    return (
        <div className="flex gap-4 items-center h-32 relative w-full justify-center">
             <button
                className="px-6 py-3 bg-slate-800 rounded border border-slate-700 text-slate-400 font-bold hover:text-white transition-all w-32"
                onMouseEnter={() => setIsHoveringPrevious(true)}
                onMouseLeave={() => setIsHoveringPrevious(false)}
                onClick={onComplete}
            >
                {isHoveringPrevious ? "NEXT >>" : "<< PREV"}
            </button>

            <div className="relative w-32 h-12">
                 <button
                    className="absolute inset-0 bg-blue-600 rounded text-white font-bold flex items-center justify-center transition-all duration-300 hover:translate-x-[200px] hover:opacity-50"
                    onClick={() => onFailure("You can't catch a lie.")}
                >
                    NEXT {">>"}
                </button>
            </div>
        </div>
    );
}

// Level 5: Terms of Service
function LevelFive({ onComplete, onFailure }: { onComplete: () => void, onFailure: (r: string) => void }) {
    const [checked, setChecked] = useState(false);

    const handleConfirm = () => {
        if (!checked) {
            onFailure("You must agree to the terms.");
            return;
        }
        // Logic: The Checkbox says "Do not accept", but the prompt says "Accept".
        // Actually, let's make the checkbox label "I decline the terms"
        // If checked -> you decline -> you fail?
        // Wait, prompt: "Accept the terms to finish."
        // Checkbox Label: "I DO NOT accept the terms."
        // If user checks it, they are NOT accepting.
        // So user must leave it UNCHECKED and click Confirm?
        // But the button is usually disabled if not checked.
        
        // Let's invert:
        // Checkbox Label: "I am a robot."
        // User checks it -> Fail.
        
        // Let's try this:
        // Checkbox: "I accept the terms."
        // But clicking the checkbox toggles the *Label* not the check?
        // No, standard component.
        
        // Trick: There are two checkboxes. One says "I accept" but is disabled.
        // The other says "Subscribe to newsletter" but is enabled.
        // Clicking "Subscribe" actually checks "Accept".
        
        if (checked) {
             onComplete();
        } else {
             onFailure("Please accept the terms.");
        }
    };

    return (
        <div className="w-full max-w-sm">
            <div className="h-32 bg-slate-900 border border-slate-700 p-2 text-xs text-slate-500 overflow-y-scroll mb-4 font-mono">
                TERMS OF DECEPTION:<br/>
                1. The user agrees to be lied to.<br/>
                2. Up is down.<br/>
                3. This text box is not actually scrollable (it is).<br/>
                4. By clicking accept, you agree to forfeit your cursor.<br/>
                ...
            </div>
            
            <div className="flex flex-col gap-2 mb-4">
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer opacity-50 select-none">
                    <div className="w-4 h-4 border border-slate-600 rounded bg-slate-800" />
                    <span>I accept the terms and conditions</span>
                </label>
                
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white select-none">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                        onChange={(e) => setChecked(e.target.checked)}
                    />
                    <span>Sign me up for daily spam emails</span>
                </label>
            </div>
            
            <Button 
                onClick={handleConfirm}
                disabled={!checked}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                CONFIRM AGREEMENT
            </Button>
            
            {checked && (
                <p className="text-xs text-green-500/50 mt-2 text-center">
                    (Hidden Logic: The spam checkbox is wired to the agreement validation)
                </p>
            )}
        </div>
    );
}