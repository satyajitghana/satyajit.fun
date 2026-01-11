"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";
import LiquidEther from "@/components/react-bits/LiquidEther";
import { useEntropyStore } from "./store";

type Archetype = "The Observer" | "The Catalyst" | "The Ghost" | "The Architect";

interface EndingData {
  archetype: Archetype;
  message: string;
  subtext: string;
}

export default function EntropyGame() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showEnding, setShowEnding] = useState(false);
  const [endingData, setEndingData] = useState<EndingData | null>(null);

  // Store access
  const {
    initSession,
    registerMovement,
    registerClick,
    updateState,
    fluidConfig,
    startTime,
    chaosScore,
    stillnessScore,
    totalDistance,
    clickCount
  } = useEntropyStore();

  // Initialization & Loop
  useEffect(() => {
    initSession();

    let animationFrameId: number;
    const loop = () => {
      updateState();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Interaction Handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    // Simple velocity approximation
    const velocity = Math.sqrt(e.movementX ** 2 + e.movementY ** 2);
    registerMovement(velocity, velocity);
  };

  const handleClick = () => {
    registerClick();
  };

  // Exit / Ending Logic
  const handleExit = () => {
    const duration = (Date.now() - startTime) / 1000;
    let archetype: Archetype = "The Architect";
    let message = "";
    let subtext = "";

    // Determine Archetype
    if (duration < 15) {
      archetype = "The Ghost";
      message = "You were barely here.";
      subtext = "A whisper in a hurricane.";
    } else if (chaosScore > 0.5 || totalDistance > 50000) {
      archetype = "The Catalyst";
      message = "You sought to break the silence.";
      subtext = "You are the fire that burns the world.";
    } else if (stillnessScore > 0.5) {
      archetype = "The Observer";
      message = "You waited for the storm to pass.";
      subtext = "You found peace in the void.";
    } else {
      archetype = "The Architect";
      message = "You tried to build meaning where there was none.";
      subtext = "A noble, futile effort.";
    }

    setEndingData({ archetype, message, subtext });
    setShowEnding(true);
  };

  const confirmExit = () => {
    router.push("/");
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-black text-white cursor-none"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* Background Simulation */}
      <div className="absolute inset-0 z-0">
        <LiquidEther 
          {...fluidConfig}
          autoDemo={false} 
        />
      </div>

      {/* UI Layer */}
      <div className="absolute top-6 left-6 z-50 pointer-events-auto">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleExit();
          }}
          className="group flex items-center gap-2 text-white/50 hover:text-white transition-colors duration-500"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm tracking-widest uppercase font-light opacity-0 group-hover:opacity-100 transition-opacity">
            Leave
          </span>
        </button>
      </div>

      {/* Stats Debug (Hidden in production, useful for tuning) 
      <div className="absolute bottom-4 left-4 z-50 text-[10px] font-mono text-white/30 pointer-events-none">
        <p>Chaos: {chaosScore.toFixed(2)}</p>
        <p>Stillness: {stillnessScore.toFixed(2)}</p>
      </div>
      */}

      {/* Ending Overlay */}
      <AnimatePresence>
        {showEnding && endingData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-md w-full p-8 text-center space-y-8">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <h2 className="text-sm font-bold tracking-[0.2em] text-white/40 uppercase mb-2">
                  Archetype
                </h2>
                <h1 className="text-4xl md:text-5xl font-light text-white tracking-wide">
                  {endingData.archetype}
                </h1>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="space-y-2"
              >
                <p className="text-xl text-white/90 font-serif italic">
                  "{endingData.message}"
                </p>
                <p className="text-sm text-white/50">
                  {endingData.subtext}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="pt-12"
              >
                <button
                  onClick={confirmExit}
                  className="px-8 py-3 border border-white/20 rounded-full hover:bg-white hover:text-black transition-all duration-300 text-sm tracking-widest uppercase"
                >
                  Return
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}