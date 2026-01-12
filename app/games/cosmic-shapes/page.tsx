'use client';

import { Canvas } from '@react-three/fiber';
import { VisionController } from './components/vision-controller';
import { GameScene } from './components/game-scene';
import { useCosmicStore } from './store';
import { Loader } from '@react-three/drei';
import { GameNavbar } from '@/components/game-navbar';
import './cosmic-theme.css';

export default function CosmicShapesGame() {
  const {
    cameraReady,
    isPlaying,
    score,
    gameOver,
    setIsPlaying,
    resetGame
  } = useCosmicStore();

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono">
      <div className="absolute top-0 left-0 right-0 z-40">
        <GameNavbar accentColor="#a855f7" />
      </div>

      {/* Vision Controller (Webcam & MediaPipe) */}
      <VisionController />

      {/* 3D Game Scene */}
      <div className="absolute inset-0 z-10">
        <Canvas
            camera={{ position: [0, 0, 5], fov: 75 }}
            dpr={[1, 2]}
            gl={{ antialias: true }}
        >
            <GameScene />
        </Canvas>
      </div>

      {/* Loading Overlay */}
      {!cameraReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 text-white">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Cosmic Shapes
            </h1>
            <p className="text-xl animate-pulse text-blue-200">Initializing Vision System...</p>
            <p className="text-sm text-gray-400 mt-4">Please allow camera access to play.</p>
          </div>
        </div>
      )}

      {/* Game UI */}
      {cameraReady && (
        <>
            {/* HUD */}
            <div className="absolute top-4 left-4 z-20 text-white">
                <div className="text-2xl font-bold">Score: {score}</div>
            </div>

            {/* Start Screen */}
            {!isPlaying && !gameOver && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-center p-8 bg-black/60 rounded-2xl border border-white/10 shadow-2xl">
                        <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
                            COSMIC SHAPES
                        </h1>
                        <p className="text-lg text-gray-200 mb-8 max-w-md mx-auto">
                            Use your <span className="text-cyan-400 font-bold">Hands</span> to collect Yellow Orbs.
                            <br/>
                            Avoid Red Asteroids with your <span className="text-purple-400 font-bold">Face</span>.
                        </p>
                        <button
                            onClick={() => resetGame()}
                            className="px-8 py-3 bg-white text-black font-bold text-xl rounded-full hover:scale-105 transition-transform"
                        >
                            START GAME
                        </button>
                    </div>
                </div>
            )}

            {/* Game Over Screen */}
            {gameOver && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-900/20 backdrop-blur-md">
                    <div className="text-center p-8 bg-black/80 rounded-2xl border border-red-500/30 shadow-2xl">
                        <h2 className="text-6xl font-bold mb-4 text-red-500">GAME OVER</h2>
                        <p className="text-2xl text-white mb-8">Final Score: {score}</p>
                        <button
                            onClick={() => resetGame()}
                            className="px-8 py-3 bg-red-500 text-white font-bold text-xl rounded-full hover:bg-red-600 transition-colors"
                        >
                            TRY AGAIN
                        </button>
                    </div>
                </div>
            )}
        </>
      )}
      
      <Loader />
    </div>
  );
}