import { HandLandmarkerResult } from '@mediapipe/tasks-vision';

// Landmark indices for reference
// 0: Wrist
// 4: Thumb tip
// 8: Index finger tip
// 12: Middle finger tip
// 16: Ring finger tip
// 20: Pinky tip

export type GestureType = 
  | 'idle' 
  | 'fist' 
  | 'open_palm' 
  | 'pointing' 
  | 'pinching'
  | 'claw'
  | 'two_finger_point'
  | 'unknown';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export class GestureRecognizer {
  private history: { landmarks: Point3D[], timestamp: number }[] = [];
  private readonly HISTORY_LENGTH = 60; // Increased history for complex gestures (2 sec)

  constructor() {}

  public update(result: HandLandmarkerResult): { gesture: GestureType, velocity: Point3D, action: string | null } {
    if (!result.landmarks || result.landmarks.length === 0) {
      return { gesture: 'idle', velocity: { x: 0, y: 0, z: 0 }, action: null };
    }

    const landmarks = result.landmarks[0] as Point3D[];
    const timestamp = performance.now();

    // Store history
    this.history.push({ landmarks, timestamp });
    if (this.history.length > this.HISTORY_LENGTH) {
      this.history.shift();
    }

    const currentGesture = this.detectStaticGesture(landmarks);
    const velocity = this.calculateVelocity(8); // Track index finger tip velocity
    const action = this.detectDynamicGesture(currentGesture, velocity, landmarks);

    return { gesture: currentGesture, velocity, action };
  }

  private detectStaticGesture(landmarks: Point3D[]): GestureType {
    const dist = (p1: Point3D, p2: Point3D) => 
      Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const isExtended = (tip: Point3D, base: Point3D) => dist(tip, base) > 0.3; // Tuned threshold
    const isFolded = (tip: Point3D, base: Point3D) => dist(tip, base) < 0.25;

    const indexExtended = isExtended(indexTip, wrist);
    const middleExtended = isExtended(middleTip, wrist);
    const ringExtended = isExtended(ringTip, wrist);
    const pinkyExtended = isExtended(pinkyTip, wrist);
    
    const indexFolded = isFolded(indexTip, wrist);
    const middleFolded = isFolded(middleTip, wrist);
    const ringFolded = isFolded(ringTip, wrist);
    const pinkyFolded = isFolded(pinkyTip, wrist);

    const allExtended = indexExtended && middleExtended && ringExtended && pinkyExtended;
    const allFolded = indexFolded && middleFolded && ringFolded && pinkyFolded;

    if (allFolded) return 'fist';
    if (allExtended) return 'open_palm';
    if (indexExtended && middleFolded && ringFolded && pinkyFolded) return 'pointing';
    if (indexExtended && middleExtended && ringFolded && pinkyFolded) return 'two_finger_point';
    
    // Claw detection (fingers semi-curled)
    // Check if fingertips are closer to wrist than extended but further than folded
    const isSemiCurled = (tip: Point3D) => {
        const d = dist(tip, wrist);
        return d > 0.15 && d < 0.35;
    };
    
    if (isSemiCurled(indexTip) && isSemiCurled(middleTip) && isSemiCurled(ringTip)) {
        return 'claw';
    }

    return 'unknown';
  }

  private calculateVelocity(landmarkIndex: number): Point3D {
    if (this.history.length < 5) return { x: 0, y: 0, z: 0 };

    const current = this.history[this.history.length - 1];
    const prev = this.history[this.history.length - 5]; 
    const dt = (current.timestamp - prev.timestamp) / 1000;

    if (dt === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: (current.landmarks[landmarkIndex].x - prev.landmarks[landmarkIndex].x) / dt,
      y: (current.landmarks[landmarkIndex].y - prev.landmarks[landmarkIndex].y) / dt,
      z: (current.landmarks[landmarkIndex].z - prev.landmarks[landmarkIndex].z) / dt
    };
  }

  private detectDynamicGesture(staticGesture: GestureType, velocity: Point3D, currentLandmarks: Point3D[]): string | null {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    
    // Helper to get past gesture
    const getPastGesture = (framesBack: number) => {
        if (this.history.length <= framesBack) return 'unknown';
        return this.detectStaticGesture(this.history[this.history.length - 1 - framesBack].landmarks);
    };

    // 1. Basic Cast: Quick forward flick
    if (speed > 1.0 && (staticGesture === 'pointing' || staticGesture === 'open_palm')) {
         return 'basic_cast';
    }
    
    // 2. Protego: Palm up -> Snap close (Open Palm -> Fist quickly)
    if (staticGesture === 'fist' && speed > 0.3) { // More forgiving speed threshold
        // Check if we were open palm recently (extended window)
        for (let i = 3; i < 20; i++) {
            if (getPastGesture(i) === 'open_palm') {
                return 'protego';
            }
        }
    }

    // 3. Revelio: Slow outward circle (Approximated by Open Palm + Slow Movement near face/eyes)
    if (staticGesture === 'open_palm' && speed > 0.2 && speed < 1.5) {
        // Check if hand is near face height (upper 1/3 of screen)
        if (currentLandmarks[0].y < 0.3) {
             return 'revelio';
        }
    }
    
    // 4. Accio: Claw -> Pull toward chest
    if (staticGesture === 'claw' && speed > 0.6) {
        if (velocity.y > 0.3) {
            return 'accio';
        }
    }

    // 5. Depulso: Double palm thrust
    if (staticGesture === 'open_palm' && speed > 1.2 && velocity.y < -0.3) {
        return 'depulso';
    }

    // 6. Descendo: Raised hand -> Slam
    if (velocity.y > 1.5) {
        return 'descendo';
    }

    // 7. Levioso: Gentle upward lift
    if (staticGesture === 'open_palm' && velocity.y < -0.15 && velocity.y > -1.5) {
        return 'levioso';
    }

    // 8. Glacius: Sharp freeze pose (Fist) + Stillness
    if (staticGesture === 'fist' && speed < 0.1) {
        // Check if we were moving recently
        // return 'glacius'; // Hard to distinguish from just holding a fist.
        // Needs a "Snap" into stillness.
    }

    // 9. Incendio: Close-range flame burst
    if (staticGesture === 'open_palm') {
         for (let i = 5; i < 15; i++) {
            if (getPastGesture(i) === 'claw' || getPastGesture(i) === 'fist') {
                if (speed > 0.7) return 'incendio';
            }
        }
    }
    
    // 10. Diffindo: Slash
    if (staticGesture === 'two_finger_point' || staticGesture === 'pointing') {
        if (speed > 1.3) {
             return 'diffindo';
        }
    }
    
    // 11. Bombarda: Fist -> Open Explosion
    if (staticGesture === 'open_palm' && speed > 1.0) {
        for (let i = 3; i < 10; i++) {
            if (getPastGesture(i) === 'fist') {
                return 'bombarda';
            }
        }
    }
    
    // 12. Crucio: Sustained claw + tremor
    // Hard to detect tremor. Just Sustained Claw for N seconds.
    // Handled in game logic probably, or just return continuous 'crucio_pose'
    if (staticGesture === 'claw' && speed < 0.5) {
        return 'crucio_pose';
    }

    // 13. Avada Kedavra: Precise, calm, minimal
    // Maybe a specific complex path?
    // Let's make it: Pointing + S-Shape path (Lightning bolt)
    // This requires path analysis which is complex.
    // Simplified: Pointing + Very Slow Downward Motion
    if (staticGesture === 'pointing' && velocity.y > 0.1 && velocity.y < 0.5) {
        return 'avada_kedavra_pose';
    }

    return null;
  }
}