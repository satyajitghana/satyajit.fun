"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, RefreshCw, Zap, Maximize2, Move, Clock, CircleDot, CheckCircle2, Trophy } from "lucide-react";
import "./circle-theme.css";

interface Point {
	x: number;
	y: number;
}

interface LiveMetrics {
	radius: number;
	deviation: number;
	centerOffset: { x: number; y: number };
}

interface FinalMetrics extends LiveMetrics {
	score: number;
	closureGap: number;
	points: number;
	time: number;
}

export default function PerfectCircle() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [points, setPoints] = useState<Point[]>([]);
	const [finalMetrics, setFinalMetrics] = useState<FinalMetrics | null>(null);
	const [bestScore, setBestScore] = useState<number>(0);
	const [drawStartTime, setDrawStartTime] = useState<number>(0);
	const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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

	// Live metrics calculation
	const liveMetrics = useMemo((): LiveMetrics | null => {
		if (points.length < 5 || canvasSize.width === 0) return null;

		const canvasCenterX = canvasSize.width / 2;
		const canvasCenterY = canvasSize.height / 2;

		const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
		const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

		const radii = points.map((p) =>
			Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
		);
		const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;
		const variance = radii.reduce((sum, r) => sum + Math.pow(r - avgRadius, 2), 0) / radii.length;
		const stdDev = Math.sqrt(variance);

		return {
			radius: Math.round(avgRadius),
			deviation: Math.round(stdDev * 10) / 10,
			centerOffset: {
				x: Math.round(centerX - canvasCenterX),
				y: Math.round(centerY - canvasCenterY),
			},
		};
	}, [points, canvasSize]);

	// Canvas helpers
	const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
		const canvas = canvasRef.current;
		if (!canvas) return null;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

		return {
			x: (clientX - rect.left) * scaleX,
			y: (clientY - rect.top) * scaleY,
		};
	}, []);

	const clearCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw Guide Center
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;

		// Subtle Grid
		ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(centerX, 0);
		ctx.lineTo(centerX, canvas.height);
		ctx.moveTo(0, centerY);
		ctx.lineTo(canvas.width, centerY);
		ctx.stroke();

		ctx.beginPath();
		ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
		ctx.fill();

		// Draw Guide Ring (Very Subtle)
		ctx.beginPath();
		ctx.ellipse(centerX, centerY, 120, 120, 0, 0, Math.PI * 2);
		ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 8]);
		ctx.stroke();
		ctx.setLineDash([]);
	}, []);

	// Draw when canvas size changes
	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas) {
			canvas.width = canvasSize.width;
			canvas.height = canvasSize.height;
			clearCanvas();
		}
	}, [canvasSize, clearCanvas]);

	// Drawing Logic
	const drawLine = useCallback((pts: Point[], isFinal: boolean = false) => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		clearCanvas();

		if (pts.length > 1) {
			const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

			if (isFinal) {
				// Vibrant Final Gradient
				gradient.addColorStop(0, "#30d158"); // Success Green
				gradient.addColorStop(0.5, "#0a84ff"); // Blue
				gradient.addColorStop(1, "#bf5af2"); // Purple

				// Add glow for final result
				ctx.shadowColor = "rgba(10, 132, 255, 0.4)";
				ctx.shadowBlur = 15;
			} else {
				// Clean Drawing Gradient
				gradient.addColorStop(0, "#ffffff");
				gradient.addColorStop(1, "#9ca3af");
				ctx.shadowBlur = 0;
			}

			ctx.strokeStyle = gradient;
			ctx.lineWidth = isFinal ? 5 : 3;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";

			ctx.beginPath();
			ctx.moveTo(pts[0].x, pts[0].y);

			// Smooth curve interpolation
			for (let i = 1; i < pts.length - 1; i++) {
				const midX = (pts[i].x + pts[i + 1].x) / 2;
				const midY = (pts[i].y + pts[i + 1].y) / 2;
				ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
			}

			const last = pts[pts.length - 1];
			ctx.lineTo(last.x, last.y);
			ctx.stroke();

			// Start Point Dot
			if (!isFinal) {
				ctx.beginPath();
				ctx.arc(pts[0].x, pts[0].y, 3, 0, Math.PI * 2);
				ctx.fillStyle = "#ffffff";
				ctx.fill();
			}
		}
	}, [clearCanvas]);

	const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
		const point = getCanvasPoint(e);
		if (!point) return;

		setIsDrawing(true);
		setPoints([point]);
		setFinalMetrics(null);
		setDrawStartTime(Date.now());
		clearCanvas();
	};

	const draw = (e: React.MouseEvent | React.TouchEvent) => {
		if (!isDrawing) return;
		const point = getCanvasPoint(e);
		if (!point) return;

		setPoints(prev => {
			const newPoints = [...prev, point];
			drawLine(newPoints);
			return newPoints;
		});
	};

	const calculateScore = useCallback((pts: Point[]) => {
		if (pts.length < 10 || canvasSize.width === 0) return null;

		const centerX = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
		const centerY = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
		const radii = pts.map(p => Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2)));
		const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;

		if (avgRadius < 20) return null; // Too small

		// Calculate variance and score
		const variance = radii.reduce((sum, r) => sum + Math.pow(r - avgRadius, 2), 0) / radii.length;
		const stdDev = Math.sqrt(variance);
		const cv = stdDev / avgRadius; // Coefficient of variation

		let score = Math.max(0, Math.min(100, (1 - cv * 3.5) * 100)); // Stricter scoring

		// Closure Penalty
		const start = pts[0];
		const end = pts[pts.length - 1];
		const gap = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
		const gapPenalty = (gap / avgRadius) * 20;

		score = Math.max(0, Math.round(score - gapPenalty));

		return {
			score,
			radius: Math.round(avgRadius),
			deviation: Math.round(stdDev * 10) / 10,
			closureGap: Math.round(gap),
			points: pts.length,
			time: Date.now() - drawStartTime,
			centerOffset: {
				x: Math.round(centerX - (canvasSize.width / 2)),
				y: Math.round(centerY - (canvasSize.height / 2))
			}
		};
	}, [canvasSize, drawStartTime]);

	const stopDrawing = () => {
		if (!isDrawing) return;
		setIsDrawing(false);

		const metrics = calculateScore(points);
		if (metrics) {
			setFinalMetrics(metrics);
			drawLine(points, true); // Redraw with success style
			if (metrics.score > bestScore) setBestScore(metrics.score);
		} else {
			// Failed attempt (too small or short)
			clearCanvas();
			setPoints([]);
		}
	};

	const getGrade = (score: number) => {
		if (score >= 98) return { label: "Perfect", color: "text-[var(--purple)]" };
		if (score >= 95) return { label: "Masterpiece", color: "text-[var(--primary)]" };
		if (score >= 90) return { label: "Excellent", color: "text-[var(--success)]" };
		if (score >= 80) return { label: "Great", color: "text-[var(--info)]" };
		if (score >= 60) return { label: "Good", color: "text-[var(--warning)]" };
		return { label: "Keep Trying", color: "text-[var(--danger)]" };
	};

	const displayMetrics = finalMetrics || liveMetrics;

	return (
		<div className="circle-game-theme min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-[var(--primary)] selection:text-white overflow-hidden">

			{/* Header */}
			<div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
				<Link href="/" className="pointer-events-auto flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors glass-panel px-4 py-2 rounded-full">
					<ArrowLeft className="w-4 h-4" />
					<span className="hidden sm:inline">Back</span>
				</Link>
			</div>

			<main className="h-screen w-full flex flex-col lg:flex-row p-4 pt-20 lg:pt-4 gap-4">

				{/* Canvas Area - Enhanced Visuals */}
				<div className="flex-1 relative rounded-3xl overflow-hidden glass-panel order-2 lg:order-1 group" ref={containerRef}>
					<div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

					<canvas
						ref={canvasRef}
						className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
						onMouseDown={startDrawing}
						onMouseMove={draw}
						onMouseUp={stopDrawing}
						onMouseLeave={stopDrawing}
						onTouchStart={startDrawing}
						onTouchMove={draw}
						onTouchEnd={stopDrawing}
					/>

					{/* Minimalist Hint */}
					{!isDrawing && !finalMetrics && (
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
							<div className="flex flex-col items-center gap-3">
								<div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 animate-[spin_10s_linear_infinite]" />
								<p className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
									Draw a Circle
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Sidebar Stats - Refined Bento Grid */}
				<div className="w-full lg:w-[320px] xl:w-[360px] flex flex-col gap-3 order-1 lg:order-2 shrink-0">

					{/* Main Score Card */}
					<div className="glass-panel p-6 rounded-3xl flex flex-col relative overflow-hidden h-[200px]">

						{/* Top Row: Label + Best Score */}
						<div className="flex items-start justify-between w-full z-20">
							<span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-bold mt-1">
								Accuracy Score
							</span>

							{bestScore > 0 && (
								<div className="flex flex-col items-end">
									<div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5">
										<Trophy className="w-3 h-3 text-[var(--primary)]" />
										<span className="text-xs font-bold tabular-nums">{bestScore}%</span>
									</div>
									<span className="text-[8px] uppercase tracking-wider text-[var(--muted-foreground)] mt-1">Best</span>
								</div>
							)}
						</div>

						{/* Center: The Big Score */}
						<div className="absolute inset-0 flex items-center justify-center z-10">
							{finalMetrics ? (
								<motion.div
									initial={{ scale: 0.9, opacity: 0, filter: "blur(10px)" }}
									animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
									className="flex flex-col items-center"
								>
									<h2 className="text-8xl font-bold tracking-tighter tabular-nums leading-none text-white drop-shadow-2xl">
										{finalMetrics.score}
										<span className="text-3xl text-[var(--muted-foreground)] font-light">%</span>
									</h2>
									<div className={`mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 ${getGrade(finalMetrics.score).color}`}>
										<span className="text-xs font-bold uppercase tracking-wider">
											{getGrade(finalMetrics.score).label}
										</span>
									</div>
								</motion.div>
							) : (
								<div className="flex flex-col items-center gap-2 opacity-20">
									<CircleDot className="w-16 h-16 text-white" />
									<span className="text-xs font-medium">Ready</span>
								</div>
							)}
						</div>
					</div>

					{/* Metrics Grid */}
					<div className="grid grid-cols-2 gap-3 flex-1">

						{/* Radius */}
						<div className="glass-panel p-4 rounded-2xl flex flex-col justify-between group h-[100px]">
							<div className="flex items-center gap-2 text-[var(--muted-foreground)] mb-1">
								<Maximize2 className="w-3.5 h-3.5" />
								<span className="text-[9px] uppercase font-bold tracking-widest">Radius</span>
							</div>
							<span className="text-2xl font-semibold value-mono group-hover:text-[var(--primary)] transition-colors">
								{displayMetrics?.radius ?? "0"}
								<span className="text-xs font-normal text-[var(--muted-foreground)] ml-1">px</span>
							</span>
						</div>

						{/* Deviation */}
						<div className="glass-panel p-4 rounded-2xl flex flex-col justify-between group h-[100px]">
							<div className="flex items-center gap-2 text-[var(--muted-foreground)] mb-1">
								<Zap className="w-3.5 h-3.5" />
								<span className="text-[9px] uppercase font-bold tracking-widest">Deviation</span>
							</div>
							<span className="text-2xl font-semibold value-mono group-hover:text-[var(--warning)] transition-colors">
								±{displayMetrics?.deviation ?? "0"}
							</span>
						</div>

						{/* Gap */}
						<div className="glass-panel p-4 rounded-2xl flex flex-col justify-between group h-[100px]">
							<div className="flex items-center gap-2 text-[var(--muted-foreground)] mb-1">
								<CheckCircle2 className="w-3.5 h-3.5" />
								<span className="text-[9px] uppercase font-bold tracking-widest">Closure</span>
							</div>
							<span className="text-2xl font-semibold value-mono group-hover:text-[var(--success)] transition-colors">
								{finalMetrics?.closureGap ?? "—"}
								<span className="text-xs font-normal text-[var(--muted-foreground)] ml-1">px</span>
							</span>
						</div>

						{/* Time */}
						<div className="glass-panel p-4 rounded-2xl flex flex-col justify-between group h-[100px]">
							<div className="flex items-center gap-2 text-[var(--muted-foreground)] mb-1">
								<Clock className="w-3.5 h-3.5" />
								<span className="text-[9px] uppercase font-bold tracking-widest">Time</span>
							</div>
							<span className="text-2xl font-semibold value-mono group-hover:text-[var(--info)] transition-colors">
								{finalMetrics ? (finalMetrics.time / 1000).toFixed(1) : "0.0"}
								<span className="text-xs font-normal text-[var(--muted-foreground)] ml-1">s</span>
							</span>
						</div>

						{/* Center Offset */}
						<div className="glass-panel p-4 rounded-2xl col-span-2 flex items-center justify-between group h-[80px]">
							<div className="flex items-center gap-2 text-[var(--muted-foreground)]">
								<Move className="w-3.5 h-3.5" />
								<span className="text-[9px] uppercase font-bold tracking-widest">Center Offset</span>
							</div>
							<span className="text-lg font-medium value-mono text-[var(--muted-foreground)] group-hover:text-[var(--purple)] transition-colors">
								x: {displayMetrics?.centerOffset.x ?? 0}, y: {displayMetrics?.centerOffset.y ?? 0}
							</span>
						</div>
					</div>

					{/* Reset Button */}
					<button
						onClick={() => {
							setPoints([]);
							setFinalMetrics(null);
							clearCanvas();
						}}
						disabled={!finalMetrics}
						className="glass-panel h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm text-[var(--foreground)] hover:bg-white hover:text-black hover:border-white transition-all disabled:opacity-50 disabled:hover:bg-[var(--card)] disabled:hover:text-[var(--foreground)] disabled:cursor-not-allowed"
					>
						<RefreshCw className="w-4 h-4" />
						<span>Try Again</span>
					</button>

				</div>
			</main>
		</div>
	);
}