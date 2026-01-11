import { create } from 'zustand';

interface FluidConfig {
  viscous: number;
  mouseForce: number;
  dt: number;
  colors: string[];
  cursorSize: number;
  isViscous: boolean;
  isBounce: boolean;
}

interface EntropyState {
  // Session Metrics
  startTime: number;
  lastInteractionTime: number;
  totalDistance: number;
  clickCount: number;
  maxVelocity: number;
  
  // Real-time Analysis
  chaosScore: number; // 0.0 (Calm) -> 1.0 (Chaotic)
  stillnessScore: number; // 0.0 (Active) -> 1.0 (Still)
  
  // Visual Configuration
  fluidConfig: FluidConfig;

  // Actions
  initSession: () => void;
  registerMovement: (delta: number, velocity: number) => void;
  registerClick: () => void;
  updateState: () => void; // Called on frame loop
}

// Color Palettes
const PALETTES = {
  calm: ['#1a1a2e', '#16213e', '#0f3460'], // Deep Blue/Dark
  neutral: ['#5227FF', '#FF9FFC', '#B19EEF'], // Default
  chaos: ['#ff0000', '#ff4d00', '#ffffff'], // Red/White
  void: ['#000000', '#111111', '#222222'], // Minimal
};

export const useEntropyStore = create<EntropyState>((set, get) => ({
  startTime: 0,
  lastInteractionTime: 0,
  totalDistance: 0,
  clickCount: 0,
  maxVelocity: 0,
  
  chaosScore: 0,
  stillnessScore: 0,
  
  fluidConfig: {
    viscous: 30,
    mouseForce: 20,
    dt: 0.014,
    colors: PALETTES.neutral,
    cursorSize: 100,
    isViscous: false,
    isBounce: false,
  },

  initSession: () => {
    set({
      startTime: Date.now(),
      lastInteractionTime: Date.now(),
      totalDistance: 0,
      clickCount: 0,
      maxVelocity: 0,
      chaosScore: 0,
      stillnessScore: 0,
    });
  },

  registerMovement: (delta, velocity) => {
    const { totalDistance, maxVelocity, chaosScore } = get();
    const now = Date.now();
    
    // Chaos increases with high velocity
    const velocityImpact = Math.min(velocity * 0.05, 0.1); 
    const newChaos = Math.min(1, chaosScore + velocityImpact);
    
    set({
      lastInteractionTime: now,
      totalDistance: totalDistance + delta,
      maxVelocity: Math.max(maxVelocity, velocity),
      chaosScore: newChaos,
      stillnessScore: 0, // Reset stillness on movement
    });
  },

  registerClick: () => {
    const { clickCount, chaosScore } = get();
    set({
      clickCount: clickCount + 1,
      lastInteractionTime: Date.now(),
      chaosScore: Math.min(1, chaosScore + 0.2), // Clicks are disruptive
    });
  },

  updateState: () => {
    const { lastInteractionTime, chaosScore, stillnessScore, fluidConfig } = get();
    const now = Date.now();
    const timeSinceLastInteraction = (now - lastInteractionTime) / 1000; // Seconds

    // Decay chaos over time
    const chaosDecay = 0.005;
    let newChaos = Math.max(0, chaosScore - chaosDecay);

    // Increase stillness if inactive
    let newStillness = stillnessScore;
    if (timeSinceLastInteraction > 1.0) {
      newStillness = Math.min(1, stillnessScore + 0.005);
    }

    // Reactive Fluid Config
    let newConfig = { ...fluidConfig };

    if (newChaos > 0.6) {
      // Chaotic State
      newConfig.colors = PALETTES.chaos;
      newConfig.dt = 0.05; // Faster simulation
      newConfig.viscous = 5; // Less viscous (more watery)
      newConfig.mouseForce = 50 + (newChaos * 50); // Stronger force
      newConfig.isViscous = false;
    } else if (newStillness > 0.7) {
      // Deep Stillness State
      newConfig.colors = PALETTES.calm;
      newConfig.dt = 0.008; // Very slow
      newConfig.viscous = 100; // Thick
      newConfig.mouseForce = 10;
      newConfig.isViscous = true;
    } else {
      // Neutral / Recovery
      // Lerp colors? (For now, just switch back to neutral if balanced)
      if (newChaos < 0.3 && newStillness < 0.3) {
         newConfig.colors = PALETTES.neutral;
         newConfig.dt = 0.014;
         newConfig.viscous = 30;
         newConfig.mouseForce = 20;
         newConfig.isViscous = false;
      }
    }

    set({
      chaosScore: newChaos,
      stillnessScore: newStillness,
      fluidConfig: newConfig,
    });
  },
}));