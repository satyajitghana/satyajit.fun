'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
  decay: number;
}

export function SpellParticles() {
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const particles = useRef<Particle[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const spawnParticles = (type: string, origin: THREE.Vector3) => {
      let count = 20;
      let color = new THREE.Color('#ffffff');
      let speed = 5;
      let spread = 1;
      let size = 0.1;
      let life = 1.0;

      switch(type) {
          case 'basic_cast':
              color.set('#ff0055'); // Pinkish red
              count = 20;
              speed = 5;
              break;
          case 'protego':
              color.set('#4488ff'); // Blue shield
              count = 50;
              speed = 2;
              spread = 2;
              life = 0.5;
              break;
          case 'revelio':
              color.set('#ffff00'); // Gold
              count = 100;
              speed = 10;
              spread = 5;
              break;
          case 'accio':
              color.set('#aa00ff'); // Purple
              speed = -5; // Inwards
              break;
          case 'incendio':
              color.set('#ff4400'); // Orange fire
              count = 60;
              speed = 3;
              spread = 1.5;
              break;
          case 'glacius':
              color.set('#00ffff'); // Cyan ice
              count = 30;
              speed = 1;
              life = 2.0;
              break;
          case 'avada_kedavra':
              color.set('#00ff00'); // Green death
              count = 50;
              speed = 8;
              break;
          case 'depulso':
              color.set('#ffffff'); // White/Force
              speed = 8;
              spread = 3;
              break;
          case 'descendo':
              color.set('#8844ff'); // Purple slam
              speed = 15; // Fast down
              break;
          case 'levioso':
              color.set('#ffff88'); // Yellow float
              speed = 0.5; // Slow rise
              life = 2.0;
              break;
          case 'arresto_momentum':
              color.set('#ffff00'); // Yellow slow
              speed = 0.1;
              life = 3.0;
              break;
          case 'bombarda':
              color.set('#ff8800'); // Orange explosion
              count = 100;
              speed = 10;
              spread = 5;
              break;
          case 'diffindo':
              color.set('#ff00ff'); // Magenta slash
              count = 30;
              speed = 12;
              spread = 0.5; // Flat spread
              break;
          case 'crucio':
              color.set('#ff0000'); // Red pain
              count = 10;
              speed = 1;
              life = 0.2; // Rapid pulses
              break;
          case 'imperio':
              color.set('#44ff44'); // Green control
              count = 40;
              speed = 1;
              life = 2.0; // Swirling
              break;
          default:
              color.set('#ffffff');
      }

      // Cap particle count for performance
      const maxParticles = Math.min(count, 50);
      
      for (let i = 0; i < maxParticles; i++) {
          const velocity = new THREE.Vector3(
              (Math.random() - 0.5) * spread,
              (Math.random() - 0.5) * spread,
              (Math.random() - 0.5) * spread
          );
          
          if (type === 'basic_cast' || type === 'avada_kedavra' || type === 'depulso' || type === 'bombarda' || type === 'diffindo') {
               velocity.z -= speed; // Shoot forward
          } else if (type === 'protego') {
              // Expand sphere
              velocity.normalize().multiplyScalar(speed);
          } else if (type === 'incendio') {
              velocity.y += 1; // Rise up
              velocity.z -= speed;
          } else if (type === 'descendo') {
              velocity.y = -speed; // Shoot down
          } else if (type === 'levioso') {
              velocity.y = speed; // Float up
          } else if (type === 'accio') {
              velocity.z = speed; // Pull towards
          } else if (type === 'revelio') {
              velocity.normalize().multiplyScalar(speed); // Burst outward
          }

          particles.current.push({
              id: Math.random(),
              position: origin.clone(),
              velocity: velocity,
              life: life,
              maxLife: life,
              color: color,
              size: Math.random() * size + (size/2),
              decay: Math.random() * 0.5 + 0.5
          });
      }
  };

  useEffect(() => {
      const handleCast = (event: CustomEvent) => {
          const { type, origin } = event.detail;
          // Use origin if provided, else default
          const spawnPos = origin ? new THREE.Vector3(origin.x, origin.y, origin.z) : new THREE.Vector3(0, -1, 0);
          spawnParticles(type, spawnPos);
      };
      
      window.addEventListener('cast-spell', handleCast as EventListener);
      return () => window.removeEventListener('cast-spell', handleCast as EventListener);
  }, []);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    // Update particles
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.life -= delta * p.decay;
      
      if (p.life <= 0) {
        particles.current.splice(i, 1);
        continue;
      }

      p.position.add(p.velocity.clone().multiplyScalar(delta));
      
      // Cull particles too far from camera
      if (Math.abs(p.position.z) > 20) {
        particles.current.splice(i, 1);
        continue;
      }
      
      dummy.position.copy(p.position);
      dummy.scale.setScalar(p.size * (p.life / p.maxLife));
      dummy.rotation.x += delta;
      dummy.rotation.z += delta;
      dummy.updateMatrix();
      
      particlesRef.current.setMatrixAt(i, dummy.matrix);
      particlesRef.current.setColorAt(i, p.color);
    }
    
    particlesRef.current.count = particles.current.length;
    particlesRef.current.instanceMatrix.needsUpdate = true;
    if (particlesRef.current.instanceColor) particlesRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={particlesRef} args={[undefined, undefined, 500]}>
      <sphereGeometry args={[0.15, 6, 6]} />
      <meshStandardMaterial 
        transparent 
        opacity={0.8} 
        emissive="#ffffff" 
        emissiveIntensity={1}
        toneMapped={false}
      />
    </instancedMesh>
  );
}