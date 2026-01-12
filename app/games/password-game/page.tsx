"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { GameNavbar } from "@/components/game-navbar";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, Check, X, Lock, Trophy, RefreshCcw, Shield } from "lucide-react";
import "./password-theme.css";

interface Rule {
	id: number;
	description: string;
	validate: (password: string) => boolean;
}

const rules: Rule[] = [
	{
		id: 1,
		description: "Your password must be at least 5 characters",
		validate: (p) => p.length >= 5,
	},
	{
		id: 2,
		description: "Your password must include a number",
		validate: (p) => /\d/.test(p),
	},
	{
		id: 3,
		description: "Your password must include an uppercase letter",
		validate: (p) => /[A-Z]/.test(p),
	},
	{
		id: 4,
		description: "Your password must include a special character (!@#$%^&*)",
		validate: (p) => /[!@#$%^&*]/.test(p),
	},
	{
		id: 5,
		description: "The digits in your password must add up to 25",
		validate: (p) => {
			const digits = p.match(/\d/g);
			if (!digits) return false;
			const sum = digits.reduce((acc, d) => acc + parseInt(d), 0);
			return sum === 25;
		},
	},
	{
		id: 6,
		description: "Your password must include a month of the year",
		validate: (p) => {
			const months = [
				"january", "february", "march", "april", "may", "june",
				"july", "august", "september", "october", "november", "december"
			];
			return months.some((m) => p.toLowerCase().includes(m));
		},
	},
	{
		id: 7,
		description: "Your password must include a Roman numeral",
		validate: (p) => /[IVXLCDM]/.test(p),
	},
	{
		id: 8,
		description: "Your password must include one of our sponsors: Pepsi, Starbucks, or Shell",
		validate: (p) => {
			const sponsors = ["pepsi", "starbucks", "shell"];
			return sponsors.some((s) => p.toLowerCase().includes(s));
		},
	},
	{
		id: 9,
		description: "The Roman numerals in your password should multiply to 35",
		validate: (p) => {
			const romanValues: Record<string, number> = {
				I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
			};
			const romans = p.match(/[IVXLCDM]/g);
			if (!romans) return false;
			const product = romans.reduce((acc, r) => acc * romanValues[r], 1);
			return product === 35;
		},
	},
	{
		id: 10,
		description: "Your password must include the current year",
		validate: (p) => p.includes(new Date().getFullYear().toString()),
	},
	{
		id: 11,
		description: "Your password must include a leap year",
		validate: (p) => {
			const years = p.match(/\d{4}/g);
			if (!years) return false;
			return years.some((y) => {
				const year = parseInt(y);
				return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
			});
		},
	},
	{
		id: 12,
		description: "Your password must be at least 30 characters",
		validate: (p) => p.length >= 30,
	},
];

export default function PasswordGame() {
	const [password, setPassword] = useState("");
	const [unlockedRules, setUnlockedRules] = useState(1);
	const [gameWon, setGameWon] = useState(false);

	const ruleStatuses = useMemo(() => {
		return rules.slice(0, unlockedRules).map((rule) => ({
			...rule,
			passed: rule.validate(password),
		}));
	}, [password, unlockedRules]);

	const allPassed = ruleStatuses.every((r) => r.passed);

	useEffect(() => {
		if (!allPassed) return;

		const timer = setTimeout(() => {
			if (unlockedRules < rules.length) {
				setUnlockedRules((prev) => prev + 1);
			} else if (unlockedRules === rules.length && !gameWon) {
				setGameWon(true);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [allPassed, unlockedRules, gameWon]);

	const passedCount = ruleStatuses.filter((r) => r.passed).length;

	const resetGame = () => {
		setPassword("");
		setUnlockedRules(1);
		setGameWon(false);
	};

	const getStrengthLevel = () => {
		if (password.length >= 30) return { text: "MAXIMUM", color: "#22c55e" };
		if (password.length >= 20) return { text: "Strong", color: "#84cc16" };
		if (password.length >= 10) return { text: "Medium", color: "#f59e0b" };
		if (password.length >= 5) return { text: "Weak", color: "#ef4444" };
		return { text: "Very Weak", color: "#ef4444" };
	};

	return (
		<div className="password-game-theme min-h-screen bg-background relative overflow-hidden">
			{/* Unique warm orange/amber background */}
			<div className="fixed inset-0 pointer-events-none">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/30 via-transparent to-transparent" />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />

				{/* Animated glowing orbs */}
				<motion.div
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.3, 0.5, 0.3]
					}}
					transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
					className="absolute top-20 right-20 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl"
				/>
				<motion.div
					animate={{
						scale: [1, 1.3, 1],
						opacity: [0.2, 0.4, 0.2]
					}}
					transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
					className="absolute bottom-40 left-10 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl"
				/>
			</div>

			<div className="relative z-10 min-h-screen flex flex-col">
				{/* Navbar */}
				<GameNavbar accentColor="#f97316">
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30">
						<Shield className="w-4 h-4 text-orange-400" />
						<span className="text-orange-300 text-sm font-medium">
							{passedCount}/{unlockedRules}
						</span>
					</div>
				</GameNavbar>

				{/* Main content */}
				<main className="flex-1 px-6 pb-12 pt-4">
					<div className="max-w-2xl mx-auto">
						{/* Title */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="text-center mb-10"
						>
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ type: "spring", delay: 0.2 }}
								className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-orange-500/20 border border-orange-500/30 mb-6"
							>
								<KeyRound className="w-10 h-10 text-orange-400" />
							</motion.div>
							<h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
								The Password Game
							</h1>
							<p className="text-orange-300/60 text-lg max-w-md mx-auto">
								Create a password that satisfies all the increasingly absurd rules
							</p>
						</motion.div>

						{/* Password Input */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="mb-8 sticky top-20 z-20"
						>
							<div className="relative">
								{/* Glow effect */}
								<div className="absolute -inset-1 bg-orange-500/20 rounded-2xl blur-xl" />

								<div className="relative p-1 rounded-2xl bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 border border-orange-500/30">
									<div className="bg-[#1a0f0a]/90 backdrop-blur-xl rounded-xl overflow-hidden">
										<input
											type="text"
											placeholder="Start typing your password..."
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											disabled={gameWon}
											className="w-full px-6 py-5 bg-transparent text-white text-xl font-jetbrains placeholder-white/30 focus:outline-none"
										/>
										<div className="flex items-center justify-between px-6 py-3 border-t border-orange-500/10 bg-orange-500/5">
											<div className="flex items-center gap-3">
												<span className="text-xs text-orange-300/50 uppercase tracking-wider">Strength:</span>
												<span
													className="text-xs font-bold uppercase tracking-wider"
													style={{ color: getStrengthLevel().color }}
												>
													{getStrengthLevel().text}
												</span>
											</div>
											<span className="text-sm text-orange-300/50 font-jetbrains">
												{password.length} chars
											</span>
										</div>
									</div>
								</div>
							</div>
						</motion.div>

						{/* Win State */}
						<AnimatePresence>
							{gameWon && (
								<motion.div
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.95 }}
									className="mb-8 p-8 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 text-center"
								>
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ type: "spring", delay: 0.2 }}
									>
										<Trophy className="w-20 h-20 text-green-400 mx-auto mb-4" />
									</motion.div>
									<h2 className="text-3xl font-bold text-green-400 mb-2">
										Password Accepted!
									</h2>
									<p className="text-white/50 mb-6">
										You&apos;ve conquered the password bureaucracy
									</p>
									<div className="p-4 rounded-xl bg-black/30 font-jetbrains text-sm text-white/70 break-all mb-6 max-w-md mx-auto border border-green-500/20">
										{password}
									</div>
									<Button
										onClick={resetGame}
										className="bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-6 text-lg rounded-xl shadow-lg shadow-green-500/30"
									>
										<RefreshCcw className="w-5 h-5 mr-2" />
										Play Again
									</Button>
								</motion.div>
							)}
						</AnimatePresence>

						{/* Rules */}
						<div className="space-y-3">
							<AnimatePresence mode="popLayout">
								{ruleStatuses.slice().reverse().map((rule, index) => (
									<motion.div
										key={rule.id}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 20 }}
										transition={{ delay: index * 0.03 }}
										layout
										className={`relative p-5 rounded-xl border transition-all duration-300 overflow-hidden ${rule.passed
											? "bg-green-500/5 border-green-500/20"
											: "bg-orange-500/5 border-orange-500/20"
											}`}
									>
										{/* Accent line */}
										<div
											className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors duration-300"
											style={{ backgroundColor: rule.passed ? "#22c55e" : "#f97316" }}
										/>

										<div className="flex items-start gap-4 pl-2">
											<motion.div
												className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${rule.passed ? "bg-green-500/20" : "bg-orange-500/20"
													}`}
												animate={rule.passed ? { scale: [1, 1.2, 1] } : {}}
												transition={{ duration: 0.3 }}
											>
												{rule.passed ? (
													<Check className="w-5 h-5 text-green-400" />
												) : (
													<X className="w-5 h-5 text-orange-400" />
												)}
											</motion.div>

											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<span className={`text-xs font-bold uppercase tracking-wider ${rule.passed ? "text-green-400" : "text-orange-400"
														}`}>
														Rule {rule.id}
													</span>
													{rule.passed && (
														<motion.span
															initial={{ scale: 0 }}
															animate={{ scale: 1 }}
															className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium"
														>
															Complete
														</motion.span>
													)}
												</div>
												<p className={`text-sm leading-relaxed transition-all duration-300 ${rule.passed ? "text-white/40 line-through decoration-green-500/50" : "text-white/80"
													}`}>
													{rule.description}
												</p>
											</div>
										</div>
									</motion.div>
								))}
							</AnimatePresence>
						</div>

						{/* Hidden rules hint */}
						{!gameWon && unlockedRules < rules.length && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="mt-8 p-4 rounded-xl bg-orange-500/5 border border-dashed border-orange-500/20 flex items-center justify-center gap-3"
							>
								<Lock className="w-5 h-5 text-orange-400/50" />
								<span className="text-orange-300/50 text-sm">
									{rules.length - unlockedRules} more rule{rules.length - unlockedRules > 1 ? "s" : ""} will be revealed...
								</span>
							</motion.div>
						)}
					</div>
				</main>
			</div>
		</div>
	);
}