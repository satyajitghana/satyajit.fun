'use client';

import React, { useState } from 'react';
import { Scanner } from './components/scanner';
import { ResultCard } from './components/result-card';
import { AadhaarData, ScanningStatus } from './types';
import { parseQRCodeData } from './services/aadhaar-decoder';
import { AlertCircle } from 'lucide-react';
import { GameNavbar } from '@/components/game-navbar';
import './aadhaar-scanner-theme.css';

export default function AadhaarScannerPage() {
  const [status, setStatus] = useState<ScanningStatus>(ScanningStatus.IDLE);
  const [data, setData] = useState<AadhaarData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleScanSuccess = (rawText: string) => {
    setStatus(ScanningStatus.PROCESSING);
    setErrorMsg(null);

    setTimeout(() => {
        try {
            const decodedData = parseQRCodeData(rawText);
            setData(decodedData);
            setStatus(ScanningStatus.SUCCESS);
        } catch (err) {
            console.error(err);
            setErrorMsg("Invalid Format. Please ensure you are scanning a valid UIDAI Aadhaar QR Code (Secure or XML).");
            setStatus(ScanningStatus.ERROR);
        }
    }, 500);
  };

  const handleScanError = (msg: string) => {
    setErrorMsg(msg);
    if (msg.includes("permission")) {
        setStatus(ScanningStatus.ERROR);
    }
  };

  const resetScanner = () => {
    setData(null);
    setErrorMsg(null);
    setStatus(ScanningStatus.IDLE);
  };

  return (
    <div className="aadhaar-scanner-theme min-h-screen bg-slate-50 flex flex-col font-sans">
      <GameNavbar accentColor="#d93737" />

      <div className="flex-1 flex flex-col items-center py-10 px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10 transform transition-all duration-500 hover:scale-105 cursor-default">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 mb-4">
              <img src="https://upload.wikimedia.org/wikipedia/en/c/cf/Aadhaar_Logo.svg" alt="Aadhaar Logo" className="h-10" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
              AADHAAR <span className="text-aadhaar-red">Scanner</span>
          </h1>
          <p className="text-gray-500 font-medium">Securely decode & verify Aadhaar QR codes offline</p>
        </div>

        {/* Main Content Area */}
        <div className="w-full max-w-2xl relative">

          {/* Error Banner */}
          {status === ScanningStatus.ERROR && errorMsg && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 text-red-700 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                      <h4 className="font-semibold text-sm">Scanning Failed</h4>
                      <p className="text-sm opacity-90">{errorMsg}</p>
                  </div>
                  <button onClick={resetScanner} className="text-sm font-semibold hover:underline bg-white/50 px-2 py-1 rounded">Retry</button>
              </div>
          )}

          {/* View Switching */}
          {status === ScanningStatus.SUCCESS && data ? (
              <ResultCard data={data} reset={resetScanner} />
          ) : (
              <div className="space-y-6 transition-all duration-300">
                  <Scanner
                      onScanSuccess={handleScanSuccess}
                      onScanError={handleScanError}
                      status={status}
                  />

                  {status === ScanningStatus.PROCESSING && (
                      <div className="text-center py-8">
                           <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-aadhaar-red mx-auto mb-4"></div>
                           <p className="text-gray-800 font-semibold">Decryption in progress...</p>
                           <p className="text-sm text-gray-500">Parsing biometric & demographic data</p>
                      </div>
                  )}

                  {status === ScanningStatus.IDLE && (
                      <div className="flex justify-center space-x-6 text-xs text-gray-400 mt-8">
                          <div className="flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Secure V2 Supported
                          </div>
                          <div className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              Legacy XML Supported
                          </div>
                      </div>
                  )}
              </div>
          )}

        </div>
      </div>
    </div>
  );
}
