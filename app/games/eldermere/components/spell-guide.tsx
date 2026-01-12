'use client';

import { useEffect, useRef, useState } from 'react';
import { SPELL_PATHS } from '../lib/spell-paths';

interface SpellGuideProps {
    spellId: string;
    ghostMode?: boolean;
}

export function SpellGuide({ spellId, ghostMode = false }: SpellGuideProps) {
    const pathData = SPELL_PATHS[spellId];
    const [handPos, setHandPos] = useState({ x: 0.5, y: 0.5 });
    const [activeCheckpoints, setActiveCheckpoints] = useState<number[]>([]);
    const [trail, setTrail] = useState<{ x: number, y: number, id: number }[]>([]);
    const trailIdCounter = useRef(0);

    useEffect(() => {
        const handleLandmarks = (event: CustomEvent) => {
            const landmarks = event.detail.landmarks[0];
            if (landmarks) {
                // Index finger tip
                const indexTip = landmarks[8];
                const newPos = { x: 1 - indexTip.x, y: indexTip.y };
                setHandPos(newPos);

                // Add to trail
                trailIdCounter.current++;
                setTrail(prev => [...prev.slice(-15), { x: newPos.x, y: newPos.y, id: trailIdCounter.current }]);
            }
        };

        window.addEventListener('hand-landmarks', handleLandmarks as EventListener);
        return () => window.removeEventListener('hand-landmarks', handleLandmarks as EventListener);
    }, []);

    // Checkpoint hit detection
    useEffect(() => {
        if (!pathData) return;

        // Even in ghost mode (exam), we allow tracking checkpoints for success as a fallback
        // But we make the hit threshold stricter to ensure precision

        pathData.points.forEach((point, index) => {
            if (point.isCheckpoint && !activeCheckpoints.includes(index)) {
                const dist = Math.sqrt(Math.pow(handPos.x - point.x, 2) + Math.pow(handPos.y - point.y, 2));
                const threshold = ghostMode ? 0.05 : 0.08; // Stricter in exam
                if (dist < threshold) {
                    setActiveCheckpoints(prev => [...prev, index]);
                }
            }
        });

        // Reset if all hit or new spell
        if (activeCheckpoints.length === pathData.points.filter(p => p.isCheckpoint).length && pathData.points.length > 0) {
            // Dispatch success event
            window.dispatchEvent(new CustomEvent('cast-spell', {
                detail: { type: spellId, origin: { x: 0, y: 0, z: 0 } }
            }));

            setTimeout(() => setActiveCheckpoints([]), 500);
        }
    }, [handPos, pathData, activeCheckpoints, spellId, ghostMode]);

    // Reset on spell change
    useEffect(() => {
        setActiveCheckpoints([]);
        setTrail([]);
    }, [spellId]);

    if (!pathData) return null;

    return (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-30 transition-opacity duration-500 ${ghostMode ? 'opacity-30' : 'opacity-100'}`}>
            <div className="relative w-[80vh] h-[80vh]">
                <svg
                    viewBox="0 0 100 100"
                    className={`w-full h-full ${ghostMode ? '' : 'drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]'}`}
                >
                    {/* Guide Path Background */}
                    <path
                        d={pathData.svgPath}
                        fill="none"
                        stroke={ghostMode ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)"}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={ghostMode ? "10 5" : "0"}
                    />

                    {/* Guide Path Foreground (Pulse) - Hide in ghost mode */}
                    {!ghostMode && (
                        <path
                            d={pathData.svgPath}
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="4 6"
                        >
                            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="3s" repeatCount="indefinite" />
                        </path>
                    )}

                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
                            <stop offset="50%" stopColor="#d8b4fe" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Trail */}
                    <polyline
                        points={trail.map(p => `${p.x * 100},${p.y * 100}`).join(' ')}
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.6"
                        filter="url(#glow)"
                    />

                    {/* Checkpoints - Only show simple dots in ghost mode */}
                    {pathData.points.map((point, index) => (
                        point.isCheckpoint && (
                            <g key={index}>
                                {/* Checkpoint Dot */}
                                <circle
                                    cx={point.x * 100}
                                    cy={point.y * 100}
                                    r={ghostMode ? 2 : (activeCheckpoints.includes(index) ? 4.5 : 3.5)}
                                    fill={ghostMode ? "rgba(255,255,255,0.2)" : (activeCheckpoints.includes(index) ? "#4ade80" : "#1e1b4b")}
                                    stroke={ghostMode ? "none" : (activeCheckpoints.includes(index) ? "#ffffff" : "#a855f7")}
                                    strokeWidth="1"
                                    className="transition-all duration-300"
                                />

                                {/* Pulse for Next Target */}
                                {!ghostMode && !activeCheckpoints.includes(index) && index === activeCheckpoints.length && (
                                    <circle
                                        cx={point.x * 100}
                                        cy={point.y * 100}
                                        r="6"
                                        fill="none"
                                        stroke="#a855f7"
                                        strokeWidth="0.5"
                                    >
                                        <animate attributeName="r" from="4" to="8" dur="1s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" from="1" to="0" dur="1s" repeatCount="indefinite" />
                                    </circle>
                                )}
                                {/* Ripple Effect if Active (Not in ghost mode) */}
                                {!ghostMode && activeCheckpoints.includes(index) && (
                                    <circle
                                        cx={point.x * 100}
                                        cy={point.y * 100}
                                        r="8"
                                        fill="none"
                                        stroke="#4ade80"
                                        strokeWidth="0.5"
                                        opacity="0.5"
                                    >
                                        <animate attributeName="r" from="4" to="12" dur="1s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" from="0.8" to="0" dur="1s" repeatCount="indefinite" />
                                    </circle>
                                )}
                                {(!ghostMode && point.label) && (
                                    <text
                                        x={point.x * 100}
                                        y={(point.y * 100) - 8}
                                        textAnchor="middle"
                                        fill="#e9d5ff"
                                        fontSize="4"
                                        fontFamily="Cinzel"
                                        fontWeight="bold"
                                        className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                                        style={{ textShadow: '0 0 5px #a855f7' }}
                                    >
                                        {point.label}
                                    </text>
                                )}
                            </g>
                        )
                    ))}

                    {/* User Hand Cursor */}
                    <circle
                        cx={handPos.x * 100}
                        cy={handPos.y * 100}
                        r="2.5"
                        fill="#60a5fa"
                        stroke="white"
                        strokeWidth="1"
                        filter="url(#glow)"
                    />
                </svg>
            </div>
        </div>
    );
}