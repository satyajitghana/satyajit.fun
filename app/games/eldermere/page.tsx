'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useArcaneStore } from './store';
import { SpellGuide } from './components/spell-guide';
import './eldermere-theme.css';
import {
  Loader2, Sparkles, Shield, Eye, Magnet, MoveRight,
  ArrowDownToLine, Feather, Snowflake, Hourglass, Flame,
  Scissors, Bomb, Skull, Brain, Zap
} from 'lucide-react';

const IconMap: Record<string, any> = {
  Sparkles, Shield, Eye, Magnet, MoveRight,
  ArrowDownToLine, Feather, Snowflake, Hourglass, Flame,
  Scissors, Bomb, Skull, Brain, Zap
};

// Dynamically import heavy 3D and ML components to avoid SSR issues
const GameScene = dynamic(() => import('./components/game-scene'), { 
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-white"><Loader2 className="animate-spin w-10 h-10" /></div>
});

const HandTracker = dynamic(() => import('./components/hand-tracker'), { 
  ssr: false 
});

export default function EldermerePage() {
  const [mounted, setMounted] = useState(false);
  const gestureFeedback = useArcaneStore((state) => state.gestureFeedback);
  const currentSpellId = useArcaneStore((state) => state.currentSpell);
  const spells = useArcaneStore((state) => state.spells);
  const currentSpell = currentSpellId ? spells[currentSpellId] : null;
  const learningStage = useArcaneStore((state) => state.learningStage);
  const setLearningStage = useArcaneStore((state) => state.setLearningStage);
  const practiceScore = useArcaneStore((state) => state.practiceScore);
  const updateSpellStatus = useArcaneStore((state) => state.updateSpellStatus);
  const unlockNextSpell = useArcaneStore((state) => state.unlockNextSpell);
  const incrementPracticeScore = useArcaneStore((state) => state.incrementPracticeScore);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Listen for successful casts to progress learning
  useEffect(() => {
    const handleCast = (event: CustomEvent) => {
        const { type } = event.detail;
        if (type === currentSpellId) {
            if (learningStage === 'practice') {
                incrementPracticeScore(1);
                if (practiceScore >= 3) { // Need 3 successful casts to pass practice
                     setLearningStage('exam');
                }
            } else if (learningStage === 'exam') {
                // Exam passed!
                updateSpellStatus(currentSpellId!, 'learned');
                unlockNextSpell(currentSpellId!); // Unlock next spell
                setLearningStage(null); // Return to free play
            }
        }
    };
    
    window.addEventListener('cast-spell', handleCast as EventListener);
    return () => window.removeEventListener('cast-spell', handleCast as EventListener);
  }, [currentSpellId, learningStage, practiceScore, incrementPracticeScore, setLearningStage, updateSpellStatus]);

  if (!mounted) return null;

  return (
    <div className="eldermere-container">
      {/* 3D World */}
      <div className="absolute inset-0 z-0">
        <GameScene />
      </div>

      {/* UI Overlay */}
      <div className="spell-overlay relative z-10 pointer-events-none">
          
        {/* Spell Path Guide */}
        {currentSpellId && (learningStage === 'demonstration' || learningStage === 'practice' || learningStage === 'exam') && (
            <SpellGuide
                spellId={currentSpellId}
                ghostMode={learningStage === 'exam'}
            />
        )}
        
        {/* Final Exam Overlay */}
        {currentSpellId && learningStage === 'exam' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <div className="text-center mt-96 mb-4">
                     <div className="text-2xl text-red-400 font-bold mb-2 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">CAST NOW!</div>
                     <div className="text-sm text-white/70 bg-black/40 px-3 py-1 rounded backdrop-blur-sm">
                         Trace the faint guide precisely OR perform the gesture fast
                     </div>
                 </div>
                 
                 {/* Emergency Skip - Clickable despite pointer-events-none on parent */}
                 <button
                    className="pointer-events-auto mt-4 px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs rounded border border-red-500/30 transition-colors"
                    onClick={() => {
                        useArcaneStore.getState().updateSpellStatus(currentSpellId, 'learned');
                        useArcaneStore.getState().unlockNextSpell(currentSpellId);
                        useArcaneStore.getState().setLearningStage(null);
                    }}
                 >
                     Force Pass (Debug)
                 </button>
             </div>
        )}

        {/* Top Info */}
        <div className="instruction-panel pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)] border-l-4 border-l-purple-500 backdrop-blur-xl bg-black/60">
          <div className="flex items-center gap-3 mb-2">
             {currentSpell && IconMap[currentSpell.icon] &&
                (() => {
                    const Icon = IconMap[currentSpell.icon];
                    return <Icon className="w-8 h-8 text-purple-400" />;
                })()
             }
             <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">
                {currentSpell?.name || 'Unknown Spell'}
             </h2>
          </div>
          <p className="text-sm text-gray-300 mb-4 italic">
            "{currentSpell?.description}"
          </p>
          <div className="bg-black/40 p-3 rounded border border-white/5">
             <p className="text-xs text-blue-300 font-mono mb-1 tracking-wider">GESTURE REQUIRED:</p>
             <p className="font-bold text-white text-lg">{currentSpell?.gestureDescription}</p>
          </div>
          
          {/* Learning Progress */}
          {currentSpell?.status === 'learning' && (
              <div className="mt-4">
                  <div className="text-xs text-yellow-400 mb-1 font-bold uppercase tracking-wider">
                      {learningStage === 'demonstration' && '1. Watch & Learn'}
                      {learningStage === 'practice' && '2. Practice (Cast 3 times)'}
                      {learningStage === 'exam' && '3. Final Exam!'}
                  </div>
                  {learningStage === 'practice' && (
                      <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-yellow-500 h-full transition-all duration-300"
                            style={{ width: `${(practiceScore / 4) * 100}%` }} // 3 to pass, but bar to 100%
                          />
                      </div>
                  )}
                   {learningStage === 'exam' && (
                      <div className="bg-red-900/40 border border-red-500/50 p-2 rounded mt-2">
                          <div className="text-red-300 font-bold text-center animate-pulse">FINAL EXAM</div>
                          <p className="text-xs text-red-200 text-center mt-1">
                              The guide is gone. Prove you have learned the motion.
                          </p>
                      </div>
                  )}
                  {learningStage === 'demonstration' && (
                      <button
                        className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-1 rounded"
                        onClick={() => setLearningStage('practice')}
                      >
                          Start Practice
                      </button>
                  )}
              </div>
          )}
        </div>

        {/* Feedback Center */}
        <div className="spell-feedback text-white drop-shadow-lg">
          {gestureFeedback}
        </div>

        {/* Webcam Feed */}
        <HandTracker />
      </div>
      
      {/* Spell Book / List (Simplified) */}
      <div className="absolute right-0 top-0 h-full w-64 p-4 pointer-events-none flex flex-col justify-center">
          <div className="bg-black/50 backdrop-blur-md p-4 rounded-xl border border-white/10 pointer-events-auto max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4 text-purple-400 text-center">Spellbook</h3>
              <ul className="spell-list space-y-2">
                  {Object.values(spells).map((spell) => {
                      const Icon = IconMap[spell.icon];
                      return (
                      <li
                        key={spell.id}
                        className={`spell-item group relative p-3 rounded-lg border border-transparent transition-all duration-300 cursor-pointer
                            ${spell.status === 'learned' ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/40' : ''}
                            ${spell.status === 'locked' ? 'opacity-50 grayscale cursor-not-allowed bg-black/20' : 'bg-white/5 hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]'}
                            ${currentSpellId === spell.id ? 'ring-2 ring-purple-500 bg-purple-900/30' : ''}
                        `}
                        onClick={() => spell.status !== 'locked' && useArcaneStore.getState().setCurrentSpell(spell.id)}
                      >
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${spell.status === 'learned' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-400 group-hover:text-white'}`}>
                                  {Icon && <Icon size={18} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                      <span className={`font-cinzel font-bold text-sm ${spell.status === 'learned' ? 'text-green-300' : 'text-gray-200'}`}>
                                          {spell.name}
                                      </span>
                                      {spell.status === 'locked' && <span className="text-[10px] uppercase tracking-wider text-gray-600 font-bold ml-2">Locked</span>}
                                      {spell.status === 'learned' && <span className="text-[10px] uppercase tracking-wider text-green-600 font-bold ml-2">Mastered</span>}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 truncate group-hover:text-gray-300 transition-colors">
                                      {spell.gestureDescription}
                                  </div>
                              </div>
                          </div>
                          
                          {/* Selection Indicator */}
                          {currentSpellId === spell.id && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-8 bg-purple-500 rounded-r-full shadow-[0_0_10px_#a855f7]" />
                          )}
                      </li>
                  )})}
              </ul>
          </div>
      </div>
    </div>
  );
}