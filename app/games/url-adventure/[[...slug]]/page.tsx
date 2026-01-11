"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { GameNavbar } from "@/components/game-navbar";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, AlertTriangle, ShieldCheck, Lock, ChevronRight, Binary } from "lucide-react";
import { levels, getLevelStatus, Level } from "../game-config";
import "../url-theme.css";

// Fake 404 Component
const Fake404 = ({ hint }: { hint: string }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8 font-mono">
    <h1 className="text-6xl font-bold text-[#ef4444] mb-4 glitch-text" data-text="404">404</h1>
    <h2 className="text-xl text-white/80 mb-8">PAGE_NOT_FOUND_EXCEPTION</h2>
    <div className="border border-[#ef4444]/30 bg-[#ef4444]/10 p-4 rounded max-w-md">
      <p className="text-[#ef4444] text-sm mb-2">SYSTEM_LOG:</p>
      <p className="text-white/60 text-sm typewriter">{hint}</p>
    </div>
  </div>
);

export default function UrlAdventure() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Derived state
  const currentPath = params.slug ? (Array.isArray(params.slug) ? params.slug : [params.slug]) : [];
  const currentLevel = levels.find(l => l.id === currentLevelId);
  const maxLevels = levels.length;

  // Hydration fix
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initial redirect to intro
  useEffect(() => {
      if (currentLevelId === 1 && currentPath.length === 0 && Array.from(searchParams.keys()).length === 0) {
          router.replace("/games/url-adventure/intro");
      }
  }, [currentLevelId, currentPath, searchParams, router]);

  // Check win condition
  const [isWrongPath, setIsWrongPath] = useState(false);

  useEffect(() => {
    if (!currentLevel || showSuccess) return;

    const status = getLevelStatus(currentPath, searchParams, currentLevelId);
    
    if (status.completed) {
      setShowSuccess(true);
      setIsWrongPath(false);
    } else {
        // If we are NOT on the base path (empty slug) and NOT winning, it's a wrong path
        // BUT, we need to be careful.
        // If the user just arrived at /games/url-adventure, slug is undefined or empty array.
        // We shouldn't show 404 there.
        const isBasePath = currentPath.length === 0 && Array.from(searchParams.keys()).length === 0;
        
        // Also if we are on Level 1, we want them to go to /start.
        // If they are at /, they see instructions.
        
        // If they typed something that isn't the solution, show 404 ONLY if it's not the base instructions page.
        // Actually, for Level 1, the base page IS the "puzzle" page.
        // So we only show 404 if they typed a path/param that is WRONG.
        // But how do we distinguish "Wrong" from "Just started"?
        
        // Simple heuristic:
        // If path has length > 0 AND it's not the solution -> Wrong Path.
        // If path has params AND it's not the solution -> Wrong Path.
        // Exception: If they are exactly at the "start state" of the level?
        // No, the start state is usually "Base Path".
        
        if (!isBasePath) {
             setIsWrongPath(true);
        } else {
             setIsWrongPath(false);
        }
    }
  }, [currentPath, searchParams, currentLevelId, currentLevel, showSuccess]);

  const handleNextLevel = () => {
    setShowSuccess(false);
    if (currentLevelId < maxLevels) {
      setCurrentLevelId(prev => prev + 1);
      // Optional: Reset URL to base to clean up for next level, or keep it if it builds up
      // For this game, resetting might be clearer unless levels build on each other.
      // Let's reset to base for cleanliness unless the level specifically requires building.
      router.push("/games/url-adventure");
    }
  };

  const handleReset = () => {
      setCurrentLevelId(1);
      setShowSuccess(false);
      router.push("/games/url-adventure");
  };

  if (!isClient) return null;

  return (
    <div className="url-adventure-theme min-h-screen bg-[#0f172a] text-[#e2e8f0] font-mono overflow-hidden relative selection:bg-[#22d3ee] selection:text-[#0f172a]">
      <div className="scan-line" />
      <div className="crt-overlay absolute inset-0 z-40 pointer-events-none" />
      
      <GameNavbar accentColor="#22d3ee">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#22d3ee]/10 border border-[#22d3ee]/30">
          <Terminal className="w-4 h-4 text-[#22d3ee]" />
          <span className="text-[#22d3ee] text-xs font-bold tracking-widest">
            LEVEL {currentLevelId}/{maxLevels}
          </span>
        </div>
      </GameNavbar>

      <main className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[80vh]">
        
        {/* Fake 404 State */}
        {isWrongPath && !showSuccess ? (
            <Fake404 hint={currentLevel?.hint || "Try checking the URL..."} />
        ) : currentLevelId > maxLevels ? (
           /* Game Complete State */
           <motion.div
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="text-center p-8 border border-[#22c55e]/50 bg-[#22c55e]/10 rounded-lg max-w-2xl"
           >
             <ShieldCheck className="w-24 h-24 text-[#22c55e] mx-auto mb-6" />
             <h1 className="text-4xl font-bold text-[#22c55e] mb-4">SYSTEM ACCESS GRANTED</h1>
             <p className="text-xl text-white/80 mb-8">You have successfully bypassed all security protocols.</p>
             <button 
                onClick={handleReset}
                className="px-8 py-3 bg-[#22c55e] text-[#0f172a] font-bold rounded hover:bg-[#22c55e]/90 transition-colors"
             >
                REBOOT SYSTEM
             </button>
           </motion.div>
        ) : (
          <>
            {/* Level Content */}
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="w-full max-w-2xl text-center"
                >
                  <div className="mb-8 inline-block p-6 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/50">
                    <Lock className="w-12 h-12 text-[#22c55e]" />
                  </div>
                  <h2 className="text-3xl font-bold text-[#22c55e] mb-2">ACCESS GRANTED</h2>
                  <p className="text-white/60 mb-8">Protocol bypassed successfully.</p>
                  
                  <button
                    onClick={handleNextLevel}
                    className="group relative px-8 py-4 bg-[#22c55e] text-[#0f172a] font-bold text-lg rounded overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      INITIALIZE NEXT LEVEL <ChevronRight className="w-5 h-5" />
                    </span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="level"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-3xl"
                >
                  {/* Warning Banner */}
                  <div className="mb-8 border-l-4 border-[#ef4444] bg-[#ef4444]/10 p-4 flex items-start gap-4">
                     <AlertTriangle className="w-6 h-6 text-[#ef4444] shrink-0 mt-0.5" />
                     <div className="text-sm text-[#ef4444]/80">
                        <strong className="block text-[#ef4444] mb-1">SECURITY ALERT</strong>
                        Direct URL manipulation is required. Do not refresh unless stuck. 
                        Safety protocols active.
                     </div>
                  </div>

                  {/* Puzzle Card */}
                  <div className="bg-[#1e293b]/50 border border-[#22d3ee]/30 rounded-lg overflow-hidden backdrop-blur-sm">
                    <div className="bg-[#0f172a]/80 border-b border-[#22d3ee]/30 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <Binary className="w-5 h-5 text-[#22d3ee]" />
                         <span className="text-[#22d3ee] font-bold">LEVEL_{currentLevelId}_CONFIG</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#ef4444]/50" />
                        <div className="w-3 h-3 rounded-full bg-[#f59e0b]/50" />
                        <div className="w-3 h-3 rounded-full bg-[#22c55e]/50" />
                      </div>
                    </div>
                    
                    <div className="p-8">
                       <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                         {currentLevel?.title}
                       </h1>
                       <p className="text-lg text-[#94a3b8] mb-8 leading-relaxed">
                         {currentLevel?.description}
                       </p>
                       
                       <div className="bg-[#0f172a] p-6 rounded border border-[#22d3ee]/20 font-mono text-sm relative group">
                          <span className="absolute top-2 right-2 text-[10px] text-[#22d3ee]/40 uppercase">Hint_Log</span>
                          <p className="text-[#22d3ee] typing-effect">
                            {'>'} {currentLevel?.hint}
                            <span className="animate-pulse">_</span>
                          </p>
                       </div>
                    </div>
                  </div>
                  
                  {/* Current URL Visualization (Optional, helps mobile users see what's happening) */}
                  <div className="mt-8 text-center">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Current System Path</p>
                    <code className="bg-black/40 px-4 py-2 rounded text-[#f472b6] text-sm break-all border border-white/5">
                      {typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''}
                    </code>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}