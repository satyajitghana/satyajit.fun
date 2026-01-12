'use client';

import React, { useState, useEffect, useRef } from 'react';
import './archaeology-theme.css';
import { 
  Wifi, 
  WifiOff, 
  UploadCloud, 
  AlertCircle, 
  Monitor, 
  HardDrive, 
  Save, 
  X, 
  Minus, 
  Square,
  ChevronRight,
  Terminal,
  Cpu,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// Game Constants
const LAYER_MODERN = 0;
const LAYER_RETRO = 1;
const LAYER_TERMINAL = 2;

export default function InterfaceArchaeology() {
  const [depth, setDepth] = useState(0);
  
  // Game State
  const [irqFixed, setIrqFixed] = useState(false);
  const [adapterEnabled, setAdapterEnabled] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "BOOT_SEQUENCE_INIT...",
    "LOADING KERNEL... OK",
    "MOUNTING VOLUMES... OK",
    "CHECKING PERIPHERALS...",
    "ERROR: IRQ CONFLICT DETECTED ON BUS 0x2F",
    "NETWORK ADAPTER HALTED",
    "> _"
  ]);

  // Handle Depth Change
  const handleDepthChange = (val: number[]) => {
    setDepth(val[0]);
  };

  // --- MODERN LAYER LOGIC ---
  const handleUpload = () => {
    if (adapterEnabled) {
      setUploadComplete(true);
    }
  };

  // --- RETRO LAYER LOGIC ---
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  
  const handleEnableDevice = () => {
    if (irqFixed) {
      setAdapterEnabled(true);
    } else {
      // Error sound or visual shake
      alert("Error Code 43: Device cannot start due to resource conflict.");
    }
  };

  // --- TERMINAL LAYER LOGIC ---
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim().toUpperCase();
    const newLogs = [...terminalLogs];
    // Remove the last empty prompt if it exists to clean up history
    if (newLogs[newLogs.length - 1] === "> _") {
        newLogs.pop();
    }
    newLogs.push(`> ${terminalInput}`);

    if (cmd === "HELP") {
        newLogs.push("AVAILABLE COMMANDS: SCAN, PATCH [ADDR], EXIT");
    } else if (cmd === "SCAN") {
        newLogs.push("SCANNING BUS...");
        newLogs.push("DEVICE 0: DISK CONTROLLER (IRQ 14)");
        newLogs.push("DEVICE 1: NETWORK ADAPTER (IRQ 14) <CONFLICT>");
    } else if (cmd.startsWith("PATCH")) {
        if (cmd === "PATCH 14" || cmd === "PATCH 0X2F") {
             newLogs.push("PATCHING INTERRUPT VECTOR...");
             newLogs.push("REASSIGNING NETWORK TO IRQ 15...");
             newLogs.push("SUCCESS. REBOOT REQUIRED."); 
             setIrqFixed(true);
        } else {
             newLogs.push("ERROR: INVALID ADDRESS OR IRQ");
        }
    } else if (cmd === "EXIT") {
        newLogs.push("LOGGING OFF...");
    } else if (cmd === "") {
        // do nothing
    } else {
        newLogs.push("UNKNOWN COMMAND");
    }

    // Add new prompt
    newLogs.push("> _");

    if (newLogs.length > 14) {
        // Keep buffer small, remove from top
        const diff = newLogs.length - 14;
        newLogs.splice(0, diff);
    }
    
    setTerminalLogs(newLogs);
    setTerminalInput('');
  };

  return (
    <div className="archaeology-container bg-black h-screen w-full relative overflow-hidden">
      
      {/* 
          LAYERS 
          We render all of them but control opacity/visibility based on depth.
          This creates the "stack" feeling.
      */}
      
      {/* LAYER 2: TERMINAL (The Deepest) */}
      <div 
        className="layer-terminal"
        style={{ 
            opacity: depth >= 1.5 ? 1 : 0,
            pointerEvents: depth >= 1.5 ? 'auto' : 'none',
            zIndex: 10
        }}
      >
        <div className="terminal-scanline"></div>
        <div className="max-w-4xl mx-auto mt-20 font-ibm-plex text-green-500">
            <div className="mb-4 text-xs opacity-50">SYSTEM_BIOS_V1.02 // {new Date().getFullYear() - 30}</div>
            
            <div className="flex flex-col gap-1 min-h-[400px]">
                {terminalLogs.map((log, i) => (
                    <div key={i} className={`terminal-entry ${log.includes("ERROR") || log.includes("CONFLICT") ? "error" : ""}`}>
                        {log}
                    </div>
                ))}
                {irqFixed && !terminalLogs.some(l => l.includes("SUCCESS")) && <div className="text-blue-400">SYSTEM STABLE. READY FOR OS BOOT.</div>}
            </div>

            <form onSubmit={handleTerminalSubmit} className="mt-4 flex gap-2 items-center border-t border-green-900 pt-4">
                <span className="terminal-glow">{">"}</span>
                <input 
                    type="text" 
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    className="bg-transparent border-none outline-none text-green-400 flex-1 font-ibm-plex uppercase"
                    autoFocus={depth === 2}
                    placeholder={irqFixed ? "SYSTEM READY" : "ENTER COMMAND..."}
                    disabled={irqFixed}
                />
            </form>
            <div className="mt-8 text-xs text-green-800">
                HINT: TYPE 'SCAN' TO DIAGNOSE. 'PATCH' TO FIX CONFLICTS.
            </div>
        </div>
      </div>

      {/* LAYER 1: RETRO (The Middle) */}
      <div 
        className="layer-retro"
        style={{ 
            opacity: (depth >= 0.5 && depth < 1.5) ? 1 : 0,
            pointerEvents: (depth >= 0.5 && depth < 1.5) ? 'auto' : 'none',
            zIndex: 20
        }}
      >
        <div className="retro-window">
            <div className="retro-title-bar">
                <div className="flex items-center gap-2">
                    <Monitor size={14} />
                    <span>Device Manager</span>
                </div>
                <div className="flex gap-1">
                    <button className="retro-btn text-[10px] h-4 w-4 flex items-center justify-center"><Minus size={10}/></button>
                    <button className="retro-btn text-[10px] h-4 w-4 flex items-center justify-center"><Square size={8}/></button>
                    <button className="retro-btn text-[10px] h-4 w-4 flex items-center justify-center"><X size={10}/></button>
                </div>
            </div>
            
            <div className="retro-content">
                <div className="retro-tree-view">
                    <div className="retro-tree-item font-bold flex items-center gap-1">
                        <Monitor size={12} /> Desktop-PC
                    </div>
                    <div className="pl-4">
                        <div className="retro-tree-item flex items-center gap-1">
                            <span className="text-gray-500">[+]</span> <HardDrive size={12} /> Disk Drives
                        </div>
                        <div className="retro-tree-item flex items-center gap-1">
                             <span className="text-gray-500">[-]</span> <Cpu size={12} /> Network Adapters
                        </div>
                        <div className="pl-6">
                            <div 
                                className={`retro-tree-item flex items-center gap-1 ${selectedDevice === 'eth0' ? 'selected' : ''}`}
                                onClick={() => setSelectedDevice('eth0')}
                            >
                                {adapterEnabled ? <Wifi size={12} /> : <AlertCircle size={12} className="text-red-600" />}
                                3Com EtherLink III
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                    <button 
                        className="retro-btn"
                        disabled={selectedDevice !== 'eth0' || adapterEnabled}
                        onClick={handleEnableDevice}
                    >
                        {adapterEnabled ? "Enabled" : "Enable Driver"}
                    </button>
                    <button className="retro-btn">Properties</button>
                </div>

                <div className="border-t border-gray-400 pt-2 text-xs">
                    Status: {adapterEnabled ? "Working Properly" : irqFixed ? "Ready to initialize" : "Resource Conflict (Code 14)"}
                </div>
            </div>
        </div>
      </div>

      {/* LAYER 0: MODERN (The Surface) */}
      <div 
        className="layer-modern"
        style={{ 
            opacity: depth < 0.5 ? 1 : 0,
            pointerEvents: depth < 0.5 ? 'auto' : 'none',
            zIndex: 30
        }}
      >
        <div className="modern-card">
            <div className="flex justify-center mb-6">
                <div className={`p-4 rounded-full ${uploadComplete ? 'bg-green-100' : 'bg-red-100'}`}>
                    {uploadComplete ? (
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    ) : adapterEnabled ? (
                        <Wifi className="w-12 h-12 text-blue-600" />
                    ) : (
                        <WifiOff className="w-12 h-12 text-red-500" />
                    )}
                </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {uploadComplete ? "Upload Complete" : "Cloud Sync"}
            </h1>
            
            <p className="text-gray-500 mb-8">
                {uploadComplete 
                    ? "Your interface history has been successfully archived."
                    : adapterEnabled 
                        ? "Connection restored. Ready to upload payload."
                        : "Network connection unavailable. Please check your internet settings."}
            </p>

            <button 
                className="modern-btn disabled:opacity-50"
                onClick={handleUpload}
                disabled={!adapterEnabled || uploadComplete}
            >
                {uploadComplete ? "Done" : adapterEnabled ? "Upload Data" : "Connection Error"}
            </button>
        </div>
      </div>


      {/* CONTROLS (Always on top) */}
      <div className="archaeology-controls">
        <div className="text-white font-ibm-plex text-xs rotate-90 origin-left translate-x-4 mb-4 whitespace-nowrap">
            INTERFACE DEPTH
        </div>
        <div className="depth-slider-container">
            <Slider
                orientation="vertical"
                defaultValue={[0]}
                max={2}
                min={0}
                step={0.01}
                value={[depth]}
                onValueChange={handleDepthChange}
                className="h-full"
            />
        </div>
        <div className="text-white/50 text-xs font-ibm-plex flex flex-col gap-8">
            <span className={depth < 0.5 ? "text-blue-400 font-bold" : ""}>2024</span>
            <span className={depth >= 0.5 && depth < 1.5 ? "text-teal-400 font-bold" : ""}>1995</span>
            <span className={depth >= 1.5 ? "text-green-400 font-bold" : ""}>1980</span>
        </div>
      </div>
      
    </div>
  );
}