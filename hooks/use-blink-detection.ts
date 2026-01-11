import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export const useBlinkDetection = (
  enabled: boolean,
  onBlink: () => void
) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const blinkStateRef = useRef({ isClosed: false });
  const onBlinkRef = useRef(onBlink);

  useEffect(() => {
    onBlinkRef.current = onBlink;
  }, [onBlink]);

  // Load MediaPipe
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const loadLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        if (!mounted) return;

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });

        if (!mounted) {
            faceLandmarker.close();
            return;
        }

        faceLandmarkerRef.current = faceLandmarker;
        setIsLoaded(true);
        startCamera();
      } catch (err: any) {
        console.error("Failed to load FaceLandmarker", err);
        setError(err.message || "Failed to load face tracking");
      }
    };

    loadLandmarker();

    return () => {
      mounted = false;
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
      stopCamera();
    };
  }, [enabled]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
        setPermissionGranted(true);
      }
    } catch (err) {
      console.error("Camera permission denied", err);
      setError("Camera permission denied");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    setPermissionGranted(false);
  };

  const predictWebcam = () => {
    const video = videoRef.current;
    const faceLandmarker = faceLandmarkerRef.current;

    if (!video || !faceLandmarker) return;

    // Only process if video has advanced and has valid dimensions
    if (video.currentTime !== lastVideoTimeRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
      lastVideoTimeRef.current = video.currentTime;
      
      const startTimeMs = performance.now();
      
      try {
        const results = faceLandmarker.detectForVideo(video, startTimeMs);

        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        const categories = results.faceBlendshapes[0].categories;
        
        // Find blink scores
        const eyeBlinkLeft = categories.find(c => c.categoryName === "eyeBlinkLeft")?.score || 0;
        const eyeBlinkRight = categories.find(c => c.categoryName === "eyeBlinkRight")?.score || 0;
        
        // Blink logic
        const isBlinking = eyeBlinkLeft > 0.5 && eyeBlinkRight > 0.5;

        if (isBlinking && !blinkStateRef.current.isClosed) {
            // Eyes just closed
            blinkStateRef.current.isClosed = true;
            onBlinkRef.current();
        } else if (!isBlinking && blinkStateRef.current.isClosed) {
            // Eyes just opened
            blinkStateRef.current.isClosed = false;
        }
      }
      } catch (err) {
        // Ignore detection errors (usually timestamp issues or empty frames)
        console.warn("Face detection warning:", err);
      }
    }

    if (enabled) {
        requestRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  return {
    videoRef,
    isLoaded,
    error,
    permissionGranted
  };
};