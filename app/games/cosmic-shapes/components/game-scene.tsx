'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useCosmicStore, GameObject } from '../store';
import { Text, Float, Stars, Sparkles, Trail, Instance, Instances } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { v4 as uuidv4 } from 'uuid';

function HandVisualizer() {
  const { handLandmarks } = useCosmicStore();
  const { viewport } = useThree();
  const scaleX = viewport.width;
  const scaleY = viewport.height;

  // We can use Trail for the index finger to make it look like drawing in space
  const indexTipRef = useRef<THREE.Mesh>(null);
  
  // For the rest of the hand, we use instances
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummyRef = useRef(new THREE.Object3D());

  useFrame(() => {
    if (!instancedMeshRef.current) return;
    
    if (!handLandmarks.length) {
        instancedMeshRef.current.count = 0;
        if (indexTipRef.current) indexTipRef.current.visible = false;
        return;
    }

    let instanceIndex = 0;
    
    handLandmarks.forEach((hand) => {
      // Handle Index Tip for Trail
      const indexTip = hand[8];
      if (indexTipRef.current) {
          indexTipRef.current.visible = true;
          // Project to Z=0 plane for accurate collision visualization
          indexTipRef.current.position.set(
              (0.5 - indexTip.x) * scaleX,
              (0.5 - indexTip.y) * scaleY,
              0 // Force Z to 0 to align with game objects
          );
      }

      // Handle all other points
      hand.forEach((landmark, i) => {
        // Skip index tip in the instanced mesh so we don't duplicate (optional, but cleaner)
        if (i === 8) return;

        const x = (0.5 - landmark.x) * scaleX;
        const y = (0.5 - landmark.y) * scaleY;
        // Keep depth for visual aesthetics of the hand, but maybe reduce it
        const z = -landmark.z * 2;

        dummyRef.current.position.set(x, y, z);
        dummyRef.current.scale.setScalar(0.05); 
        dummyRef.current.updateMatrix();
        
        if (instanceIndex < 100) {
             instancedMeshRef.current!.setMatrixAt(instanceIndex++, dummyRef.current.matrix);
        }
      });
    });

    instancedMeshRef.current.count = instanceIndex;
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, 100]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} toneMapped={false} />
        </instancedMesh>
        
        <mesh ref={indexTipRef}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#00ffff" />
            <Trail
                width={2}
                length={8}
                color={new THREE.Color("#00ffff")}
                attenuation={(t) => t * t}
            />
        </mesh>
    </>
  );
}

function FaceVisualizer() {
    const { faceLandmarks } = useCosmicStore();
    const dummyRef = useRef(new THREE.Object3D());
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const { viewport } = useThree();

    const scaleX = viewport.width;
    const scaleY = viewport.height;

    useFrame(() => {
        if (!instancedMeshRef.current) return;

        if (!faceLandmarks.length) {
            instancedMeshRef.current.count = 0;
            return;
        }
        
        let instanceIndex = 0;

        faceLandmarks.forEach(face => {
             // Visualizing contours
             for (let i = 0; i < face.length; i+=3) { // Higher density for face
                const landmark = face[i];
                const x = (0.5 - landmark.x) * scaleX;
                const y = (0.5 - landmark.y) * scaleY;
                const z = -landmark.z * 5;

                dummyRef.current.position.set(x, y, z);
                dummyRef.current.scale.setScalar(0.02); 
                dummyRef.current.updateMatrix();

                if (instanceIndex < 1000) {
                    instancedMeshRef.current!.setMatrixAt(instanceIndex++, dummyRef.current.matrix);
                }
             }
        });

        instancedMeshRef.current.count = instanceIndex;
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, 1000]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ff00cc" emissive="#ff00cc" emissiveIntensity={1} toneMapped={false} />
        </instancedMesh>
    );
}

function GameObjects() {
    const { gameObjects } = useCosmicStore();
    return (
        <group>
            {gameObjects.map(obj => (
                <SingleGameObject key={obj.id} obj={obj} />
            ))}
        </group>
    );
}

function SingleGameObject({ obj }: { obj: GameObject }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [dead, setDead] = useState(false);
    
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * (obj.type === 'asteroid' ? 0.5 : 2);
            meshRef.current.rotation.y += delta * (obj.type === 'asteroid' ? 0.2 : 2);
        }
    });

    // Orb: Golden/Yellow octahedron
    // Asteroid: Red/Dark jagged shape
    
    if (obj.type === 'orb') {
        return (
            <Float speed={5} rotationIntensity={2} floatIntensity={1}>
                <mesh ref={meshRef} position={obj.position}>
                    <octahedronGeometry args={[0.3, 0]} />
                    <meshStandardMaterial 
                        color="#fbbf24" 
                        emissive="#fbbf24" 
                        emissiveIntensity={3} 
                        toneMapped={false}
                    />
                    <Sparkles count={10} scale={1.5} size={2} speed={0.4} opacity={0.5} color="#fbbf24" />
                </mesh>
            </Float>
        );
    } else {
        return (
            <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
                <mesh ref={meshRef} position={obj.position}>
                    <dodecahedronGeometry args={[0.4, 0]} />
                    <meshStandardMaterial 
                        color="#ef4444" 
                        emissive="#7f1d1d" 
                        emissiveIntensity={0.5} 
                        roughness={0.8}
                    />
                    {/* Inner glowing core for asteroid */}
                     <mesh scale={0.5}>
                        <dodecahedronGeometry args={[0.4, 0]} />
                        <meshBasicMaterial color="#ff0000" />
                    </mesh>
                </mesh>
            </Float>
        );
    }
}


