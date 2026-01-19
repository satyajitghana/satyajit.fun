'use client';

import React, { useEffect, useState } from 'react';
import { Buffer } from 'buffer';
import { JpxImage } from 'jpeg2000';
import { AadhaarData } from '../types';
import {
  Download, Fingerprint, ScanLine, Image as ImageIcon, Shield, Database, LayoutGrid
} from 'lucide-react';

interface ResultCardProps {
  data: AadhaarData;
  reset: () => void;
}

interface Jp2Meta {
  width: number;
  height: number;
  components: number;
  tiles: unknown[];
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, reset }) => {
  const [imgError, setImgError] = useState(false);
  const [jp2Meta, setJp2Meta] = useState<Jp2Meta | null>(null);

  const isJp2 = data.photoMimeType === 'image/jp2';

  // Dynamically load jpeg2000 and parse headers
  useEffect(() => {
    let isMounted = true;

    const parseJp2 = async () => {
      if (!isJp2 || !data.photoBase64) return;

      try {
        // Prepare data
        const raw = atob(data.photoBase64);
        const len = raw.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = raw.charCodeAt(i);
        }

        const buffer = Buffer.from(bytes);

        // Parse JP2
        const jpx = new JpxImage();
        jpx.parse(buffer);

        if (isMounted) {
          setJp2Meta({
            width: jpx.width,
            height: jpx.height,
            components: jpx.componentsCount,
            tiles: jpx.tiles
          });
        }
      } catch (e) {
        console.warn("JP2 Dynamic Parse Error:", e);
      }
    };

    parseJp2();

    return () => { isMounted = false; };
  }, [data.photoBase64, isJp2]);

  const downloadImage = () => {
      if (!data.photoBase64) return;
      const link = document.createElement('a');
      link.href = `data:${data.photoMimeType};base64,${data.photoBase64}`;
      const ext = data.photoMimeType.split('/')[1] || 'jp2';
      link.download = `photo_${data.name.replace(/\s+/g, '_')}.${ext}`;
      link.click();
  };

  const renderValue = (key: string, value: unknown) => {
      if (typeof value === 'object' && value !== null) {
          return <pre className="text-[10px] bg-gray-50 p-2 rounded overflow-x-auto border border-gray-100 font-mono text-gray-600">{JSON.stringify(value, null, 2)}</pre>;
      }
      if (key.toLowerCase().includes('hash') || key.toLowerCase().includes('signature')) {
          return <code className="text-[10px] break-all font-mono text-gray-600 bg-gray-50 p-2 rounded block border border-gray-100">{String(value)}</code>
      }
      return <span className="text-sm font-medium text-gray-800 break-words leading-relaxed">{String(value)}</span>
  };

  // Prepare all fields for display, filtering out large data blobs
  const allFields = Object.entries(data).filter(([key, value]) => {
     return key !== 'photoBase64' && key !== 'rawBytes' && value !== null && value !== '' && value !== undefined;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">

      {/* --- VIRTUAL AADHAAR CARD --- */}
      <div className="perspective-1000 w-full flex justify-center py-6">
        <div className="relative w-full max-w-[480px] aspect-[1.586] rounded-2xl bg-white shadow-2xl transition-transform hover:rotate-1 duration-500 overflow-hidden group border border-gray-200 select-none">

            {/* Background Layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-green-50"></div>
            <div className="absolute inset-0 bg-guilloche opacity-10"></div>
            <div className="absolute inset-0 holographic-overlay opacity-30 mix-blend-color-burn"></div>

            {/* Header */}
            <div className="relative h-[20%] flex justify-between items-center px-5 pt-2">
               <img
                 src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                 alt="Emblem"
                 className="h-10 opacity-90 drop-shadow-sm"
               />
               <div className="text-right flex flex-col items-end">
                 <h3 className="text-[10px] font-bold text-gray-900 tracking-wide uppercase">Government of India</h3>
                 <p className="text-[8px] text-gray-500">Unique Identification Authority of India</p>
               </div>
               <img src="https://upload.wikimedia.org/wikipedia/en/c/cf/Aadhaar_Logo.svg" alt="Aadhaar" className="h-8 ml-2" />
            </div>

            {/* Content Body */}
            <div className="relative flex p-5 gap-5 h-[65%] mt-1">
                {/* Photo */}
                <div className="w-[32%] h-full flex flex-col gap-2">
                    <div className="flex-1 bg-gray-100 rounded border border-gray-300 shadow-inner overflow-hidden relative">
                         {data.photoBase64 ? (
                            <img
                                src={`data:${data.photoMimeType};base64,${data.photoBase64}`}
                                className="w-full h-full object-cover mix-blend-multiply"
                                alt="Resident"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    setImgError(true);
                                }}
                            />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                 <Fingerprint className="text-gray-400 opacity-50" />
                             </div>
                         )}
                         {/* Fallback Overlay */}
                         {(imgError || isJp2) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 text-center p-1">
                                <ImageIcon size={16} className="text-gray-400 mb-1" />
                                <span className="text-[8px] text-gray-500 font-mono leading-tight uppercase">
                                    {isJp2 ? "Secure JP2" : "No Image"}
                                </span>
                            </div>
                         )}
                    </div>
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-start space-y-3 pt-1">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight uppercase tracking-tight">{data.name}</h2>
                        <div className="text-[10px] text-gray-600 font-medium mt-1 space-y-0.5">
                            {data.dob && <p>DOB: <span className="text-gray-900">{data.dob}</span></p>}
                            {data.gender && <p>Gender: <span className="text-gray-900">{data.gender === 'M' ? 'MALE' : data.gender === 'F' ? 'FEMALE' : data.gender}</span></p>}
                        </div>
                    </div>

                    <div className="mt-auto pt-2">
                         <div className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">Aadhaar Number</div>
                         <div className="text-xl font-mono font-bold text-gray-800 tracking-widest drop-shadow-sm flex items-center gap-2">
                             <span>XXXX</span>
                             <span>XXXX</span>
                             <span>{data.parsedRefId ? data.parsedRefId.aadhaarLast4 : (data.referenceId.slice(-4) || 'XXXX')}</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* Footer Strip */}
            <div className="absolute bottom-0 w-full h-[6px] bg-aadhaar-red"></div>

            {/* Glossy Shine */}
            <div className="absolute inset-0 card-shine pointer-events-none z-20 mix-blend-soft-light"></div>
        </div>
      </div>

      {/* --- GRID LAYOUT FOR DATA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: Technical Specs & Hashes */}
        <div className="space-y-6 lg:col-span-1">

            {/* JP2 Info Panel */}
            {isJp2 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                         <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">
                            <LayoutGrid size={14} className="mr-2 text-aadhaar-red" />
                            JP2000 Decoder
                         </h4>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${jp2Meta ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                             {jp2Meta ? 'Parsed' : 'Waiting...'}
                         </span>
                    </div>
                    <div className="p-4 space-y-3">
                        {jp2Meta ? (
                            <>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <span className="block text-gray-400 text-[10px] uppercase">Width</span>
                                      <span className="font-mono font-bold text-gray-700">{jp2Meta.width}px</span>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <span className="block text-gray-400 text-[10px] uppercase">Height</span>
                                      <span className="font-mono font-bold text-gray-700">{jp2Meta.height}px</span>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <span className="block text-gray-400 text-[10px] uppercase">Components</span>
                                      <span className="font-mono font-bold text-gray-700">{jp2Meta.components}</span>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <span className="block text-gray-400 text-[10px] uppercase">Tiles</span>
                                      <span className="font-mono font-bold text-gray-700">{jp2Meta.tiles?.length || 0}</span>
                                  </div>
                              </div>
                              <button
                                onClick={downloadImage}
                                className="w-full mt-2 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded flex items-center justify-center transition-all"
                              >
                                  <Download size={12} className="mr-2" /> Download Raw JP2
                              </button>
                            </>
                        ) : (
                            <div className="text-center py-4 text-xs text-gray-400 animate-pulse">
                                {isJp2 ? 'Parsing codestream headers...' : 'Not a JP2 image'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cryptographic Proofs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                     <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">
                        <Shield size={14} className="mr-2 text-aadhaar-red" />
                        Digital Signature
                     </h4>
                </div>
                <div className="p-4 space-y-4">
                    {data.mobileHash && (
                        <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Mobile Hash</span>
                            <div className="p-2 bg-gray-50 border border-gray-100 rounded text-[10px] font-mono break-all text-gray-600">
                                {data.mobileHash}
                            </div>
                        </div>
                    )}
                    {data.emailHash && (
                        <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Email Hash</span>
                            <div className="p-2 bg-gray-50 border border-gray-100 rounded text-[10px] font-mono break-all text-gray-600">
                                {data.emailHash}
                            </div>
                        </div>
                    )}
                    {data.signature && (
                        <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">RSA 2048 Signature</span>
                            <div className="p-2 bg-gray-900 border border-gray-800 rounded text-[10px] font-mono break-all text-green-500 h-32 overflow-y-auto custom-scrollbar leading-tight">
                                {data.signature}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Full Data Table */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                     <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center">
                        <Database size={16} className="mr-2 text-aadhaar-red" />
                        Decoded Metadata Report
                     </h4>
                     <span className="text-xs text-gray-400 font-mono">Fields: {allFields.length}</span>
                </div>

                <div className="divide-y divide-gray-100">
                    {allFields.map(([key, value]) => (
                        <div key={key} className="grid grid-cols-12 hover:bg-gray-50/50 transition-colors group">
                            <div className="col-span-4 md:col-span-3 py-3 px-6 bg-gray-50/30 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-50 flex items-center">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="col-span-8 md:col-span-9 py-3 px-6">
                                {renderValue(key, value)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>

      <div className="flex justify-center pb-8">
        <button
          onClick={reset}
          className="px-8 py-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-black hover:scale-105 transition-all duration-200 font-medium flex items-center"
        >
          <ScanLine className="mr-2 w-4 h-4" />
          Scan Another Code
        </button>
      </div>

    </div>
  );
};
