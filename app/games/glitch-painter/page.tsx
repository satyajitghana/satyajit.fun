"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "motion/react";
import { ArrowLeft, Save, Trash2, Zap, Layers, Scissors, MousePointer2 } from "lucide-react";
import "./glitch-theme.css";

// Types
interface GlitchElement {
  id: string;
  type: "button" | "window" | "input" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  rotation: number;
  isBroken: boolean;
}

interface Point {
  x: number;
  y: number;
}

export default function GlitchPainter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<GlitchElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<"drag" | "smear" | "tear" | "corrupt">("drag");
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [desyncLevel, setDesyncLevel] = useState(0);
  
  // Initialize canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setCanvasSize({ width: clientWidth, height: clientHeight });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Update canvas dimensions when size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Save current content
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) tempCtx.drawImage(canvas, 0, 0);

      // Resize
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;

      // Restore content
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "#0a0a0a"; // Background color
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }
  }, [canvasSize]);

  // Initial Elements
  useEffect(() => {
    setElements([
      { id: "1", type: "window", x: 100, y: 100, width: 200, height: 150, content: "System Error", color: "#333", rotation: 0, isBroken: false },
      { id: "2", type: "button", x: 400, y: 200, width: 120, height: 40, content: "Submit", color: "#00ff41", rotation: 0, isBroken: false },
      { id: "3", type: "input", x: 150, y: 400, width: 250, height: 50, content: "password...", color: "#fff", rotation: 0, isBroken: false },
    ]);
  }, []);

  // Canvas Interaction Logic
  const handleDrag = (id: string, point: Point) => {
    const element = elements.find(el => el.id === id);
    if (!element) return;

    // Standard Drag update
    setElements(prev => prev.map(el => el.id === id ? { ...el, x: point.x, y: point.y } : el));

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Tool Effects
    if (selectedTool === "smear") {
      ctx.save();
      ctx.translate(point.x + element.width/2, point.y + element.height/2);
      ctx.rotate(element.rotation * Math.PI / 180);
      ctx.translate(-(point.x + element.width/2), -(point.y + element.height/2));
      
      if (element.type === "button") {
          ctx.fillStyle = element.color;
          ctx.shadowColor = element.color;
          ctx.shadowBlur = 10;
          ctx.globalAlpha = 0.4;
          ctx.fillRect(point.x, point.y, element.width, element.height);
      } else if (element.type === "window") {
          ctx.fillStyle = "#1a1a1a";
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.2;
          ctx.fillRect(point.x, point.y, element.width, element.height);
          ctx.strokeRect(point.x, point.y, element.width, element.height);
      } else if (element.type === "input") {
          ctx.fillStyle = "#000";
          ctx.strokeStyle = element.color;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(point.x, point.y, element.width, element.height);
          ctx.strokeRect(point.x, point.y, element.width, element.height);
      }
      ctx.restore();
    }
    
    else if (selectedTool === "tear") {
        if (Math.random() > 0.3) { // Stutter the tear
            const sliceHeight = Math.random() * (element.height / 2) + 2;
            const sliceYOffset = Math.random() * (element.height - sliceHeight);
            const tearOffset = (Math.random() - 0.5) * 20;

            ctx.save();
            ctx.translate(point.x + element.width/2 + tearOffset, point.y + element.height/2);
            ctx.rotate(element.rotation * Math.PI / 180);
            ctx.translate(-(point.x + element.width/2), -(point.y + element.height/2));

            // Clip to just a slice
            ctx.beginPath();
            ctx.rect(point.x, point.y + sliceYOffset, element.width, sliceHeight);
            ctx.clip();

            // Draw content in that slice
            ctx.fillStyle = element.color;
            if (element.type === "window") ctx.fillStyle = "#2a2a2a";
            if (element.type === "input") ctx.fillStyle = "#111";
            
            ctx.fillRect(point.x, point.y, element.width, element.height);
            ctx.restore();
        }
    }

    else if (selectedTool === "corrupt") {
        // Corrupt interacts with the element's state directly
        if (Math.random() > 0.8) {
            setElements(prev => prev.map(el => {
                if (el.id !== id) return el;
                return {
                    ...el,
                    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                    rotation: el.rotation + (Math.random() - 0.5) * 10,
                    content: el.content.split('').map(c => Math.random() > 0.9 ? String.fromCharCode(33 + Math.random()*90) : c).join(''),
                    isBroken: true
                }
            }));
        }
    }
  };

  const spawnElement = () => {
    const types: GlitchElement["type"][] = ["button", "window", "input"];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const newElement: GlitchElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: randomType,
      x: Math.random() * (canvasSize.width - 200) + 100,
      y: Math.random() * (canvasSize.height - 100) + 50,
      width: randomType === "window" ? 200 : 120,
      height: randomType === "window" ? 150 : 40,
      content: randomType === "button" ? "Click Me" : randomType === "window" ? "Alert" : "Type here",
      color: randomType === "button" ? "#ff00ff" : "#333",
      rotation: (Math.random() - 0.5) * 10,
      isBroken: false
    };
    setElements(prev => [...prev, newElement]);
  };

  const clearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
          ctx.fillStyle = "#0a0a0a";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      setElements([]); // Clear UI elements too? Or just canvas? Let's clear both for now or maybe keep UI.
      // Resetting UI elements to initial state
      setElements([
        { id: "1", type: "window", x: 100, y: 100, width: 200, height: 150, content: "System Error", color: "#333", rotation: 0, isBroken: false },
        { id: "2", type: "button", x: 400, y: 200, width: 120, height: 40, content: "Submit", color: "#00ff41", rotation: 0, isBroken: false },
      ]);
  };
  
  const corruptCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Randomly shift channels or pixels
      for (let i = 0; i < data.length; i += 4) {
          if (Math.random() > 0.95) {
              data[i] = data[i + 4] || data[i]; // Shift Red
          }
           if (Math.random() > 0.98) {
              data[i+1] = 0; // Kill Green
          }
      }
      
      // Slice and displace
      const sliceHeight = Math.random() * 50;
      const sliceY = Math.random() * canvas.height;
      const offset = (Math.random() - 0.5) * 50;
      
      ctx.putImageData(imageData, 0, 0);
      ctx.drawImage(canvas, 0, sliceY, canvas.width, sliceHeight, offset, sliceY, canvas.width, sliceHeight);
  };

  const downloadArt = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // 1. Create a temp canvas to combine everything
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      // 2. Draw the background (smears/tears)
      ctx.drawImage(canvas, 0, 0);

      // 3. Draw the active elements on top
      elements.forEach(el => {
          ctx.save();
          ctx.translate(el.x + el.width/2, el.y + el.height/2);
          ctx.rotate(el.rotation * Math.PI / 180);
          ctx.translate(-(el.x + el.width/2), -(el.y + el.height/2));

          // Simple vector approximation of the DOM elements
          if (el.type === 'window') {
              ctx.fillStyle = "#1a1a1a";
              ctx.strokeStyle = "#333";
              ctx.lineWidth = 1;
              ctx.fillRect(el.x, el.y, el.width, el.height);
              ctx.strokeRect(el.x, el.y, el.width, el.height);
              
              // Header
              ctx.fillStyle = "#333";
              ctx.fillRect(el.x, el.y, el.width, 24);
              ctx.fillStyle = "#fff";
              ctx.font = "12px monospace";
              ctx.fillText(el.content, el.x + 8, el.y + 16);
          }
          else if (el.type === 'button') {
              ctx.fillStyle = el.color;
              ctx.fillRect(el.x, el.y, el.width, el.height);
              ctx.fillStyle = "#fff";
              ctx.font = "bold 14px monospace";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(el.content, el.x + el.width/2, el.y + el.height/2);
          }
          else if (el.type === 'input') {
              ctx.fillStyle = "#000";
              ctx.strokeStyle = el.color;
              ctx.lineWidth = 2;
              ctx.fillRect(el.x, el.y, el.width, el.height);
              ctx.beginPath();
              ctx.moveTo(el.x, el.y + el.height);
              ctx.lineTo(el.x + el.width, el.y + el.height);
              ctx.stroke();
              
              ctx.fillStyle = el.color;
              ctx.font = "14px monospace";
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(el.content, el.x + 8, el.y + el.height/2);
          }

          ctx.restore();
      });

      const link = document.createElement('a');
      link.download = `glitch-art-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL();
      link.click();
  };

  // Desync Effect (Jitter)
  useEffect(() => {
    if (desyncLevel === 0) return;

    const interval = setInterval(() => {
        setElements(prev => prev.map(el => {
            const jitterX = (Math.random() - 0.5) * (desyncLevel / 10);
            const jitterY = (Math.random() - 0.5) * (desyncLevel / 10);
            return {
                ...el,
                x: el.x + jitterX,
                y: el.y + jitterY
            };
        }));
    }, 50);

    return () => clearInterval(interval);
  }, [desyncLevel]);

  return (
    <div className="glitch-game-theme min-h-screen bg-[var(--glitch-bg)] text-[var(--glitch-fg)] overflow-hidden font-jetbrains selection:bg-[var(--glitch-accent)] selection:text-white relative">
      <div className="scanlines" />
      <div className="vignette" />
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center pointer-events-none">
        <Link href="/" className="pointer-events-auto flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-[var(--glitch-accent)] transition-colors border border-[var(--glitch-ui-border)] bg-[var(--glitch-ui-bg)] px-4 py-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Exit</span>
        </Link>
        
        <div className="pointer-events-auto flex gap-2 items-center">
             <div className="flex flex-col gap-1 mr-4 w-32">
                <label className="text-[10px] uppercase font-bold text-[var(--glitch-ui-border)] flex justify-between">
                    <span>Desync</span>
                    <span>{desyncLevel}%</span>
                </label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={desyncLevel}
                    onChange={(e) => setDesyncLevel(parseInt(e.target.value))}
                    className="h-1 bg-[var(--glitch-ui-border)] appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[var(--glitch-accent)]"
                />
            </div>

            <button onClick={spawnElement} className="flex items-center gap-2 px-4 py-2 border border-[var(--glitch-ui-border)] bg-[var(--glitch-ui-bg)] hover:bg-[var(--glitch-accent)] hover:text-white transition-colors">
                <Layers className="w-4 h-4" />
                Spawn
            </button>
             <button onClick={downloadArt} className="flex items-center gap-2 px-4 py-2 border border-[var(--glitch-ui-border)] bg-[var(--glitch-ui-bg)] hover:bg-[var(--glitch-fg)] hover:text-black transition-colors">
                <Save className="w-4 h-4" />
                Save
            </button>
        </div>
      </div>

      <div className="flex h-screen pt-16 pb-4 px-4 gap-4">
          {/* Tools Sidebar */}
          <div className="w-20 flex flex-col gap-4 z-40 pointer-events-auto">
              <ToolButton icon={<MousePointer2 />} label="Drag" active={selectedTool === "drag"} onClick={() => setSelectedTool("drag")} />
              <ToolButton icon={<Zap />} label="Smear" active={selectedTool === "smear"} onClick={() => setSelectedTool("smear")} />
              <ToolButton icon={<Scissors />} label="Tear" active={selectedTool === "tear"} onClick={() => setSelectedTool("tear")} />
              <ToolButton icon={<Layers />} label="Corrupt" active={selectedTool === "corrupt"} onClick={() => setSelectedTool("corrupt")} />
              
              <div className="h-px bg-[var(--glitch-ui-border)] my-2" />
              
              <button onClick={corruptCanvas} className="w-full aspect-square flex flex-col items-center justify-center gap-1 border border-[var(--glitch-ui-border)] bg-[var(--glitch-ui-bg)] hover:bg-white hover:text-black transition-all">
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold">Glitch</span>
              </button>

              <div className="flex-1" />
              <ToolButton icon={<Trash2 />} label="Clear" active={false} onClick={clearCanvas} dangerous />
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 relative border border-[var(--glitch-ui-border)] bg-[#050505] overflow-hidden" ref={containerRef}>
             <canvas 
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
             />
             
             {/* Draggable UI Elements */}
             {elements.map((el) => (
                 <GlitchableElement 
                    key={el.id} 
                    data={el} 
                    tool={selectedTool}
                    onDrag={(point) => handleDrag(el.id, point)}
                 />
             ))}
             
             <div className="absolute bottom-4 right-4 text-[var(--glitch-ui-border)] text-xs select-none pointer-events-none">
                 GLITCH_OS v0.1.0-alpha
             </div>
          </div>
      </div>
    </div>
  );
}

function ToolButton({ icon, label, active, onClick, dangerous }: { icon: any, label: string, active: boolean, onClick: () => void, dangerous?: boolean }) {
    return (
        <button 
            onClick={onClick}
            className={`w-full aspect-square flex flex-col items-center justify-center gap-1 border transition-all
                ${active 
                    ? 'bg-[var(--glitch-fg)] text-black border-[var(--glitch-fg)]' 
                    : 'bg-[var(--glitch-ui-bg)] text-[var(--glitch-fg)] border-[var(--glitch-ui-border)] hover:border-[var(--glitch-fg)]'}
                ${dangerous ? 'hover:bg-red-900 hover:border-red-500 hover:text-red-500' : ''}
            `}
        >
            {icon}
            <span className="text-[10px] uppercase font-bold">{label}</span>
        </button>
    )
}

function GlitchableElement({ data, tool, onDrag }: { data: GlitchElement, tool: string, onDrag: (p: Point) => void }) {
    const x = useMotionValue(data.x);
    const y = useMotionValue(data.y);

    return (
        <motion.div
            drag
            dragMomentum={false}
            style={{ x, y, rotate: data.rotation }}
            onDrag={(e, info) => {
                onDrag({ x: info.point.x - data.width/2, y: info.point.y - data.height/2 }); // Centering approximation
            }}
            className={`absolute cursor-move select-none group`}
        >
            {/* Element Rendering based on type */}
            {data.type === "window" && (
                <div 
                    style={{ width: data.width, height: data.height }}
                    className="bg-[#1a1a1a] border border-[#333] shadow-xl flex flex-col overflow-hidden"
                >
                    <div className="h-6 bg-[#333] flex items-center px-2 justify-between">
                        <span className="text-xs text-white/70">{data.content}</span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        </div>
                    </div>
                    <div className="p-4 flex-1 text-[#00ff41] font-jetbrains text-sm overflow-hidden relative">
                         <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                         {'>'} SYSTEM FAILURE<br/>
                         {'>'} REBOOT REQUIRED<br/>
                         {'>'} ERROR_CODE: 0xDEAD
                    </div>
                </div>
            )}
            
            {data.type === "button" && (
                <div 
                     style={{ width: data.width, height: data.height }}
                     className="bg-[var(--glitch-accent)] text-white font-bold uppercase tracking-wider flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                    {data.content}
                </div>
            )}

            {data.type === "input" && (
                 <div
                    style={{ width: data.width, height: data.height }}
                    className="bg-black border-b-2 border-[var(--glitch-fg)] p-2 text-[var(--glitch-fg)] font-jetbrains flex items-center"
                 >
                    {data.content}<span className="animate-pulse">_</span>
                 </div>
            )}
            
        </motion.div>
    )
}