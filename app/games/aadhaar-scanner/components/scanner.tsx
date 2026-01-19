'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ScanningStatus } from '../types';
import { Camera, XCircle, Upload, Loader2 } from 'lucide-react';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError: (error: string) => void;
  status: ScanningStatus;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onScanError, status }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isFileScanning, setIsFileScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerId = "reader-container";

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
             scannerRef.current.stop().catch(console.error);
        }
        scannerRef.current.clear();
      }
    };
  }, []);

  const startScanner = async () => {
    setIsEnabled(true);

    // Check if browser supports media devices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsEnabled(false);
        onScanError("Camera access is not supported by this browser.");
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      stream.getTracks().forEach(track => track.stop());

      // Ensure we have a fresh instance
      if (!scannerRef.current) {
         scannerRef.current = new Html5Qrcode(readerId, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false
         });
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
           scannerRef.current?.stop().then(() => {
             setIsEnabled(false);
             onScanSuccess(decodedText);
           }).catch(err => console.warn("Failed to stop scanner", err));
        },
        () => {
          // ignore frames without QR
        }
      );
    } catch (err) {
      setIsEnabled(false);
      console.error("Camera start error:", err);

      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            onScanError("Camera permission was denied. Please allow camera access in your browser settings.");
        } else if (err.name === "NotFoundError") {
            onScanError("No camera found on this device.");
        } else {
            onScanError("Failed to access camera. Please ensure permissions are granted.");
        }
      } else {
        onScanError("Failed to access camera. Please ensure permissions are granted.");
      }
    }
  };

  const stopScanner = async () => {
      if (scannerRef.current && isEnabled) {
          try {
              await scannerRef.current.stop();
              scannerRef.current.clear();
              scannerRef.current = null;
              setIsEnabled(false);
          } catch (e) {
              console.error("Failed to stop scanner", e);
          }
      }
  };

  const triggerFileUpload = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsFileScanning(true);

      try {
          if (scannerRef.current) {
               try { await scannerRef.current.clear(); } catch { /* ignore */ }
          }

          const html5QrCode = new Html5Qrcode(readerId, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false
          });
          scannerRef.current = html5QrCode;

          const result = await html5QrCode.scanFile(file, false);
          onScanSuccess(result);

          // Cleanup
          html5QrCode.clear();
          scannerRef.current = null;
      } catch (err) {
          console.error("File scan error", err);
          onScanError("Could not find or decode a Secure QR code in this image.");
      } finally {
          setIsFileScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative min-h-[400px] flex flex-col">
      {/*
        The reader container must exist in the DOM for Html5Qrcode to work.
        We hide it visually when not using the camera to show the idle UI.
      */}
      <div
        id={readerId}
        className={`w-full bg-black flex-grow ${isEnabled ? 'block' : 'hidden'}`}
        style={{ minHeight: '300px' }}
      ></div>

      {/* Overlay controls when camera is active */}
      {isEnabled && (
        <>
            <button
                onClick={stopScanner}
                className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-all z-20"
                aria-label="Close Camera"
            >
                <XCircle size={24} />
            </button>
            <div className="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm z-20 pointer-events-none">
                Align QR Code in the frame
            </div>
        </>
      )}

      {/* Idle / Selection UI */}
      {!isEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 space-y-8 bg-white z-10">
          {isFileScanning ? (
             <div className="flex flex-col items-center animate-pulse">
                 <Loader2 className="w-12 h-12 text-aadhaar-red animate-spin mb-4" />
                 <p className="text-gray-600 font-medium">Analyzing Image...</p>
             </div>
          ) : (
            <>
               <div className="text-center space-y-4">
                  <div className="bg-aadhaar-red/10 p-4 rounded-full inline-block">
                     <Camera className="w-12 h-12 text-aadhaar-red" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Scan Secure QR</h3>
                    <p className="text-gray-500 text-sm max-w-[280px] mx-auto mt-2 leading-relaxed">
                      Point camera at the Secure QR code or upload an image from your gallery.
                    </p>
                  </div>
               </div>

               <div className="flex flex-col w-full max-w-xs space-y-4">
                   <button
                    onClick={startScanner}
                    disabled={status === ScanningStatus.PROCESSING}
                    className="flex items-center justify-center w-full px-6 py-3 bg-aadhaar-red hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-red-100"
                   >
                     <Camera className="w-5 h-5 mr-2" />
                     Start Camera
                   </button>

                   <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-gray-100"></div>
                      <span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-semibold uppercase tracking-wider">Or</span>
                      <div className="flex-grow border-t border-gray-100"></div>
                   </div>

                   <button
                      onClick={triggerFileUpload}
                      disabled={status === ScanningStatus.PROCESSING}
                      className="flex items-center justify-center w-full px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                   >
                      <Upload className="w-5 h-5 mr-2" />
                      Upload QR Image
                   </button>
                   <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                   />
               </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
