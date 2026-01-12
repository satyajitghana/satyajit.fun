'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Wand() {
  const wandRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    const handleLandmarks = (event: CustomEvent) => {
        const landmarks = event.detail.landmarks[0];
        if (landmarks && wandRef.current) {
            const indexTip = landmarks[8];
            const wrist = landmarks[0];
            
            // X: 0 -> -8, 1 -> 8 (Mirrored and wider range)
            const x = (1 - indexTip.x - 0.5) * 12;
            const y = (0.5 - indexTip.y) * 8;
            const z = -indexTip.z * 5; 
            
            // Lerp for smoothness
            wandRef.current.position.lerp(new THREE.Vector3(x, y, z), 0.2);
            
            const wx = (1 - wrist.x - 0.5) * 12;
            const wy = (0.5 - wrist.y) * 8;
            const wz = -wrist.z * 5;
            
            const targetPos = new THREE.Vector3(wx, wy, wz);
            wandRef.current.lookAt(targetPos);
        }
    };
    
    window.addEventListener('hand-landmarks', handleLandmarks as EventListener);
    return () => window.removeEventListener('hand-landmarks', handleLandmarks as EventListener);
  }, []);

  return (
    <group ref={wandRef}>
        {/* Wand Handle (Intricate) */}
        <group position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
             <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.03, 0.4, 8]} />
                <meshStandardMaterial color="#2a1b15" roughness={0.7} />
            </mesh>
            {/* Gold Ring */}
            <mesh position={[0, 0.18, 0]}>
                <torusGeometry args={[0.04, 0.005, 16, 32]} />
                <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.2} />
            </mesh>
            {/* Pommel */}
            <mesh position={[0, -0.22, 0]}>
                <sphereGeometry args={[0.045]} />
                <meshStandardMaterial color="#4a3b32" roughness={0.5} />
            </mesh>
        </group>
        
        {/* Wand Shaft (Tapered) */}
        <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.035, 0.8, 8]} />
            <meshStandardMaterial color="#5d4037" roughness={0.6} />
        </mesh>

        {/* Tip Glow */}
        <mesh position={[0, 0, -0.65]}>
            <sphereGeometry args={[0.05]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.6} />
        </mesh>
        <pointLight position={[0, 0, -0.65]} distance={3} intensity={3} color="#a855f7" />
    </group>
  );
}