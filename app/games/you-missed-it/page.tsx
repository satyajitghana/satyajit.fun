'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameNavbar } from '@/components/game-navbar';
import PixelSnow from '@/components/react-bits/PixelSnow';
import GhostCursor from '@/components/react-bits/GhostCursor';
import DarkVeil from '@/components/react-bits/DarkVeil';
import { cn } from '@/lib/utils';
import './you-missed-it.css';

interface Echo {
  id: string;
  x: number;
  y: number;
  text: string;
  discovered: boolean;
}

type GameState = 'exploring' | 'obsession' | 'acceptance';

const ECHOES_DATA: Echo[] = [
  { id: '1', x: 20, y: 30, text: 'The air still smells like ozone and joy.', discovered: false },
  { id: '2', x: 75, y: 60, text: 'A playlist is still looping the final track.', discovered: false },
  { id: '3', x: 45, y: 45, text: 'This cup is warm. You just missed them.', discovered: false },
  { id: '4', x: 80, y: 20, text: 'Confetti on the floor, shaped like stars.', discovered: false },
  { id: '5', x: 15, y: 80, text: 'A scuff mark where someone danced too hard.', discovered: false },
];

export default function YouMissedItGame() {
  const [echoes, setEchoes] = useState<Echo[]>(ECHOES_DATA);
  const [desperation, setDesperation] = useState(0);
  const [acceptance, setAcceptance] = useState(0);
  const [gameState, setGameState] = useState<GameState>('exploring');
  const [mouseSpeed, setMouseSpeed] = useState(0);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [activeEcho, setActiveEcho] = useState<string | null>(null);

  // Track mouse movement for state logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      const speed = Math.sqrt(dx * dx + dy * dy);
      
      setMouseSpeed(speed);
      setLastMousePos({ x: e.clientX, y: e.clientY });

      // State Logic
      if (speed > 50) {
        // Fast movement increases desperation
        setDesperation(prev => Math.min(100, prev + 0.5));
      } else if (speed < 5) {
        // Stillness increases acceptance
        setAcceptance(prev => Math.min(100, prev + 0.2));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [lastMousePos]);

  // Click handler for "Desperation"
  const handleGlobalClick = () => {
    if (gameState === 'acceptance') return;
    setDesperation(prev => Math.min(100, prev + 5));
    // Reset acceptance on frantic clicking
    setAcceptance(prev => Math.max(0, prev - 2));
  };

  // Determine Game State
  useEffect(() => {
    if (desperation >= 100) {
      setGameState('obsession');
    } else if (acceptance >= 100) {
      setGameState('acceptance');
    }
  }, [desperation, acceptance]);

  const handleEchoHover = (id: string) => {
    setActiveEcho(id);
    if (!echoes.find(e => e.id === id)?.discovered) {
      setEchoes(prev => prev.map(e => e.id === id ? { ...e, discovered: true } : e));
      // discovering echoes aids acceptance
      setAcceptance(prev => Math.min(100, prev + 5));
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-black overflow-hidden select-none cursor-none"
      onClick={handleGlobalClick}
    >
      <GameNavbar accentColor={gameState === 'obsession' ? '#ef4444' : '#a78bfa'} />
      
      {/* Background Layers */}
      <div className="absolute inset-0 z-0 opacity-40">
        <PixelSnow 
          color={gameState === 'obsession' ? '#ef4444' : '#a78bfa'} 
          speed={gameState === 'acceptance' ? 0.5 : 2}
          variant="snowflake"
        />
      </div>

      {/* Distortion Layer for Obsession */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: desperation / 100 }}
      >
        <DarkVeil 
          noiseIntensity={desperation / 200} 
          warpAmount={desperation / 50}
        />
      </div>

      {/* Main Content Area */}
      <div className="relative z-20 w-full h-full flex items-center justify-center">
        
        {/* Endings */}
        <AnimatePresence>
          {gameState === 'obsession' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-red-500 font-mono text-4xl text-center tracking-widest glitch-text"
            >
              <h1>IT'S NOT COMING BACK</h1>
              <p className="text-sm mt-4 text-red-800">Refresh to try again.</p>
            </motion.div>
          )}

          {gameState === 'acceptance' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-purple-200 font-serif text-2xl text-center italic"
            >
              <h1>The quiet is nice too.</h1>
              <p className="text-xs mt-4 opacity-50">You can stay here as long as you like.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Echoes */}
        {gameState === 'exploring' && echoes.map(echo => (
          <motion.div
            key={echo.id}
            className="absolute p-4 rounded-full group cursor-none"
            style={{ left: `${echo.x}%`, top: `${echo.y}%` }}
            onMouseEnter={() => handleEchoHover(echo.id)}
            onMouseLeave={() => setActiveEcho(null)}
          >
            {/* Echo Visual Marker (faint) */}
            <div className="w-2 h-2 bg-purple-500/20 rounded-full blur-[2px] group-hover:bg-purple-400/50 transition-all duration-500" />
            
            {/* Echo Text */}
            <AnimatePresence>
              {activeEcho === echo.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 text-center text-purple-200/80 text-sm font-light pointer-events-none"
                >
                  {echo.text}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Central "Event" Remains */}
        {gameState === 'exploring' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-tr from-purple-900/10 to-transparent blur-3xl pointer-events-none" />
        )}

      </div>

      {/* UI Stats (Hidden/Subtle) */}
      <div className="absolute bottom-4 left-4 z-30 flex flex-col gap-1 opacity-20 hover:opacity-100 transition-opacity font-mono text-[10px] text-white">
        <div>Desperation: {desperation.toFixed(0)}%</div>
        <div>Acceptance: {acceptance.toFixed(0)}%</div>
      </div>

      {/* Player Avatar */}
      <GhostCursor 
        bloomStrength={gameState === 'obsession' ? 2 : 0.5}
        color={gameState === 'obsession' ? '#ef4444' : '#a78bfa'} 
      />
    </div>
  );
}