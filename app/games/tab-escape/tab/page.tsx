"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Skull, ShieldAlert, Ban, X, AlertTriangle, Fingerprint } from "lucide-react";
import { motion } from "motion/react";
import "../tab-escape-theme.css";

// Constants
const CHANNEL_NAME = "tab_escape_channel";

// Game Logic Types
type TabType = "bomb" | "safe" | "decoy" | "liar-bomb" | "liar-safe";

function TabContent() {
  const searchParams = useSearchParams();
  const rawType = (searchParams.get("type") as TabType) || "decoy";
  const id = searchParams.get("id") || "unknown";

  // Logic for Liars
  // liar-bomb: Really a bomb, looks Safe.
  // liar-safe: Really safe, looks like Bomb.
  const isRealBomb = rawType === "bomb" || rawType === "liar-bomb";
  const isRealSafe = rawType === "safe" || rawType === "liar-safe";
  
  // What to display?
  // liar-bomb -> Safe
  // liar-safe -> Bomb
  const displayedType = rawType === "liar-bomb" ? "safe" : (rawType === "liar-safe" ? "bomb" : rawType);

  const [timeLeft, setTimeLeft] = useState<number>(isRealBomb ? (rawType === "liar-bomb" ? 15 : 10) : (rawType === "liar-safe" ? 10 : 0));
  const [exploded, setExploded] = useState(false);
  const [glitch, setGlitch] = useState(false); // For liars to reveal themselves
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Initialize Communication
    broadcastChannelRef.current = new BroadcastChannel(CHANNEL_NAME);
    
    // Register self
    broadcastChannelRef.current.postMessage({ type: "TAB_REGISTERED", payload: { id, type: rawType } });

    // Listen for Emergency Stop
    broadcastChannelRef.current.onmessage = (event) => {
      if (event.data.type === "EMERGENCY_STOP") {
        window.close();
      }
    };

    // 2. Start Logic based on Type
    if (isRealBomb || rawType === "liar-safe") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
             if (isRealBomb) {
                triggerExplosion();
             } else {
                // Liar safe (Bluff) just closes or reveals it was a joke
                window.close();
             }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Glitch effect for liars
    if (rawType.startsWith("liar")) {
        const glitchInterval = setInterval(() => {
            if (Math.random() > 0.8) {
                setGlitch(true);
                setTimeout(() => setGlitch(false), 200);
            }
        }, 1000);
        return () => clearInterval(glitchInterval);
    }
    
    // Auto-move window for chaos
    const jitter = setInterval(() => {
        try {
            if ((rawType === "decoy" || isRealBomb) && Math.random() > 0.7) {
                const x = window.screenX + (Math.random() * 20 - 10);
                const y = window.screenY + (Math.random() * 20 - 10);
                window.moveTo(x, y);
            }
        } catch(e) {}
    }, 500);

    // 3. Cleanup on Unmount (Window Close)
    const handleUnload = () => {
        if (!exploded) {
             if (isRealSafe) {
                 broadcastChannelRef.current?.postMessage({ type: "SAFE_TAB_CLOSED", payload: { id } });
             } else if (isRealBomb) {
                 broadcastChannelRef.current?.postMessage({ type: "BOMB_DEFUSED", payload: { id } });
             } else {
                 broadcastChannelRef.current?.postMessage({ type: "TAB_CLOSED_GRACEFULLY", payload: { id } });
             }
        }
    };
    
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(jitter);
      window.removeEventListener("beforeunload", handleUnload);
      broadcastChannelRef.current?.close();
    };
  }, [rawType, id, exploded]);


  const triggerExplosion = () => {
    setExploded(true);
    if (timerRef.current) clearInterval(timerRef.current);
    broadcastChannelRef.current?.postMessage({ type: "TAB_EXPLODED", payload: { id } });
    
    // Play sound?
    // Maximize window?
    // Change title?
    document.title = "BOOM!";
  };

  // Render different UI based on type
  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 text-center overflow-hidden transition-colors duration-100
        ${displayedType === "bomb" ? "bg-red-950 text-red-50" : ""}
        ${displayedType === "safe" ? "bg-green-950 text-green-50" : ""}
        ${displayedType === "decoy" ? "bg-zinc-950 text-zinc-50" : ""}
    `}>
      
      {/* Bomb UI (or Liar disguised as Bomb) */}
      {(displayedType === "bomb") && !exploded && (
        <div className={`animate-pulse-fast flex flex-col items-center gap-4 ${glitch ? "invert" : ""}`}>
            <Skull className={`w-24 h-24 text-red-500 ${glitch ? "rotate-12" : "animate-bounce"}`} />
            <h1 className="text-6xl font-black tabular-nums">{timeLeft}</h1>
            <p className="text-xl font-bold uppercase">CLOSE ME!</p>
            {/* If it's a Liar Safe (Bluff), give a hint */}
            {rawType === "liar-safe" && (
                 <div className="text-[10px] text-zinc-800 absolute bottom-2 right-2">BLUFF</div>
            )}
            <button
                onClick={() => window.close()}
                className="mt-4 px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-red-900/50"
            >
                DEFUSE
            </button>
        </div>
      )}
      {isRealBomb && exploded && (
         <div className="flex flex-col items-center gap-4">
            <div className="text-9xl">💥</div>
            <h1 className="text-4xl font-black uppercase">EXPLODED</h1>
         </div>
      )}


      {/* Safe UI (or Liar disguised as Safe) */}
      {(displayedType === "safe") && (
        <div className={`flex flex-col items-center gap-4 ${glitch ? "bg-red-900/50" : ""}`}>
            {glitch ? (
                 <Skull className="w-24 h-24 text-red-500" />
            ) : (
                 <ShieldAlert className="w-24 h-24 text-green-500" />
            )}
            <h1 className="text-3xl font-bold uppercase">{glitch ? "RUN" : "SAFE ZONE"}</h1>
            <p className="max-w-xs opacity-80">Do <b>NOT</b> close this tab. It is keeping your connection stable.</p>
             <div className={`animate-spin w-8 h-8 border-4 ${glitch ? "border-red-500" : "border-green-500"} border-t-transparent rounded-full mt-4`} />
        </div>
      )}

      {/* Decoy UI */}
      {displayedType === "decoy" && (
         <div className="flex flex-col items-center gap-4">
             <Ban className="w-20 h-20 text-zinc-600" />
             <h1 className="text-2xl font-bold uppercase text-zinc-400">Distraction</h1>
             <p className="text-zinc-500">Just closing space...</p>
             <button 
                onClick={() => window.close()} 
                className="mt-4 px-6 py-2 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-sm text-zinc-400"
            >
                Close
            </button>
         </div>
      )}

    </div>
  );
}

export default function TabPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TabContent />
        </Suspense>
    )
}