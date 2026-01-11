"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import "./button-theme.css";

// --- Types ---
type Phase = 
  | "INTRO" 
  | "BASELINE" 
  | "ANALYSIS"
  | "PRECISION"   // New: Small, specific targets
  | "DECISION"    // New: Choices
  | "ENDURANCE"   // New: Rapid fire
  | "CONFUSION"   // New: Decoys
  | "PROVOCATION" 
  | "SILENCE" 
  | "JUDGMENT" 
  | "ENDING";

interface Metrics {
  clickCount: number;
  clickTimes: number[]; // timestamps
  clickPositions: { x: number; y: number }[]; // relative to button center
  hesitations: number[]; // time between prompt and click
  spamCount: number; // rapid clicks
  mistakes: number; // clicked decoys or missed
}

interface ButtonInstance {
  id: string;
  text: string;
  x: number;
  y: number;
  scale: number;
  isMoving: boolean;
  isHidden: boolean;
  color: string;
  type: "normal" | "decoy" | "danger" | "golden";
  zIndex?: number;
}

// --- Scripts ---
const SCRIPT = {
  INTRO: [
    "Click the button.",
    "Again.",
    "Once more.",
    "Okay.",
  ],
  ANALYSIS_FAST: [
    "You are impatient.",
    "Do you always rush into things?",
    "Slow down.",
  ],
  ANALYSIS_SLOW: [
    "Hesitant.",
    "Are you afraid of making a mistake?",
    "It's just a button.",
  ],
  PRECISION: [
    "Precision is key.",
    "Smaller.",
    "Don't miss.",
    "Focus.",
  ],
  DECISION: [
    "Choice is an illusion.",
    "Which one matters?",
    "Choose carefully.",
  ],
  ENDURANCE: [
    "Prove your worth.",
    "Faster.",
    "Don't stop.",
    "Keep going.",
  ],
  CONFUSION: [
    "Where is it?",
    "Are you sure?",
    "Lost?",
    "Eyes open.",
  ],
  PROVOCATION: [
    "Catch me.",
    "Too slow.",
    "Why are you still clicking?",
    "I told you to stop.",
    "Don't click.",
  ],
  JUDGMENT: {
    ROBOT: "You click like a machine. Efficient. Soul-less.",
    REBEL: "You have a problem with authority. You clicked when I said don't.",
    CHAOS: "You are a chaotic element. Unpredictable. Dangerous.",
    ZEN: "You are patient. Perhaps too patient. Wake up.",
    DESPERATE: "You seek validation through action. It won't help.",
    PERFECTIONIST: "Exact. Precise. Boring.",
  }
};

