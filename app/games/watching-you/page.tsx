"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Eye, EyeOff, AlertTriangle, Terminal, Lock, Unlock, Activity } from "lucide-react";
import "./game-theme.css";

// Game Phases
type GamePhase = "INTRO" | "OBSERVATION" | "STILLNESS" | "FOCUS" | "OBEDIENCE" | "ANALYSIS" | "ENDING";

export default function WatchingYouGame() {
    const [phase, setPhase] = useState<GamePhase>("INTRO");
    const [message, setMessage] = useState("I am initializing...");
    const [subMessage, setSubMessage] = useState("");
    const [isWatching, setIsWatching] = useState(false);
    const [eyeState, setEyeState] = useState<"normal" | "narrow" | "wide" | "blink" | "red">("normal");
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [windowFocused, setWindowFocused] = useState(true);
    const [violationCount, setViolationCount] = useState(0);
    const [timeInPhase, setTimeInPhase] = useState(0);
    
    // Refs for game loop and tracking
    const mouseHistory = useRef<{x: number, y: number, t: number}[]>([]);
    const lastMouseMove = useRef(Date.now());
    const phaseStartRef = useRef(Date.now());
    const interactionCount = useRef(0);
    const stillnessTimer = useRef<NodeJS.Timeout | null>(null);

    // --- Audio (simulated with text/visuals for now, maybe add simple oscillator later if requested, but sticking to visual cues) ---

    // --- Game Loop / Timer ---
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - phaseStartRef.current;
            setTimeInPhase(elapsed);

            // Phase specific logic checks
            if (phase === "OBSERVATION" && elapsed > 5000) {
                // If they move too much
                const recentMoves = mouseHistory.current.filter(m => now - m.t < 1000);
                if (recentMoves.length > 50) {
                    setMessage("You are erratic.");
                    setEyeState("narrow");
                } else if (recentMoves.length < 5) {
                    setMessage("Are you still there?");
                    setEyeState("wide");
                } else {
                    setMessage("I see you.");
                    setEyeState("normal");
                }
            }

            if (phase === "STILLNESS") {
                // Handled in mouse move listener mostly
            }

        }, 100);

        return () => clearInterval(interval);
    }, [phase]);

    // --- Event Listeners ---

    // Mouse Tracking
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            setCursorPos({ x: e.clientX, y: e.clientY });
            mouseHistory.current.push({ x: e.clientX, y: e.clientY, t: now });
            lastMouseMove.current = now;
            
            // Clean history
            if (mouseHistory.current.length > 100) mouseHistory.current.shift();

            if (phase === "STILLNESS") {
                 // Fail stillness
                 setViolationCount(v => v + 1);
                 setEyeState("red");
                 setMessage("I SAID DO NOT MOVE.");
                 
                 // Reset stillness timer
                 if (stillnessTimer.current) clearTimeout(stillnessTimer.current);
                 startStillnessTimer();
            }

            if (phase === "OBEDIENCE") {
                 // If instructed to stop, etc.
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [phase]);

    // Focus/Blur Tracking
    useEffect(() => {
        const handleFocus = () => {
            setWindowFocused(true);
            if (phase === "FOCUS") {
                setMessage("Good. You came back.");
                setEyeState("normal");
                setTimeout(() => advancePhase("OBEDIENCE"), 2000);
            } else if (phase !== "INTRO" && phase !== "ENDING") {
                 setMessage("Don't leave me.");
                 setEyeState("narrow");
            }
        };

        const handleBlur = () => {
            setWindowFocused(false);
            if (phase === "FOCUS") {
                // This is expected in focus phase initially? No, we want them to stay or leave? 
                // Let's make FOCUS phase about keeping focus.
                setMessage("WHERE ARE YOU GOING?");
                setEyeState("red");
                setViolationCount(v => v + 1);
            } else if (phase !== "INTRO" && phase !== "ENDING") {
                setMessage("I know you switched tabs.");
                setSubMessage("I can wait.");
                setEyeState("red");
            }
        };

        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);
        return () => {
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
        };
    }, [phase]);

    // Visibility Change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                document.title = "I'm still here.";
            } else {
                document.title = "The Game Is Watching You";
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    // --- Phase Management ---

    const advancePhase = (next: GamePhase) => {
        setPhase(next);
        phaseStartRef.current = Date.now();
        setSubMessage("");
        setEyeState("normal");

        switch (next) {
            case "OBSERVATION":
                setMessage("I am calibrating.");
                setSubMessage("Move your cursor. Let me see how you move.");
                setTimeout(() => {
                    setMessage("Interesting...");
                    setTimeout(() => advancePhase("STILLNESS"), 8000);
                }, 5000);
                break;
            case "STILLNESS":
                setMessage("Stop.");
                setSubMessage("Do not move your mouse.");
                startStillnessTimer();
                break;
            case "FOCUS":
                setMessage("Look at me.");
                setSubMessage("Do not look away. Do not switch tabs.");
                setTimeout(() => {
                    if (windowFocused) {
                        setMessage("Your attention span is adequate.");
                        setTimeout(() => advancePhase("OBEDIENCE"), 3000);
                    }
                }, 6000);
                break;
            case "OBEDIENCE":
                setMessage("Click the button.");
                break;
            case "ANALYSIS":
                setMessage("Processing your profile...");
                performAnalysis();
                break;
            case "ENDING":
                setMessage("I have seen enough.");
                setSubMessage("You may go now. But I will remember.");
                break;
        }
    };

    const startStillnessTimer = () => {
        if (stillnessTimer.current) clearTimeout(stillnessTimer.current);
        setEyeState("normal");
        
        stillnessTimer.current = setTimeout(() => {
            if (phase === "STILLNESS") {
                setMessage("Good.");
                setSubMessage("You can control yourself.");
                setTimeout(() => advancePhase("FOCUS"), 2000);
            }
        }, 4000); // 4 seconds of stillness required
    };

    const performAnalysis = () => {
        const traits: string[] = [];
        if (violationCount > 5) traits.push("Rebellious");
        else if (violationCount === 0) traits.push("Obedient");
        else traits.push("Unpredictable");
        
        // Mock processing steps
        let step = 0;
        const interval = setInterval(() => {
            step++;
            if (step === 1) setSubMessage("Analyzing cursor micro-tremors...");
            if (step === 2) setSubMessage("Checking browser history access permissions...");
            if (step === 3) setSubMessage("Uploading biometric data...");
            if (step === 4) {
                 clearInterval(interval);
                 setSubMessage(`Result: ${traits.join(", ")}.`);
                 setTimeout(() => advancePhase("ENDING"), 4000);
            }
        }, 1500);
    };

    // --- Interactions ---
    
    const handleStart = () => {
        setIsWatching(true);
        advancePhase("OBSERVATION");
    };

    const handleObedienceClick = () => {
        if (Math.random() > 0.5) {
            setMessage("I didn't say click NOW.");
            setEyeState("red");
            setSubMessage("Wait.");
            setTimeout(() => {
                 setMessage("Okay, click now.");
                 setEyeState("normal");
            }, 2000);
        } else {
            advancePhase("ANALYSIS");
        }
    };

    // Calculate Eye Transform based on cursor
    const eyeRef = useRef<HTMLDivElement>(null);
    const [eyeTransform, setEyeTransform] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!eyeRef.current) return;
        const bounds = eyeRef.current.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        
        const maxMove = 30; // pixels
        const dx = cursorPos.x - centerX;
        const dy = cursorPos.y - centerY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const moveX = (dx / (window.innerWidth/2)) * maxMove;
        const moveY = (dy / (window.innerHeight/2)) * maxMove;

        setEyeTransform({ x: moveX, y: moveY });

    }, [cursorPos]);


    return (
        <div className={`watching-you-container w-full h-screen flex flex-col items-center justify-center relative ${eyeState === "red" ? "red-mode" : ""}`}>
            
            {/* Nav */}
            <div className="absolute top-0 left-0 p-6 z-50">
                 <Link href="/" className="text-white/50 hover:text-white flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                 </Link>
            </div>

            {/* Custom Cursor Element (optional, maybe just hide real cursor and use this?) */}
            {/* For now we use CSS cursor: none and standard elements, maybe add a follower later if needed */}

            <main className="flex flex-col items-center justify-center z-10 max-w-2xl w-full px-6 text-center">
                
                {/* The Eye */}
                <div 
                    ref={eyeRef}
                    className={`eye-container mb-12 ${eyeState}`}
                >
                    <div className="eye-sclera">
                        <div className="lid-top"></div>
                        <div 
                            className="eye-iris"
                            style={{ 
                                transform: `translate(-50%, -50%) translate(${eyeTransform.x}px, ${eyeTransform.y}px)` 
                            }}
                        >
                            <div className="eye-pupil"></div>
                        </div>
                        <div className="lid-bottom"></div>
                    </div>
                </div>

                {/* Text Output */}
                <div className="h-32 flex flex-col items-center justify-center gap-4">
                    <AnimatePresence mode="wait">
                        <motion.h1 
                            key={message}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`text-2xl md:text-4xl font-bold tracking-widest uppercase ${eyeState === 'red' ? 'glitch-text text-red-500' : ''}`}
                            data-text={message}
                        >
                            {message}
                        </motion.h1>
                    </AnimatePresence>
                    
                    <AnimatePresence mode="wait">
                        {subMessage && (
                            <motion.p 
                                key={subMessage}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-white/60 font-mono text-sm md:text-base"
                            >
                                {subMessage}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                {/* Interaction Area */}
                <div className="mt-12 h-24 flex items-center justify-center">
                    {phase === "INTRO" && (
                        <button 
                            onClick={handleStart}
                            className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors rounded-none border border-white"
                        >
                            Begin Session
                        </button>
                    )}

                    {phase === "OBEDIENCE" && (
                        <button 
                            onClick={handleObedienceClick}
                            className="px-8 py-3 bg-transparent border border-white text-white font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                        >
                            Confirm
                        </button>
                    )}
                    
                    {phase === "ENDING" && (
                        <Link href="/">
                             <button className="px-8 py-3 bg-red-900/20 border border-red-500/50 text-red-400 font-bold uppercase tracking-widest hover:bg-red-900/40 transition-colors">
                                Leave
                            </button>
                        </Link>
                    )}
                </div>

                {/* Status Indicators (Fake Debug) */}
                <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2 text-[10px] text-white/20 font-mono">
                    <div className="flex items-center gap-2">
                        <span>CAMERA: {isWatching ? "ACTIVE" : "OFFLINE"}</span>
                        <div className={`w-2 h-2 rounded-full ${isWatching ? "bg-red-500 animate-pulse" : "bg-gray-800"}`}></div>
                    </div>
                    <div>TRUST_SCORE: {Math.max(0, 100 - violationCount * 10)}%</div>
                    <div>FOCUS: {windowFocused ? "LOCKED" : "LOST"}</div>
                </div>

            </main>

            {/* Overlay for tab switching punishment */}
            {!windowFocused && phase !== "INTRO" && phase !== "ENDING" && (
                <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                    <div className="text-center">
                        <Eye className="w-24 h-24 text-red-600 mx-auto mb-6 animate-pulse" />
                        <h2 className="text-4xl font-bold text-red-500 uppercase tracking-widest mb-4">I saw that.</h2>
                        <p className="text-white/50">Come back.</p>
                    </div>
                </div>
            )}
        </div>
    );
}