function GameManager() {
    const { 
        isPlaying, 
        addGameObject, 
        updateGameObjects, 
        gameObjects, 
        handLandmarks, 
        faceLandmarks,
        incrementScore,
        setGameOver
    } = useCosmicStore();
    
    const { viewport } = useThree();
    const lastSpawnTime = useRef(0);
    const spawnInterval = useRef(1.5);

    const scaleX = viewport.width;
    const scaleY = viewport.height;

    useFrame((state, delta) => {
        if (!isPlaying) return;
        
        // Increase difficulty over time
        spawnInterval.current = Math.max(0.5, 1.5 - state.clock.elapsedTime * 0.01);

        // Spawning Logic
        if (state.clock.elapsedTime - lastSpawnTime.current > spawnInterval.current) {
            lastSpawnTime.current = state.clock.elapsedTime;
            
            const type = Math.random() > 0.35 ? 'orb' : 'asteroid'; // slightly more asteroids
            const x = (Math.random() - 0.5) * viewport.width * 0.8;
            const y = viewport.height / 2 + 2; 
            const z = 0;
            
            // Speed increases slightly over time
            const speed = 2 + state.clock.elapsedTime * 0.02;

            addGameObject({
                id: uuidv4(),
                type,
                position: [x, y, z],
                velocity: [0, -speed, 0], 
                active: true
            });
        }

        // Update Objects Position
        const newObjects = gameObjects.map(obj => ({
            ...obj,
            position: [
                obj.position[0] + obj.velocity[0] * delta,
                obj.position[1] + obj.velocity[1] * delta,
                obj.position[2]
            ] as [number, number, number]
        })).filter(obj => obj.position[1] > -viewport.height / 2 - 2); 

        // Collision Detection
        const activeObjects: GameObject[] = [];
        
        newObjects.forEach(obj => {
            let collided = false;

            // Check collision with Hands
            if (handLandmarks.length > 0) {
                for (const hand of handLandmarks) {
                    const tip = hand[8]; // Index finger
                    const tipX = (0.5 - tip.x) * scaleX;
                    const tipY = (0.5 - tip.y) * scaleY;
                    
                    const dist = Math.sqrt(
                        Math.pow(tipX - obj.position[0], 2) + 
                        Math.pow(tipY - obj.position[1], 2)
                    );

                    if (dist < 0.8) { // Increased hit radius for better playability
                        collided = true;
                        if (obj.type === 'orb') {
                            incrementScore(10);
                        } else {
                            setGameOver(true);
                        }
                        break; 
                    }
                }
            }

            // Check collision with Face
             if (!collided && faceLandmarks.length > 0) {
                 // Check multiple points on face for better hit detection
                 const face = faceLandmarks[0];
                 const pointsToCheck = [1, 152, 234, 454]; // Nose, Chin, Left, Right
                 
                 for (const idx of pointsToCheck) {
                    const point = face[idx];
                    const pX = (0.5 - point.x) * scaleX;
                    const pY = (0.5 - point.y) * scaleY;
    
                    const dist = Math.sqrt(
                        Math.pow(pX - obj.position[0], 2) + 
                        Math.pow(pY - obj.position[1], 2)
                    );
    
                    if (dist < 0.7) {
                        collided = true;
                         if (obj.type === 'orb') {
                            incrementScore(10);
                        } else {
                            setGameOver(true);
                        }
                        break;
                    }
                 }
            }

            if (!collided) {
                activeObjects.push(obj);
            }
        });

        if (activeObjects.length !== gameObjects.length || newObjects.length !== gameObjects.length) {
             updateGameObjects(activeObjects);
        }
    });

    return null;
}

export function GameScene() {
    const { isPlaying } = useCosmicStore();

  return (
    <>
      <color attach="background" args={['#050510']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#88aaff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff88aa" />
      
      {/* Environment */}
      <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={50} scale={10} size={4} speed={0.4} opacity={0.5} color="#ffffff" />
      
      <HandVisualizer />
      <FaceVisualizer />
      
      <GameManager />
      <GameObjects />
      
      {!isPlaying && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <group position={[0, 3, -5]}>
                <Text
                    fontSize={1.2}
                    color="#a855f7"
                    anchorX="center"
                    anchorY="middle"
                >
                    COSMIC
                    <meshStandardMaterial emissive="#a855f7" emissiveIntensity={2} toneMapped={false} />
                </Text>
                 <Text
                    position={[0, -1.2, 0]}
                    fontSize={1.2}
                    color="#00ffff"
                    anchorX="center"
                    anchorY="middle"
                >
                    SHAPES
                    <meshStandardMaterial emissive="#00ffff" emissiveIntensity={2} toneMapped={false} />
                </Text>
            </group>
        </Float>
      )}

      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.4} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        <ChromaticAberration offset={[0.002, 0.002]} />
      </EffectComposer>
    </>
  );
}