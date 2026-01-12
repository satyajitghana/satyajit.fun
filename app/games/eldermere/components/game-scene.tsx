'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { PerspectiveCamera, Stars, Environment, Text } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useArcaneStore } from '../store';
import { GestureRecognizer } from '../lib/gesture-recognizer';
import { SpellParticles } from './spell-effects';
import { Wand } from './wand';
import * as THREE from 'three';

const gestureRecognizer = new GestureRecognizer();

function PlayerController() {
  const { camera } = useThree();
  const setGestureFeedback = useArcaneStore((state) => state.setGestureFeedback);
  const currentSpell = useArcaneStore((state) => state.currentSpell);
  
  const landmarksRef = useRef<any>(null);
  const lastActionRef = useRef<string | null>(null);

  useEffect(() => {
    const handleLandmarks = (event: CustomEvent) => {
      landmarksRef.current = event.detail;
    };
    
    window.addEventListener('hand-landmarks', handleLandmarks as EventListener);
    return () => window.removeEventListener('hand-landmarks', handleLandmarks as EventListener);
  }, []);

  useFrame(() => {
    if (landmarksRef.current) {
      const result = gestureRecognizer.update(landmarksRef.current);
      
      if (result.action) {
        // Only update if action changed (throttle re-renders)
        if (result.action !== lastActionRef.current) {
          setGestureFeedback(`Detected: ${result.action}`);
          lastActionRef.current = result.action;
        }
        
        // Dispatch spell event
        window.dispatchEvent(new CustomEvent('cast-spell', {
           detail: {
               type: result.action.replace('_pose', '').replace('_impulse', ''),
               origin: result.velocity
           }
        }));
      } else {
        lastActionRef.current = null;
      }
    }
  });

  return null;
}

function Projectile({ position, direction }: { position: THREE.Vector3, direction: THREE.Vector3 }) {
  const ref = useRef<RapierRigidBody>(null);
  
  useEffect(() => {
    if (ref.current) {
      ref.current.applyImpulse(direction.multiplyScalar(50), true);
    }
  }, [direction]);

  return (
    <RigidBody ref={ref} position={position} colliders="ball" restitution={0.8}>
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <pointLight color="#00ff88" intensity={1} distance={3} />
    </RigidBody>
  );
}

function SpellManager() {
    const [projectiles, setProjectiles] = useState<{id: number, position: THREE.Vector3, direction: THREE.Vector3}[]>([]);
    
    useEffect(() => {
        const handleCast = (event: CustomEvent) => {
            const { type } = event.detail;
            
            // Allow most spells to fire a projectile for feedback
            const projectileSpells = [
                'basic_cast', 'incendio', 'depulso', 'descendo',
                'diffindo', 'bombarda', 'crucio', 'avada_kedavra', 'accio'
            ];

            if (projectileSpells.includes(type)) {
                const id = Date.now();
                const direction = new THREE.Vector3(0, 0, -1);
                
                // Customize direction/spawn based on spell?
                // For now, consistent forward shot is best for gameplay feel
                
                setProjectiles(prev => [...prev, {
                    id,
                    position: new THREE.Vector3(0, -1, 0),
                    direction: direction
                }]);
                
                // Cleanup after 3 seconds
                setTimeout(() => {
                    setProjectiles(prev => prev.filter(p => p.id !== id));
                }, 3000);
            }
        };
        
        window.addEventListener('cast-spell', handleCast as EventListener);
        return () => window.removeEventListener('cast-spell', handleCast as EventListener);
    }, []);

    return (
        <>
            {projectiles.map(p => (
                <Projectile key={p.id} position={p.position} direction={p.direction} />
            ))}
        </>
    );
}

function TrainingDummy() {
    const [hitCount, setHitCount] = useState(0);

    return (
        <RigidBody 
            type="dynamic" 
            position={[0, 0, -5]} 
            colliders="cuboid" 
            onCollisionEnter={() => setHitCount(prev => prev + 1)}
        >
            <mesh>
                <boxGeometry args={[1, 2, 1]} />
                <meshStandardMaterial color={hitCount % 2 === 0 ? "red" : "orange"} />
            </mesh>
            <Text position={[0, 2.5, 0]} fontSize={0.5} color="white">
                Hits: {hitCount}
            </Text>
        </RigidBody>
    );
}

export default function GameScene() {
  return (
    <div className="w-full h-full relative">
      <Canvas shadows>
        <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            <color attach="background" args={['#050505']} />
            
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} castShadow />
            
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Environment preset="night" />

            <Physics gravity={[0, -9.81, 0]}>
                <PlayerController />
                <SpellManager />
                <SpellParticles />
                <Wand />
                
                {/* Floor */}
                <RigidBody type="fixed" position={[0, -5, 0]}>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                        <planeGeometry args={[100, 100]} />
                        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
                    </mesh>
                </RigidBody>

                <TrainingDummy />
            </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}