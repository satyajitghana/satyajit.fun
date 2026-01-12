'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker,
  DrawingUtils,
} from '@mediapipe/tasks-vision';
import { useCosmicStore } from '../store';

export function VisionController() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setHandLandmarks, setFaceLandmarks, setCameraReady } = useCosmicStore();
  const [visionLoaded, setVisionLoaded] = useState(false);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const initVision = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });

      setVisionLoaded(true);
    };

    initVision();

    return () => {
       // Cleanup if needed
    };
  }, []);

  useEffect(() => {
    if (!visionLoaded || !videoRef.current) return;

    const enableCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1280,
            height: 720,
            facingMode: 'user', // Use front camera
          },
        });
        videoRef.current!.srcObject = stream;
        videoRef.current!.addEventListener('loadeddata', predictWebcam);
        setCameraReady(true);
      } catch (err) {
        console.error('Error accessing webcam:', err);
      }
    };

    enableCam();

    return () => {
      // Clean up stream tracks
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [visionLoaded]);

  const predictWebcam = async () => {
    if (!faceLandmarkerRef.current || !handLandmarkerRef.current || !videoRef.current) return;

    const startTimeMs = performance.now();
    if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      
      const faceResult = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      const handResult = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

      if (faceResult.faceLandmarks) {
        setFaceLandmarks(faceResult.faceLandmarks);
      }
      
      if (handResult.landmarks) {
        setHandLandmarks(handResult.landmarks);
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-48 opacity-50 pointer-events-none">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-auto rounded-lg border-2 border-white/20 transform scale-x-[-1]"
      />
      {!visionLoaded && <p className="text-white text-xs mt-2 text-center">Loading AI Models...</p>}
    </div>
  );
}