'use client';

import { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useArcaneStore } from '../store';

export default function HandTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(null);
  const frameCountRef = useRef(0);
  const setHandDetected = useArcaneStore((state) => state.setHandDetected);
  const setGestureFeedback = useArcaneStore((state) => state.setGestureFeedback);

  useEffect(() => {
    const initHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        startWebcam();
      } catch (error) {
        console.error("Error initializing hand landmarker:", error);
        setGestureFeedback("Error initializing AI vision");
      }
    };

    initHandLandmarker();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const startWebcam = async () => {
    if (!videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 } // Reduced resolution for better performance
      });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', predictWebcam);
    } catch (error) {
      console.error("Error accessing webcam:", error);
      setGestureFeedback("Camera access denied");
    }
  };

  const predictWebcam = () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;

    // Skip every other frame for performance
    frameCountRef.current++;
    if (frameCountRef.current % 2 !== 0) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    const startTimeMs = performance.now();
    
    if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
      const result = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      
      if (result.landmarks && result.landmarks.length > 0) {
        setHandDetected(true);
        setGestureFeedback("Hand detected - Ready to cast");
        
        // Dispatch custom event for game logic to consume without excessive re-renders
        window.dispatchEvent(new CustomEvent('hand-landmarks', { 
          detail: result 
        }));
      } else {
        setHandDetected(false);
        setGestureFeedback("Raise your hand to begin");
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="webcam-feed">
      <video ref={videoRef} autoPlay playsInline muted />
    </div>
  );
}