export default function TheButtonGame() {
  // --- State ---
  const [phase, setPhase] = useState<Phase>("INTRO");
  const [dialogue, setDialogue] = useState<string>("Initialize.");
  const [subDialogue, setSubDialogue] = useState<string>("");
  
  const [buttons, setButtons] = useState<ButtonInstance[]>([{
    id: "main",
    text: "CLICK",
    x: 0,
    y: 0,
    scale: 1,
    isMoving: false,
    isHidden: false,
    color: "#e0e0e0",
    type: "normal"
  }]);

  const [isGameOver, setIsGameOver] = useState(false);
  const [finalVerdict, setFinalVerdict] = useState("");

  // Refs for logic (avoid re-renders)
  const metricsRef = useRef<Metrics>({
    clickCount: 0,
    clickTimes: [],
    clickPositions: [],
    hesitations: [],
    spamCount: 0,
    mistakes: 0,
  });

  const lastClickTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const phaseStepRef = useRef<number>(0); // Track progress within a phase

  // --- Helpers ---
  const getRandomPos = (scale = 0.6) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    return {
      x: (Math.random() - 0.5) * w * scale,
      y: (Math.random() - 0.5) * h * scale,
    };
  };

  const analyzePlayer = () => {
    const m = metricsRef.current;
    const avgDelay = m.clickTimes.reduce((acc, t, i) => {
        if (i === 0) return 0;
        return acc + (t - m.clickTimes[i-1]);
    }, 0) / (m.clickTimes.length - 1 || 1);

    const centerDeviations = m.clickPositions.map(p => Math.sqrt(p.x*p.x + p.y*p.y));
    const avgDeviation = centerDeviations.reduce((a, b) => a + b, 0) / (centerDeviations.length || 1);

    // Profile Logic
    if (m.spamCount > 15) return "DESPERATE";
    if (m.mistakes > 5) return "CHAOS";
    if (avgDeviation < 15 && avgDelay > 300) return "PERFECTIONIST";
    if (avgDelay < 250) return "ROBOT";
    if (avgDelay > 1200) return "ZEN";
    
    return "ZEN"; 
  };

  // --- Core Loop ---
  const handleInteraction = (id: string, e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (isGameOver) return;
    
    const now = Date.now();
    const m = metricsRef.current;
    const clickedButton = buttons.find(b => b.id === id);
    
    if (!clickedButton) return;

    // Handle Decoys
    if (clickedButton.type === "decoy") {
        m.mistakes++;
        setDialogue("Wrong one.");
        // Shake effect or penalty
        return;
    }

    if (clickedButton.type === "danger") {
        m.mistakes += 5;
        setDialogue("Careful.");
        setButtons(prev => prev.filter(b => b.id !== id));
        return;
    }

    if (clickedButton.type === "golden") {
        m.clickCount += 5; // Bonus
        setDialogue("Lucky.");
        phaseStepRef.current += 2; // Speed up progress
    }

    // Track click
    m.clickCount++;
    m.clickTimes.push(now);
    
    // Track Spam
    if (now - lastClickTimeRef.current < 150) {
      m.spamCount++;
    }
    lastClickTimeRef.current = now;

    // Track Position (rough approximation if button moves, strictly relative to event target)
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    m.clickPositions.push({
        x: clientX - centerX,
        y: clientY - centerY
    });

    phaseStepRef.current++;
    updateGameFlow();
  };

  const updateGameFlow = () => {
      const m = metricsRef.current;
      const step = phaseStepRef.current;

      switch (phase) {
        case "INTRO":
            if (step < 4) {
                 setDialogue(SCRIPT.INTRO[step] || "...");
            } else {
                 setPhase("BASELINE");
                 phaseStepRef.current = 0;
                 setDialogue("Interesting.");
            }
            break;

        case "BASELINE":
            if (step < 6) {
                setButtons(prev => [{ ...prev[0], text: "..." }]);
            } else {
                setPhase("ANALYSIS");
                phaseStepRef.current = 0;
                
                const avgDelay = m.clickTimes.slice(-5).reduce((a,b,i,arr) => i===0?0:a+(b-arr[i-1]), 0) / 4;
                if (avgDelay < 300) {
                    setDialogue(SCRIPT.ANALYSIS_FAST[0]);
                } else {
                    setDialogue(SCRIPT.ANALYSIS_SLOW[0]);
                }
                setButtons(prev => [{ ...prev[0], text: "PROCEED" }]);
            }
            break;

        case "ANALYSIS":
            // Move to Precision
            setPhase("PRECISION");
            phaseStepRef.current = 0;
            setDialogue("Precision.");
            setButtons(prev => [{ ...prev[0], text: "AIM", scale: 0.8 }]);
            break;

        case "PRECISION":
             if (step < 8) {
                 const pos = getRandomPos(0.5);
                 setButtons([{
                     id: "main",
                     text: "+",
                     x: pos.x,
                     y: pos.y,
                     scale: Math.max(0.3, 1 - (step * 0.1)), // Shrink
                     isMoving: false,
                     isHidden: false,
                     color: "#e0e0e0",
                     type: "normal"
                 }]);
                 setDialogue(SCRIPT.PRECISION[step % SCRIPT.PRECISION.length]);
             } else {
                 setPhase("DECISION");
                 phaseStepRef.current = 0;
                 setDialogue("Choose.");
                 setButtons([
                     { id: "opt1", text: "THIS", x: -100, y: 0, scale: 1, isMoving: false, isHidden: false, color: "#e0e0e0", type: "normal" },
                     { id: "opt2", text: "THAT", x: 100, y: 0, scale: 1, isMoving: false, isHidden: false, color: "#e0e0e0", type: "normal" }
                 ]);
             }
             break;

        case "DECISION":
             // They picked one. Doesn't matter which.
             if (step < 4) {
                 setButtons([
                     { id: "opt1", text: "YES", x: -100, y: 0, scale: 1, isMoving: false, isHidden: false, color: "#e0e0e0", type: "normal" },
                     { id: "opt2", text: "NO", x: 100, y: 0, scale: 1, isMoving: false, isHidden: false, color: "#e0e0e0", type: "normal" }
                 ]);
                 setDialogue(SCRIPT.DECISION[step % SCRIPT.DECISION.length]);
             } else {
                 setPhase("ENDURANCE");
                 phaseStepRef.current = 0;
                 setDialogue("Stamina check.");
                 setButtons([{ id: "main", text: "CLICK", x: 0, y: 0, scale: 1, isMoving: false, isHidden: false, color: "#e0e0e0", type: "normal" }]);
             }
             break;

        case "ENDURANCE":
             // Need 15 clicks fast
             if (step < 15) {
                 setDialogue(`More. ${15 - step}`);
                 setButtons(prev => [{ ...prev[0], scale: 1 + (step * 0.05) }]); // Grow
             } else {
                 setPhase("CONFUSION");
                 phaseStepRef.current = 0;
                 setDialogue("Find me.");
                 spawnDecoys();
             }
             break;

        case "CONFUSION":
             if (step < 5) {
                 spawnDecoys();
             } else {
                 setPhase("PROVOCATION");
                 phaseStepRef.current = 0;
                 setDialogue("Enough.");
                 setButtons([{ id: "main", text: "CATCH", x: 0, y: 0, scale: 1, isMoving: false, isHidden: false, color: "#e0e0e0", type: "normal" }]);
             }
             break;

        case "PROVOCATION":
           if (step < 15) {
               const pos = getRandomPos();
               const rng = Math.random();
               
               const newButtons: ButtonInstance[] = [];

               // Main elusive button
               newButtons.push({
                   id: "main",
                   text: step % 2 === 0 ? "CATCH" : "FAST",
                   x: pos.x,
                   y: pos.y,
                   scale: 1,
                   isMoving: true,
                   isHidden: false,
                   color: "#e0e0e0",
                   type: "normal",
                   zIndex: 20
               });

               // Chance to spawn Danger button
               if (rng > 0.7) {
                   const dangerPos = getRandomPos(0.8);
                   newButtons.push({
                       id: `danger-${step}`,
                       text: "X",
                       x: dangerPos.x,
                       y: dangerPos.y,
                       scale: 0.8,
                       isMoving: false,
                       isHidden: false,
                       color: "#ff0000",
                       type: "danger",
                       zIndex: 10
                   });
               }

               // Rare chance for Golden button
               if (rng < 0.1) {
                   const goldPos = getRandomPos(0.8);
                   newButtons.push({
                       id: `gold-${step}`,
                       text: "BONUS",
                       x: goldPos.x,
                       y: goldPos.y,
                       scale: 0.6,
                       isMoving: true,
                       isHidden: false,
                       color: "#ffd700",
                       type: "golden",
                       zIndex: 30
                   });
               }

               setButtons(newButtons);
               setDialogue(SCRIPT.PROVOCATION[Math.floor(Math.random() * SCRIPT.PROVOCATION.length)]);
           } else {
               // The Obedience Test
               setPhase("SILENCE");
               setButtons([{ id: "main", text: "DO NOT CLICK", x: 0, y: 0, scale: 1.2, isMoving: false, isHidden: false, color: "#ff3333", type: "normal" }]);
               setDialogue("Don't click this button.");
               setSubDialogue("I am watching you.");
           }
           break;

        case "SILENCE":
            // If they clicked during "DO NOT CLICK"
            setPhase("JUDGMENT");
            metricsRef.current.spamCount += 50; // Heavy penalty
            setDialogue("You failed to listen.");
            setTimeout(() => triggerEnding(), 1000);
            break;
      }
  };

  const spawnDecoys = () => {
      const realPos = getRandomPos(0.7);
      const newButtons: ButtonInstance[] = [];
      
      // Real button
      newButtons.push({
          id: "real",
          text: "ME",
          x: realPos.x,
          y: realPos.y,
          scale: 0.8,
          isMoving: false,
          isHidden: false,
          color: "#e0e0e0",
          type: "normal",
          zIndex: 10
      });

      // Decoys
      for (let i = 0; i < 4; i++) {
          const decoyPos = getRandomPos(0.7);
          newButtons.push({
              id: `decoy-${i}`,
              text: "ME",
              x: decoyPos.x,
              y: decoyPos.y,
              scale: 0.8,
              isMoving: false,
              isHidden: false,
              color: "#666",
              type: "decoy",
              zIndex: 1
          });
      }
      setButtons(newButtons.sort(() => Math.random() - 0.5));
  };

  // Passive Timer for "SILENCE" phase
  useEffect(() => {
      let timeout: NodeJS.Timeout;
      if (phase === "SILENCE") {
          timeout = setTimeout(() => {
              // They successfully didn't click
              setPhase("JUDGMENT");
              setDialogue("Good. You can listen.");
              setTimeout(() => triggerEnding(), 1000);
          }, 4000);
      }
      return () => clearTimeout(timeout);
  }, [phase]);

  const triggerEnding = (forcedProfile?: string) => {
      const profile = forcedProfile || analyzePlayer();
      // @ts-ignore
      const verdict = SCRIPT.JUDGMENT[profile] || SCRIPT.JUDGMENT.ZEN;
      
      setFinalVerdict(verdict);
      setIsGameOver(true);
      setButtons([]);
  };

  const restartGame = () => {
      metricsRef.current = {
        clickCount: 0,
        clickTimes: [],
        clickPositions: [],
        hesitations: [],
        spamCount: 0,
        mistakes: 0,
      };
      setPhase("INTRO");
      setDialogue("Initialize.");
      setSubDialogue("");
      phaseStepRef.current = 0;
      setIsGameOver(false);
      setButtons([{
        id: "main",
        text: "CLICK",
        x: 0,
        y: 0,
        scale: 1,
        isMoving: false,
        isHidden: false,
        color: "#e0e0e0",
        type: "normal"
      }]);
  };

  return (
    <div className="the-button-theme min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] font-mono overflow-hidden select-none flex flex-col items-center justify-center relative">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50">
        <Link href="/" className="flex items-center gap-2 text-xs font-bold opacity-30 hover:opacity-100 transition-opacity uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="text-xs opacity-20 tracking-widest">
            SUB: #{Math.floor(Math.random() * 9999)}
        </div>
      </div>

      {/* Main Container */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 flex items-center justify-center">
        
        {/* Dialogue Layer */}
        <div className="absolute top-1/4 w-full text-center pointer-events-none z-10 px-4">
            <h1 className={`text-2xl md:text-4xl font-light tracking-wider transition-all duration-500 ${phase === 'JUDGMENT' ? 'glitch-text' : ''}`} data-text={dialogue}>
                {dialogue}
            </h1>
            {subDialogue && (
                <p className="mt-4 text-sm opacity-50 animate-pulse-slow">
                    {subDialogue}
                </p>
            )}
        </div>

        {/* Buttons */}
        {!isGameOver && buttons.map(btn => (
             <button
                key={btn.id}
                onClick={(e) => handleInteraction(btn.id, e)}
                style={{
                    transform: `translate(${btn.x}px, ${btn.y}px) scale(${btn.scale})`,
                    color: btn.color,
                    borderColor: btn.color,
                    zIndex: btn.zIndex || 20,
                    position: 'absolute' // Ensure absolute positioning for free movement
                }}
                className={`
                    px-12 py-6 
                    bg-transparent border border-current 
                    uppercase tracking-[0.3em] font-bold text-sm
                    hover:bg-white/5 active:bg-white/10 active:scale-95
                    transition-all ease-out
                    ${btn.isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                    ${btn.isMoving || phase === 'PRECISION' ? 'duration-100' : 'duration-300'}
                `}
             >
                {btn.text}
             </button>
        ))}

        {/* Ending Screen */}
        {isGameOver && (
            <div className="z-30 flex flex-col items-center gap-8 max-w-lg text-center px-6 animate-in fade-in zoom-in duration-1000">
                <div className="space-y-4">
                    <div className="w-16 h-16 border border-[var(--text-color)] rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
                        <div className="w-1 h-1 bg-current rounded-full" />
                    </div>
                    <p className="text-sm uppercase tracking-widest opacity-50">Analysis Complete</p>
                    <p className="text-xl md:text-2xl leading-relaxed font-light">
                        "{finalVerdict}"
                    </p>
                </div>

                <div className="h-px w-24 bg-white/10 my-4" />

                <div className="grid grid-cols-2 gap-8 text-xs opacity-50">
                    <div>
                        <span className="block mb-1">Response Time</span>
                        <span className="font-bold text-white">{Math.round(metricsRef.current.clickTimes.reduce((a,b,i,arr)=>i===0?0:a+(b-arr[i-1]),0)/(metricsRef.current.clickTimes.length||1))}ms</span>
                    </div>
                    <div>
                        <span className="block mb-1">Stability</span>
                        <span className="font-bold text-white">{metricsRef.current.mistakes > 0 ? "COMPROMISED" : "STABLE"}</span>
                    </div>
                </div>

                <button 
                    onClick={restartGame}
                    className="mt-12 group flex items-center gap-2 text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                    <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                    Re-Initialize
                </button>
            </div>
        )}

      </div>
    </div>
  );
}