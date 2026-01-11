"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Eye, EyeOff, Keyboard, Camera, RefreshCw, Trophy, Zap, AlertTriangle, ScanEye } from "lucide-react";
import { useBlinkDetection } from "../../../hooks/use-blink-detection";
import "./blink-theme.css";

// Game Constants
const INITIAL_WINDOW = 500; // ms
const MIN_WINDOW = 150; // ms
const DIFFICULTY_SCALING = 0.95; // Window gets 5% smaller each success
const FATIGUE_RATE = 0.3; // % per 50ms

type GameState = "IDLE" | "WAITING" | "CHARGING" | "WINDOW" | "SUCCESS" | "GAME_OVER";
type ControlMode = "BUTTON" | "CAMERA";

export default function DontBlinkGame() {
	const [gameState, setGameState] = useState<GameState>("IDLE");
	const [controlMode, setControlMode] = useState<ControlMode>("BUTTON");
	const [score, setScore] = useState(0);
	const [highScore, setHighScore] = useState(0);
	const [message, setMessage] = useState("Don't Blink.");
	const [windowSize, setWindowSize] = useState(INITIAL_WINDOW);
	const [fatigue, setFatigue] = useState(0);
	const [isFakePulse, setIsFakePulse] = useState(false);
	
	// Game Loop Refs
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const stateRef = useRef<GameState>("IDLE");
	const windowStartRef = useRef<number>(0);
	const fatigueRef = useRef(0);
	
	// Update ref for callbacks
	useEffect(() => {
		stateRef.current = gameState;
	}, [gameState]);

	// Cleanup
	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	// Fatigue Loop
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (gameState === "CHARGING" || gameState === "WAITING") {
			interval = setInterval(() => {
				setFatigue(prev => {
					const next = prev + FATIGUE_RATE;
					fatigueRef.current = next;
					if (next >= 100) {
						handleFail("Eyes dried out!");
						return 100;
					}
					return next;
				});
			}, 50);
		} else if (gameState === "IDLE" || gameState === "SUCCESS") {
			setFatigue(0);
			fatigueRef.current = 0;
		}
		return () => clearInterval(interval);
	}, [gameState]);

	// --- Game Logic ---

	const startGame = () => {
		setScore(0);
		setWindowSize(INITIAL_WINDOW);
		setFatigue(0);
		setGameState("WAITING");
		setMessage("Wait for it...");
		scheduleCharge();
	};

	const scheduleCharge = () => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		const delay = 1000 + Math.random() * 2000; // 1-3s random delay
		
		timeoutRef.current = setTimeout(() => {
			startCharge();
		}, delay);
	};

	const startCharge = () => {
		setGameState("CHARGING");
		setMessage("Hold...");
		
		const chargeTime = 1500 + Math.random() * 2500;
		
		// Fake Pulse Logic
		if (Math.random() > 0.6 && chargeTime > 2000) {
			const fakeTime = chargeTime * 0.5;
			setTimeout(() => {
				if (stateRef.current === "CHARGING") {
					setIsFakePulse(true);
					setTimeout(() => setIsFakePulse(false), 200);
				}
			}, fakeTime);
		}

		timeoutRef.current = setTimeout(() => {
			openWindow();
		}, chargeTime);
	};

	const openWindow = () => {
		setGameState("WINDOW");
		setMessage("BLINK NOW!");
		windowStartRef.current = Date.now();

		timeoutRef.current = setTimeout(() => {
			if (stateRef.current === "WINDOW") {
				handleFail("Too slow! Your eyes dried out.");
			}
		}, windowSize);
	};

	const handleSuccess = () => {
		setGameState("SUCCESS");
		setMessage("Nice blink.");
		const newScore = score + 1;
		setScore(newScore);
		if (newScore > highScore) setHighScore(newScore);

		// Make harder
		setWindowSize(Math.max(MIN_WINDOW, windowSize * DIFFICULTY_SCALING));

		timeoutRef.current = setTimeout(() => {
			setGameState("WAITING");
			setMessage("Wait...");
			scheduleCharge();
		}, 1000);
	};

	const handleFail = (reason: string) => {
		if (stateRef.current === "GAME_OVER") return; // Prevent double fail
		setGameState("GAME_OVER");
		setMessage(reason);
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
	};

	// --- Input Handling ---

	const triggerBlink = useCallback(() => {
		const current = stateRef.current;

		if (current === "IDLE" || current === "GAME_OVER") {
			// In camera mode, we might want to prevent accidental starts?
			// For now, let's allow it if it's a deliberate blink (which is hard to distinguish from normal blinking)
			// Maybe only Spacebar starts the game?
			return;
		}

		if (current === "WAITING") {
			// Blinking during waiting is okay (re-wetting eyes), 
			// unless we add a specific mechanic. For now, allowed.
			return;
		}

		if (current === "CHARGING") {
			if (isFakePulse) {
				handleFail("You flinched! Fake out.");
			} else {
				handleFail("Blinked too early! It saw you.");
			}
			return;
		}

		if (current === "WINDOW") {
			handleSuccess();
			return;
		}
	}, [score, highScore, windowSize]); // Deps for inside closure if needed, but using refs mostly

	// Handle Tap/Click for Touch Devices
	const handleTap = useCallback(() => {
		// Prevent tap if clicking a button (handled by event bubbling usually, but good to be safe if we needed manual checks)
		// But here we rely on the main container click
		
		if (gameState === "IDLE" || gameState === "GAME_OVER") {
			startGame();
		} else if (controlMode === "BUTTON") {
			triggerBlink();
		}
	}, [gameState, controlMode, startGame, triggerBlink]);

	// Camera Integration
	const { videoRef, isLoaded: isCameraLoaded, error: cameraError, permissionGranted } = useBlinkDetection(
		controlMode === "CAMERA",
		triggerBlink
	);

	// Keyboard Listener
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				if (gameState === "IDLE" || gameState === "GAME_OVER") {
					startGame();
				} else {
					if (controlMode === "BUTTON") {
						triggerBlink();
					}
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [gameState, triggerBlink, controlMode]);

	// --- Visuals ---

	return (
		<div className="min-h-screen bg-black text-white font-sans overflow-hidden selection:bg-red-500/30">
			
			{/* Camera Feed (Hidden or Picture-in-Picture) */}
			<div className={`absolute bottom-6 right-6 z-40 transition-all duration-500 ${controlMode === "CAMERA" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}`}>
				<div className="relative rounded-xl overflow-hidden border border-white/20 w-48 aspect-video bg-black shadow-2xl">
					<video ref={videoRef} className="w-full h-full object-cover -scale-x-100" autoPlay playsInline muted />
					{!isCameraLoaded && permissionGranted && (
						<div className="absolute inset-0 flex items-center justify-center bg-black/50">
							<div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						</div>
					)}
					{cameraError && (
						<div className="absolute inset-0 flex items-center justify-center bg-red-900/80 p-2 text-center text-xs">
							{cameraError}
						</div>
					)}
					<div className="absolute top-2 right-2 flex gap-1">
						<div className={`w-2 h-2 rounded-full ${isCameraLoaded ? "bg-green-500" : "bg-red-500"}`} />
					</div>
				</div>
				<p className="text-center text-[10px] text-white/30 mt-2 uppercase tracking-widest">Webcam Feed</p>
			</div>
			
			{/* Navbar */}
			<div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
				<Link href="/" className="pointer-events-auto flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white transition-colors glass-panel px-4 py-2 rounded-full">
					<ArrowLeft className="w-4 h-4" />
					<span className="hidden sm:inline">Back</span>
				</Link>

				<div className="pointer-events-auto flex gap-2">
					<button 
						onClick={() => setControlMode("BUTTON")}
						className={`glass-panel px-3 py-2 rounded-full flex items-center gap-2 transition-all ${controlMode === "BUTTON" ? "bg-white/20 border-white/40" : "opacity-50"}`}
					>
						<Keyboard className="w-4 h-4" />
						<span className="text-xs font-bold hidden sm:inline">Button</span>
					</button>
					<button
						onClick={() => setControlMode("CAMERA")}
						className={`glass-panel px-3 py-2 rounded-full flex items-center gap-2 transition-all ${controlMode === "CAMERA" ? "bg-white/20 border-white/40" : "opacity-50"}`}
					>
						<Camera className="w-4 h-4" />
						<span className="text-xs font-bold hidden sm:inline">Camera</span>
					</button>
				</div>
			</div>

			{/* Main Game Container */}
			<main
				className="h-screen w-full flex flex-col items-center justify-center relative touch-manipulation cursor-pointer"
				onClick={handleTap}
			>
				
				{/* Central Eye / Indicator */}
				<div className="relative">
					
					{/* Enemy Eye */}
					<motion.div
						animate={{
							scale: isFakePulse ? [1, 1.4, 1] : gameState === "CHARGING" ? [1, 1.1, 1] : 1,
							filter: gameState === "CHARGING" ? "brightness(1.5)" : "brightness(1)",
							x: isFakePulse ? [0, -10, 10, -10, 10, 0] : 0,
						}}
						transition={{
							duration: isFakePulse ? 0.2 : 0.5,
							repeat: isFakePulse ? 0 : (gameState === "CHARGING" ? Infinity : 0)
						}}
						className={`w-64 h-64 rounded-full flex items-center justify-center transition-all duration-300
							${gameState === "IDLE" ? "bg-white/5 border-4 border-white/10" : ""}
							${gameState === "WAITING" ? "bg-blue-500/10 border-4 border-blue-500/30" : ""}
							${gameState === "CHARGING" ? "bg-red-500/20 border-8 border-red-500 shadow-[0_0_50px_rgba(255,0,0,0.5)]" : ""}
							${gameState === "WINDOW" ? "bg-white border-8 border-white shadow-[0_0_100px_white]" : ""}
							${gameState === "SUCCESS" ? "bg-green-500/20 border-8 border-green-500" : ""}
							${gameState === "GAME_OVER" ? "bg-red-900/50 border-4 border-red-900" : ""}
							${isFakePulse ? "border-white bg-white/50" : ""}
						`}
					>
						{gameState === "IDLE" && <ScanEye className="w-24 h-24 text-white/20" />}
						{gameState === "WAITING" && <Eye className="w-24 h-24 text-blue-500/50" />}
						{gameState === "CHARGING" && <Eye className="w-32 h-32 text-red-500 animate-pulse" />}
						{gameState === "WINDOW" && <div className="w-full h-full bg-white rounded-full animate-ping" />}
						{gameState === "SUCCESS" && <EyeOff className="w-24 h-24 text-green-500" />}
						{gameState === "GAME_OVER" && <AlertTriangle className="w-24 h-24 text-red-500" />}
					</motion.div>

					{/* Fatigue Meter */}
					{gameState !== "IDLE" && (
						<div className="absolute top-0 right-0 left-0 -mt-12 flex justify-center">
							<div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
								<div
									className={`h-full transition-all duration-300 ${fatigue > 80 ? "bg-red-500" : "bg-blue-500"}`}
									style={{ width: `${fatigue}%` }}
								/>
							</div>
							<p className="absolute -top-4 text-[10px] uppercase tracking-wider text-white/50">Eye Fatigue</p>
						</div>
					)}

					{/* Feedback Text */}
					<div className="absolute top-full left-1/2 -translate-x-1/2 mt-8 text-center w-max">
						<h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2 uppercase">
							{message}
						</h2>
						{gameState === "IDLE" && (
							<div className="flex flex-col items-center gap-4">
								<p className="text-white/50 animate-pulse">Press SPACE or Tap to Start</p>
								<button
									onClick={(e) => {
										e.stopPropagation();
										startGame();
									}}
									className="sm:hidden px-6 py-2 bg-white/10 border border-white/20 text-white font-bold rounded-full hover:bg-white/20 transition-all"
								>
									Start Game
								</button>
							</div>
						)}
						{gameState === "GAME_OVER" && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									startGame();
								}}
								className="mt-4 px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
							>
								Try Again
							</button>
						)}
					</div>

				</div>

				{/* Score Display */}
				<div className="absolute bottom-12 flex gap-12 text-center">
					<div>
						<p className="text-xs uppercase tracking-widest text-white/40 mb-1">Score</p>
						<p className="text-4xl font-mono font-bold text-white">{score}</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-widest text-white/40 mb-1">Best</p>
						<p className="text-4xl font-mono font-bold text-yellow-500">{highScore}</p>
					</div>
				</div>

				{/* Instructions Overlay (Only on Idle) */}
				{gameState === "IDLE" && (
					<div className="absolute bottom-32 text-center max-w-md px-6">
						<div className="glass-panel p-6 rounded-2xl text-sm text-white/70 leading-relaxed">
							<p className="mb-2"><strong className="text-white">How to Play:</strong></p>
							<p>1. Wait for the Red Eye to charge.</p>
							<p>2. When it flashes <strong className="text-white">WHITE</strong>, blink immediately.</p>
							<p>3. Do not blink while it is charging.</p>
							<p className="mt-4 text-xs opacity-50">Press Spacebar or Tap Screen to Blink (Button Mode)</p>
						</div>
					</div>
				)}

			</main>
		</div>
	);
}