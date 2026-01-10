'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Color from 'color';
import { GameNavbar } from '@/components/game-navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Target, ArrowRight, Home, RefreshCw, Trophy } from 'lucide-react';
import {
	ColorPicker,
	ColorPickerSelection,
	ColorPickerHue,
} from '@/components/color-picker';
import './colour-theme.css';
import Link from 'next/link';
import { useWindowSize } from 'react-use';

// Define the ColorPicker specific types locally if not exported
interface ColorPickerProps {
	value?: string | object; // Adjust based on library
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onChange?: (color: any) => void;
	className?: string;
}

const TOTAL_ROUNDS = 5;

// Generate a random color
const generateRandomColor = () => {
	const r = Math.floor(Math.random() * 256);
	const g = Math.floor(Math.random() * 256);
	const b = Math.floor(Math.random() * 256);
	return Color.rgb(r, g, b);
};

// Calculate score based on distance between two colors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const calculateScore = (target: any, guess: any) => {
	// Using RGB euclidean distance for simplicity, could be CIELAB for perceptual accuracy
	const rDiff = target.red() - guess.red();
	const gDiff = target.green() - guess.green();
	const bDiff = target.blue() - guess.blue();

	// Max distance is sqrt(255^2 * 3) ≈ 441.67
	const distance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
	const maxDistance = 442;

	// Score from 0 to 1000
	const score = Math.max(0, Math.round((1 - distance / maxDistance) * 1000));

	// Bonus for very close guesses
	if (score > 950) return 1000;
	if (score > 900) return score + 50;

	return score;
};

// Helper to determine text color based on background luminance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getContrastColor = (color: any) => {
	return color.isLight() ? 'black' : 'white';
};

