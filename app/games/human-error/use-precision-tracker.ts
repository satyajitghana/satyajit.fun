import { useState, useCallback, useRef, useEffect } from "react";

interface Point {
  x: number;
  y: number;
  time: number;
}

interface PrecisionMetrics {
  linearity: number; // 0-1 (1 = perfect line)
  velocityStability: number; // 0-1 (1 = constant speed)
  tremor: number; // 0-1 (1 = high tremor/human, 0 = smooth/machine)
  machineScore: number; // 0-100 (Combined score, higher is worse)
}

const BUFFER_SIZE = 20; // Number of points to analyze
const SAMPLE_RATE = 50; // ms between samples

export function usePrecisionTracker() {
  const [metrics, setMetrics] = useState<PrecisionMetrics>({
    linearity: 0,
    velocityStability: 0,
    tremor: 0,
    machineScore: 0,
  });

  const pointsRef = useRef<Point[]>([]);
  const lastSampleTime = useRef<number>(0);

  const calculateLinearity = (points: Point[]): number => {
    if (points.length < 3) return 0;
    
    // Line from first to last point
    const p1 = points[0];
    const p2 = points[points.length - 1];
    
    // Calculate distance of all intermediate points from this line
    // Distance formula: |Ax + By + C| / sqrt(A^2 + B^2)
    // Line eq: (y1-y2)x + (x2-x1)y + (x1y2 - x2y1) = 0
    
    const A = p1.y - p2.y;
    const B = p2.x - p1.x;
    const C = p1.x * p2.y - p2.x * p1.y;
    const denominator = Math.sqrt(A*A + B*B);
    
    if (denominator === 0) return 0; // Points are same
    
    let totalDistance = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const dist = Math.abs(A * p.x + B * p.y + C) / denominator;
        totalDistance += dist;
    }
    
    const avgDeviation = totalDistance / (points.length - 2);
    // 0 deviation = 1 linearity. 20px deviation = 0 linearity.
    return Math.max(0, 1 - avgDeviation / 20);
  };

  const calculateVelocityStability = (points: Point[]): number => {
    if (points.length < 3) return 0;
    
    const speeds: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const dist = Math.sqrt(Math.pow(points[i+1].x - points[i].x, 2) + Math.pow(points[i+1].y - points[i].y, 2));
        const timeDiff = points[i+1].time - points[i].time;
        if (timeDiff > 0) {
            speeds.push(dist / timeDiff);
        }
    }
    
    if (speeds.length === 0) return 0;
    
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    if (avgSpeed === 0) return 0; // Not moving
    
    const variance = speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avgSpeed; // Coefficient of Variation
    
    // Lower CV means more stable speed (machine-like).
    // CV of 0.1 means standard deviation is 10% of speed.
    // If CV < 0.1, it's very stable (Score -> 1).
    // If CV > 0.5, it's very erratic (Score -> 0).
    
    return Math.max(0, 1 - (cv / 0.5)); 
  };

  const calculateTremor = (points: Point[]): number => {
      // Analyze angle changes. Machines move in straight lines or smooth curves.
      // Humans have micro-corrections.
      if (points.length < 3) return 0;
      
      let sharpTurns = 0;
      for (let i = 1; i < points.length - 1; i++) {
          const p1 = points[i-1];
          const p2 = points[i];
          const p3 = points[i+1];
          
          const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
          let diff = Math.abs(angle1 - angle2);
          
          // Normalize to 0-PI
          if (diff > Math.PI) diff = 2 * Math.PI - diff;
          
          // Micro tremors are small high frequency angle changes?
          // Actually, let's look for "smoothness". 
          // Low accumulated angle change per distance = smooth.
          
          if (diff > 0.1) sharpTurns++;
      }
      
      // If we have many sharp turns relative to points, it's jittery.
      return sharpTurns / points.length;
  }

  const analyzeBuffer = useCallback(() => {
    const pts = pointsRef.current;
    if (pts.length < BUFFER_SIZE / 2) return; // Need minimal data

    const linearity = calculateLinearity(pts);
    const velocityStability = calculateVelocityStability(pts);
    const tremor = calculateTremor(pts);

    // Machine Score Calculation
    // High Linearity + High Velocity Stability + Low Tremor = HIGH Machine Score
    // Weightings can be adjusted
    const score = (
        (linearity * 0.4) + 
        (velocityStability * 0.4) + 
        (Math.max(0, 1 - tremor * 2) * 0.2)
    ) * 100;

    setMetrics({
        linearity,
        velocityStability,
        tremor,
        machineScore: Math.min(100, Math.round(score))
    });
  }, []);

  const addPoint = useCallback((x: number, y: number) => {
    const now = Date.now();
    // Sampling rate limit
    if (now - lastSampleTime.current < SAMPLE_RATE) return;
    
    lastSampleTime.current = now;
    
    pointsRef.current.push({ x, y, time: now });
    
    if (pointsRef.current.length > BUFFER_SIZE) {
        pointsRef.current.shift();
    }
    
    analyzeBuffer();
  }, [analyzeBuffer]);

  const reset = useCallback(() => {
      pointsRef.current = [];
      setMetrics({
        linearity: 0,
        velocityStability: 0,
        tremor: 0,
        machineScore: 0,
      });
  }, []);

  return { metrics, addPoint, reset };
}