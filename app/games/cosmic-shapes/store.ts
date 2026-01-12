import { create } from 'zustand';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface GameObject {
  id: string;
  type: 'orb' | 'asteroid';
  position: [number, number, number];
  velocity: [number, number, number];
  active: boolean;
}

interface GameState {
  isPlaying: boolean;
  score: number;
  gameOver: boolean;
  handLandmarks: Landmark[][];
  faceLandmarks: Landmark[][];
  cameraReady: boolean;
  gameObjects: GameObject[];
  
  // Actions
  setIsPlaying: (isPlaying: boolean) => void;
  incrementScore: (amount?: number) => void;
  setGameOver: (gameOver: boolean) => void;
  setHandLandmarks: (landmarks: Landmark[][]) => void;
  setFaceLandmarks: (landmarks: Landmark[][]) => void;
  setCameraReady: (ready: boolean) => void;
  resetGame: () => void;
  
  addGameObject: (obj: GameObject) => void;
  updateGameObjects: (objects: GameObject[]) => void;
  removeGameObject: (id: string) => void;
}

export const useCosmicStore = create<GameState>((set) => ({
  isPlaying: false,
  score: 0,
  gameOver: false,
  handLandmarks: [],
  faceLandmarks: [],
  cameraReady: false,
  gameObjects: [],

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  incrementScore: (amount = 1) => set((state) => ({ score: state.score + amount })),
  setGameOver: (gameOver) => set({ gameOver, isPlaying: false }),
  setHandLandmarks: (handLandmarks) => set({ handLandmarks }),
  setFaceLandmarks: (faceLandmarks) => set({ faceLandmarks }),
  setCameraReady: (cameraReady) => set({ cameraReady }),
  resetGame: () => set({
    score: 0,
    gameOver: false,
    isPlaying: true,
    gameObjects: []
  }),
  
  addGameObject: (obj) => set((state) => ({ gameObjects: [...state.gameObjects, obj] })),
  updateGameObjects: (objects) => set({ gameObjects: objects }),
  removeGameObject: (id) => set((state) => ({ gameObjects: state.gameObjects.filter(o => o.id !== id) })),
}));