export default function ColourGeoGuesser() {
	const [mounted, setMounted] = useState(false);
	const [round, setRound] = useState(1);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [targetColor, setTargetColor] = useState<any>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [guessColor, setGuessColor] = useState<any>(null);
	const [roundScore, setRoundScore] = useState<number | null>(null);
	const [totalScore, setTotalScore] = useState(0);

	useEffect(() => {
		setMounted(true);
		setTargetColor(generateRandomColor());
		setGuessColor(Color('#ffffff'));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const [gameState, setGameState] = useState<'playing' | 'round_result' | 'game_over'>('playing');
	const [history, setHistory] = useState<Array<{ round: number; target: string; guess: string; score: number }>>([]);
	const { width, height } = useWindowSize(); // Keep for potential use or responsiveness

	const handleGuess = () => {
		if (!targetColor || !guessColor) return;
		const score = calculateScore(targetColor, guessColor);
		setRoundScore(score);
		setTotalScore((prev) => prev + score);
		setHistory((prev) => [
			...prev,
			{
				round,
				target: targetColor.hex(),
				guess: guessColor.hex(),
				score,
			},
		]);
		setGameState('round_result');
	};

	const nextRound = () => {
		if (round >= TOTAL_ROUNDS) {
			setGameState('game_over');
		} else {
			setRound((prev) => prev + 1);
			setTargetColor(generateRandomColor());
			setGuessColor(Color('#ffffff')); // Reset picker to white or center?
			setRoundScore(null);
			setGameState('playing');
		}
	};

	const restartGame = () => {
		setRound(1);
		setTargetColor(generateRandomColor());
		setGuessColor(Color('#ffffff'));
		setRoundScore(null);
		setTotalScore(0);
		setHistory([]);
		setGameState('playing');
	};

	// Safe color update from picker
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleColorChange = (color: any) => {
		// ColorPicker returns [r, g, b, a] array
		if (Array.isArray(color)) {
			setGuessColor(Color.rgb(color[0], color[1], color[2]).alpha(color[3]));
		}
	};

	if (!mounted || !targetColor || !guessColor) {
		return <div className="min-h-screen bg-game" />;
	}

	return (
		<div className="colour-game-theme bg-game min-h-screen font-sans selection:bg-primary/30 relative overflow-hidden">

			<GameNavbar accentColor="#8b5cf6">
				<div className="flex items-center gap-6">
					<div className="flex flex-col items-end">
						<span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Round</span>
						<span className="text-sm font-bold font-mono">{gameState === 'game_over' ? TOTAL_ROUNDS : round}<span className="text-muted-foreground">/</span>{TOTAL_ROUNDS}</span>
					</div>
					<div className="h-8 w-px bg-white/10" />
					<div className="flex flex-col items-start">
						<span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Score</span>
						<span className="text-sm font-bold font-mono text-primary">{totalScore}</span>
					</div>
				</div>
			</GameNavbar>

			<main className="container max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] relative z-10">
				<AnimatePresence mode="wait">
					{gameState === 'playing' && (
						<motion.div
							key="playing"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							className="w-full flex flex-col md:flex-row gap-8 md:gap-16 items-center justify-center"
						>
							{/* Target Color Display */}
							<div className="flex flex-col items-center gap-8">
								<motion.div
									className="relative group"
									initial={{ scale: 0.95 }}
									animate={{ scale: 1 }}
									transition={{ type: "spring", bounce: 0.3 }}
								>
									{/* Glow behind target */}
									<div
										className="absolute -inset-8 rounded-[3rem] blur-3xl opacity-20 transition-opacity duration-1000"
										style={{ backgroundColor: targetColor.hex() }}
									/>

									<div className="relative">
										<div className="absolute inset-0 bg-white/5 rounded-[2.5rem] transform translate-y-2 translate-x-2" />
										<div
											className="relative w-64 h-64 md:w-80 md:h-80 rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-white/5"
											style={{ backgroundColor: targetColor.hex() }}
										>
											<span
												className="font-mono text-lg font-bold opacity-0 group-hover:opacity-50 transition-opacity duration-300 tracking-widest uppercase"
												style={{ color: getContrastColor(targetColor) }}
											>
												Target
											</span>
										</div>
									</div>
								</motion.div>

								<div className="text-center space-y-2">
									<h2 className="text-3xl font-bold tracking-tight">Match This Color</h2>
									<p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">Use the picker to replicate the target</p>
								</div>
							</div>

							{/* Divider */}
							<div className="hidden md:block w-px h-64 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

							{/* Color Picker Interface */}
							<div className="glass-panel p-1 rounded-[2rem] w-full max-w-sm">
								<div className="bg-card rounded-[1.75rem] p-6 border border-white/5">
									<ColorPicker
										defaultValue="#ffffff"
										onChange={handleColorChange}
										className="gap-6"
										key={`picker-${round}`}
									>
										<div className="aspect-square w-full rounded-2xl overflow-hidden shadow-lg border border-white/10 relative">
											<ColorPickerSelection className="w-full h-full" />
										</div>

										<div className="space-y-4 pt-2">
											<div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
												<span>Adjust Hue</span>
											</div>
											<div className="h-6 rounded-full overflow-hidden p-1 bg-[#18181b] border border-white/5">
												<ColorPickerHue className="h-full" />
											</div>
										</div>

										<div className="pt-6">
											<Button
												onClick={handleGuess}
												size="lg"
												className="w-full h-14 bg-white text-black hover:bg-white/90 font-bold text-base tracking-wide uppercase rounded-xl shadow-lg shadow-white/5 transition-all active:scale-[0.98]"
											>
												Submit Guess
											</Button>
										</div>
									</ColorPicker>
								</div>
							</div>
						</motion.div>
					)}

					{gameState === 'round_result' && (
						<motion.div
							key="result"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.98 }}
							className="w-full max-w-3xl mx-auto flex flex-col items-center"
						>
							<div className="w-full grid grid-cols-2 gap-4 mb-12 h-64 md:h-80">
								<motion.div
									initial={{ x: -50, opacity: 0 }}
									animate={{ x: 0, opacity: 1 }}
									className="relative rounded-3xl overflow-hidden shadow-2xl"
									style={{ backgroundColor: targetColor.hex() }}
								>
									<div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
										<p className="text-white font-mono text-sm font-bold uppercase tracking-widest">Target</p>
										<p className="text-white/80 font-mono text-xs opacity-60">{targetColor.hex()}</p>
									</div>
								</motion.div>

								<motion.div
									initial={{ x: 50, opacity: 0 }}
									animate={{ x: 0, opacity: 1 }}
									className="relative rounded-3xl overflow-hidden shadow-2xl"
									style={{ backgroundColor: guessColor.hex() }}
								>
									<div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/50 to-transparent text-right">
										<p className="text-white font-mono text-sm font-bold uppercase tracking-widest">You</p>
										<p className="text-white/80 font-mono text-xs opacity-60">{guessColor.hex()}</p>
									</div>
								</motion.div>

								{/* Center Score */}
								<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
									<motion.div
										initial={{ scale: 0, rotate: -180 }}
										animate={{ scale: 1, rotate: 0 }}
										transition={{ type: "spring", damping: 15 }}
										className="bg-black text-white p-2 rounded-full border-4 border-[#18181b]"
									>
										<div className="bg-white text-black w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)]">
											<span className="text-3xl font-black">{roundScore}</span>
											<span className="text-[10px] font-bold uppercase tracking-widest">PTS</span>
										</div>
									</motion.div>
								</div>
							</div>

							<div className="text-center space-y-8">
								<div className="space-y-2">
									<h2 className="text-5xl font-black tracking-tighter text-white">
										{roundScore && roundScore > 900 ? "PERFECT MATCH" : roundScore && roundScore > 800 ? "EXCELLENT" : roundScore && roundScore > 500 ? "GOOD TRY" : "MISSED IT"}
									</h2>
									<p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">
										Round {round} Complete
									</p>
								</div>

								<Button
									onClick={nextRound}
									size="lg"
									className="group relative bg-white text-black hover:bg-white px-8 py-6 h-auto rounded-full font-bold text-lg tracking-wide uppercase transition-all overflow-hidden"
								>
									<span className="relative z-10 flex items-center gap-2 group-hover:gap-4 transition-all">
										{round < TOTAL_ROUNDS ? "Next Round" : "Finish Game"}
										<ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
									</span>
									<div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
								</Button>
							</div>
						</motion.div>
					)}

					{gameState === 'game_over' && (
						<motion.div
							key="game_over"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="w-full max-w-xl mx-auto"
						>
							<div className="glass-panel rounded-[2.5rem] p-1">
								<div className="bg-card rounded-[2.25rem] overflow-hidden">
									<div className="p-10 text-center space-y-8 bg-gradient-to-b from-white/5 to-transparent">
										<div className="inline-flex p-5 rounded-3xl bg-primary/10 text-primary mb-2 ring-1 ring-primary/20">
											<Trophy className="w-10 h-10" />
										</div>

										<div className="space-y-2">
											<p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">Final Score</p>
											<h1 className="text-7xl font-black tracking-tighter text-white">
												{totalScore}
											</h1>
											<p className="text-sm text-white/40">out of {TOTAL_ROUNDS * 1000}</p>
										</div>
									</div>

									<div className="p-2 bg-[#0a0a0c]">
										<div className="bg-[#18181b] rounded-[1.75rem] p-6 space-y-4">
											<div className="flex justify-between items-center px-2">
												<h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Round Breakdown</h3>
											</div>
											<div className="space-y-2">
												{history.map((h, i) => (
													<div
														key={i}
														className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
													>
														<span className="font-mono text-xs text-white/30 w-6">0{h.round}</span>
														<div className="flex items-center gap-1 flex-1">
															<div className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: h.target }} />
															<div className="h-px w-8 bg-white/10" />
															<div className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: h.guess }} />
														</div>
														<div className="font-mono font-bold text-white">{h.score}</div>
													</div>
												))}
											</div>

											<div className="grid grid-cols-2 gap-3 mt-6">
												<Button onClick={restartGame} variant="outline" className="h-12 rounded-xl border-white/10 hover:bg-white/5 hover:text-white">
													<RefreshCw className="mr-2 h-4 w-4" /> Replay
												</Button>
												<Link href="/" className="w-full">
													<Button variant="default" className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90 font-bold">
														<Home className="mr-2 h-4 w-4" /> Home
													</Button>
												</Link>
											</div>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Footer Round History */}
				{gameState !== 'game_over' && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="mt-12 w-full max-w-xl"
					>
						<div className="grid grid-cols-5 gap-3">
							{Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
								const roundData = history.find((h) => h.round === i + 1);
								const isCurrent = round === i + 1;
								const isFuture = round < i + 1;

								return (
									<div
										key={i}
										className={`
				                                        relative h-16 rounded-xl border transition-all duration-300 overflow-hidden flex flex-col items-center justify-center gap-0.5
				                                        ${isCurrent ? 'border-primary/50 bg-primary/5 shadow-[0_0_15px_-5px_rgba(168,85,247,0.3)] scale-105 z-10' : ''}
				                                        ${isFuture ? 'border-white/5 bg-white/5 opacity-50' : ''}
				                                        ${roundData ? 'border-white/10 bg-[#0f0f11]' : ''}
				                                    `}
									>
										{roundData ? (
											<>
												<div className="flex items-center gap-1">
													<div className="w-2 h-2 rounded-full border border-white/20" style={{ backgroundColor: roundData.target }} />
													<div className="w-2 h-2 rounded-full border border-white/20" style={{ backgroundColor: roundData.guess }} />
												</div>
												<span className="text-sm font-bold text-white leading-none mt-1">{roundData.score}</span>
											</>
										) : (
											<span className={`text-[10px] font-bold ${isCurrent ? 'text-primary' : 'text-muted-foreground/50'}`}>
												{isCurrent ? 'NOW' : i + 1}
											</span>
										)}
									</div>
								);
							})}
						</div>
					</motion.div>
				)}
			</main>
		</div>
	);
}