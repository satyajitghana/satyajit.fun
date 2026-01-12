import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SpellId =
  | 'basic_cast' 
  | 'protego' 
  | 'revelio' 
  | 'accio' 
  | 'depulso' 
  | 'descendo' 
  | 'levioso' 
  | 'glacius' 
  | 'arresto_momentum' 
  | 'incendio' 
  | 'diffindo' 
  | 'bombarda'
  | 'crucio'
  | 'imperio'
  | 'avada_kedavra';

export type SpellStatus = 'locked' | 'learning' | 'learned';

export interface Spell {
  id: SpellId;
  name: string;
  description: string;
  gestureDescription: string;
  category: 'essential' | 'force' | 'control' | 'damage' | 'unforgivable';
  status: SpellStatus;
  icon: string;
}

export interface GameState {
  currentSpell: SpellId | null;
  spells: Record<SpellId, Spell>;
  isHandDetected: boolean;
  gestureFeedback: string;
  learningStage: 'demonstration' | 'practice' | 'exam' | null;
  practiceScore: number;
  examProgress: number;
  
  // Actions
  setHandDetected: (detected: boolean) => void;
  setCurrentSpell: (spellId: SpellId) => void;
  updateSpellStatus: (spellId: SpellId, status: SpellStatus) => void;
  unlockNextSpell: (currentSpellId: SpellId) => void;
  setGestureFeedback: (feedback: string) => void;
  setLearningStage: (stage: 'demonstration' | 'practice' | 'exam' | null) => void;
  incrementPracticeScore: (amount: number) => void;
  resetPracticeScore: () => void;
  setExamProgress: (progress: number) => void;
}

const initialSpells: Record<SpellId, Spell> = {
  basic_cast: {
    id: 'basic_cast',
    name: 'Basic Cast',
    description: 'A quick forward flick to deal minor damage.',
    gestureDescription: 'Quick forward flick',
    category: 'essential',
    status: 'learning',
    icon: 'Sparkles',
  },
  protego: {
    id: 'protego',
    name: 'Protego',
    description: 'Shield charm to block incoming attacks. Speed matters!',
    gestureDescription: 'Open Hand → SNAP to Fist (FAST!)',
    category: 'essential',
    status: 'locked',
    icon: 'Shield',
  },
  revelio: {
    id: 'revelio',
    name: 'Revelio',
    description: 'Reveals hidden objects.',
    gestureDescription: 'Slow outward circle',
    category: 'essential',
    status: 'locked',
    icon: 'Eye',
  },
  accio: {
    id: 'accio',
    name: 'Accio',
    description: 'Summons objects towards you.',
    gestureDescription: 'Claw hand → Pull DOWN (not towards you)',
    category: 'force',
    status: 'locked',
    icon: 'Magnet',
  },
  depulso: {
    id: 'depulso',
    name: 'Depulso',
    description: 'Pushes objects away with force.',
    gestureDescription: 'Open Palm → Push UP quickly',
    category: 'force',
    status: 'locked',
    icon: 'MoveRight',
  },
  descendo: {
    id: 'descendo',
    name: 'Descendo',
    description: 'Slams objects into the ground.',
    gestureDescription: 'Any gesture → SLAM hand DOWN fast',
    category: 'force',
    status: 'locked',
    icon: 'ArrowDownToLine',
  },
  levioso: {
    id: 'levioso',
    name: 'Levioso',
    description: 'Levitates objects or enemies.',
    gestureDescription: 'Open Palm → Slow lift UP',
    category: 'control',
    status: 'locked',
    icon: 'Feather',
  },
  glacius: {
    id: 'glacius',
    name: 'Glacius',
    description: 'Freezes enemies in place.',
    gestureDescription: 'Sharp freeze pose + Breath stillness',
    category: 'control',
    status: 'locked',
    icon: 'Snowflake',
  },
  arresto_momentum: {
    id: 'arresto_momentum',
    name: 'Arresto Momentum',
    description: 'Slows down objects or enemies.',
    gestureDescription: 'Slowing spiral',
    category: 'control',
    status: 'locked',
    icon: 'Hourglass',
  },
  incendio: {
    id: 'incendio',
    name: 'Incendio',
    description: 'Unleashes a burst of fire.',
    gestureDescription: 'Claw/Fist → BURST to Open Palm',
    category: 'damage',
    status: 'locked',
    icon: 'Flame',
  },
  diffindo: {
    id: 'diffindo',
    name: 'Diffindo',
    description: 'Slashes targets from a distance.',
    gestureDescription: 'Point finger → Slash FAST',
    category: 'damage',
    status: 'locked',
    icon: 'Scissors',
  },
  bombarda: {
    id: 'bombarda',
    name: 'Bombarda',
    description: 'Creates a powerful explosion.',
    gestureDescription: 'Fist → EXPLODE to Open Palm',
    category: 'damage',
    status: 'locked',
    icon: 'Bomb',
  },
  crucio: {
    id: 'crucio',
    name: 'Crucio',
    description: 'Inflicts unbearable pain.',
    gestureDescription: 'Sustained claw + Tremor',
    category: 'unforgivable',
    status: 'locked',
    icon: 'Skull',
  },
  imperio: {
    id: 'imperio',
    name: 'Imperio',
    description: 'Controls the mind of the target.',
    gestureDescription: 'Steady point + Eye contact',
    category: 'unforgivable',
    status: 'locked',
    icon: 'Brain',
  },
  avada_kedavra: {
    id: 'avada_kedavra',
    name: 'Avada Kedavra',
    description: 'The Killing Curse.',
    gestureDescription: 'Precise, calm, minimal',
    category: 'unforgivable',
    status: 'locked',
    icon: 'Zap',
  },
};

export const useArcaneStore = create<GameState>()(
  persist(
    (set) => ({
      currentSpell: 'basic_cast',
      spells: initialSpells,
      isHandDetected: false,
      gestureFeedback: 'Waiting for camera...',
      learningStage: 'demonstration',
      practiceScore: 0,
      examProgress: 0,

      setHandDetected: (detected) => set({ isHandDetected: detected }),
      setCurrentSpell: (spellId) => set((state) => {
        const spell = state.spells[spellId];
        const newLearningStage = spell.status === 'learning' ? 'demonstration' : null;
        return {
          currentSpell: spellId,
          learningStage: newLearningStage,
          practiceScore: 0
        };
      }),
      updateSpellStatus: (spellId, status) =>
        set((state) => ({
          spells: {
            ...state.spells,
            [spellId]: { ...state.spells[spellId], status },
          },
        })),
      unlockNextSpell: (currentSpellId) => set((state) => {
          const spellIds = Object.keys(state.spells) as SpellId[];
          const currentIndex = spellIds.indexOf(currentSpellId);
          if (currentIndex !== -1 && currentIndex < spellIds.length - 1) {
              const nextSpellId = spellIds[currentIndex + 1];
              return {
                  spells: {
                      ...state.spells,
                      [nextSpellId]: { ...state.spells[nextSpellId], status: 'learning' }
                  }
              };
          }
          return state;
      }),
      setGestureFeedback: (feedback) => set({ gestureFeedback: feedback }),
      setLearningStage: (stage) => set({ learningStage: stage }),
      incrementPracticeScore: (amount) => set((state) => ({ practiceScore: state.practiceScore + amount })),
      resetPracticeScore: () => set({ practiceScore: 0 }),
      setExamProgress: (progress) => set({ examProgress: progress }),
    }),
    {
      name: 'eldermere-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({ spells: state.spells }), // Only persist spells state
    }
  )
);