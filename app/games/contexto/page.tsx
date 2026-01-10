'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameNavbar } from '@/components/game-navbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trophy, AlertCircle, Loader2, Info, RefreshCw, Calendar, Shuffle, RotateCcw } from 'lucide-react';
import { useContextoStore } from './store';
import './contexto-theme.css';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ContextoGame() {
	const [input, setInput] = useState('');
	const {
		guesses,
		gameState,
		loading,
		error,
		submitGuess,
		checkDailyReset,
		gameNumber,
		gameMode,
		startRandomGame,
		switchToDaily,
		resetGame
	} = useContextoStore();
	const { width, height } = useWindowSize();
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		checkDailyReset();
	}, [checkDailyReset]);

	const handleSubmit = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (input.trim()) {
			submitGuess(input.trim());
			setInput('');
		}
	};

	const getRankColor = (rank: number) => {
		if (rank === 1) return 'bg-emerald-500 border-emerald-400 text-black font-bold';
		if (rank <= 10) return 'bg-yellow-400 border-yellow-300 text-black font-semibold';
		if (rank <= 100) return 'bg-orange-400 border-orange-300 text-black';
		if (rank <= 1000) return 'bg-red-400 border-red-300 text-black';
		return 'bg-slate-700 border-slate-600 text-slate-300';
	};

	const getWidthPercentage = (rank: number) => {
		// Logarithmic scale for width?
		// Rank 1 = 100%
		// Rank 10000 = ~10%
		if (rank === 1) return 100;
		const width = Math.max(10, 100 - Math.log10(rank) * 20);
		return width;
	};

	return (
		<div className="contexto-theme bg-[#1e1e2e] min-h-screen font-sans text-[#cdd6f4] selection:bg-[#89b4fa]/30 relative overflow-x-hidden">
			{gameState === 'won' && <Confetti width={width} height={height} recycle={false} />}

			<GameNavbar accentColor="#89b4fa">
				<div className="flex items-center gap-2">
					{gameMode === 'daily' && (
						<span className="text-sm font-mono text-slate-400">#{gameNumber}</span>
					)}
					{gameMode === 'random' && (
						<span className="text-sm font-mono text-slate-400 flex items-center gap-1">
							<Shuffle className="w-3 h-3" /> Random
						</span>
					)}

					<span className="text-sm font-mono text-slate-500">
						{guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}
					</span>

					<div className="h-4 w-px bg-white/10 mx-2" />

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="h-8 gap-2 hover:bg-white/10">
								{gameMode === 'daily' ? <Calendar className="w-4 h-4" /> : <Shuffle className="w-4 h-4" />}
								<span className="hidden sm:inline">{gameMode === 'daily' ? 'Daily' : 'Random'}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="bg-[#1e1e2e] border-slate-700 text-[#cdd6f4]">
							<DropdownMenuItem onClick={switchToDaily} className="gap-2 focus:bg-white/10 focus:text-white cursor-pointer">
								<Calendar className="w-4 h-4" />
								<span>Daily Game</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={startRandomGame} className="gap-2 focus:bg-white/10 focus:text-white cursor-pointer">
								<Shuffle className="w-4 h-4" />
								<span>New Random Game</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={resetGame} className="gap-2 focus:bg-white/10 focus:text-white cursor-pointer text-red-400 hover:text-red-400">
								<RotateCcw className="w-4 h-4" />
								<span>Reset Guesses</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<Dialog>
						<DialogTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
								<Info className="h-4 w-4" />
							</Button>
						</DialogTrigger>
						<DialogContent className="bg-[#1e1e2e] border-slate-700 text-[#cdd6f4]">
							<DialogHeader>
								<DialogTitle>How to Play</DialogTitle>
								<DialogDescription asChild className="text-slate-400 pt-2 space-y-2">
									<div>
										<p>Find the secret word. You have unlimited guesses.</p>
										<p>The words were sorted by an artificial intelligence algorithm according to how similar they are to the secret word.</p>
										<p>After submitting a word, you will see its position. The secret word is number 1.</p>
										<p>The algorithm analyzed thousands of texts. It uses the context in which words are used to calculate the similarity between them.</p>
									</div>
								</DialogDescription>
							</DialogHeader>
						</DialogContent>
					</Dialog>
				</div>
			</GameNavbar>

			<main className="container max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-8 min-h-[calc(100vh-80px)]">
				{/* Header */}
				<div className="text-center space-y-2 mt-4">
					<h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-br from-[#89b4fa] to-[#b4befe] bg-clip-text text-transparent">
						CONTEXTO
					</h1>
					<p className="text-slate-400 text-sm">Guess the word by semantic similarity</p>

					{gameState === 'won' && gameMode === 'random' && (
						<Button
							onClick={startRandomGame}
							className="mt-4 bg-[#89b4fa] hover:bg-[#89b4fa]/90 text-[#1e1e2e]"
						>
							Play Another Random Game <ArrowRight className="ml-2 w-4 h-4" />
						</Button>
					)}
				</div>

				{/* Input Area */}
				<div className="w-full sticky top-4 z-20">
					<form onSubmit={handleSubmit} className="relative">
						<div className="relative flex gap-2">
							<Input
								type="text"
								placeholder="Type a word..."
								value={input}
								onChange={(e) => setInput(e.target.value)}
								className="h-14 bg-[#313244] border-slate-600 focus:border-[#89b4fa] focus:ring-1 focus:ring-[#89b4fa] text-lg px-6 rounded-xl shadow-lg placeholder:text-slate-500 transition-all"
								autoFocus
								disabled={gameState === 'won' || loading}
							/>
							<Button
								type="submit"
								size="icon"
								disabled={gameState === 'won' || loading || !input.trim()}
								className="h-14 w-14 rounded-xl bg-[#89b4fa] hover:bg-[#89b4fa]/90 text-[#1e1e2e] shadow-lg transition-transform active:scale-95"
							>
								{loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
							</Button>

							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="h-14 w-14 rounded-xl bg-[#313244] hover:bg-[#45475a] text-red-400 hover:text-red-300 shadow-lg transition-transform active:scale-95 border border-slate-600"
									>
										<RotateCcw className="w-6 h-6" />
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent className="bg-[#1e1e2e] border-slate-700 text-[#cdd6f4]">
									<AlertDialogHeader>
										<AlertDialogTitle>Reset Game?</AlertDialogTitle>
										<AlertDialogDescription className="text-slate-400">
											This will clear all your guesses for this game. This action cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel className="bg-transparent border-slate-600 hover:bg-white/10 hover:text-white text-slate-300">Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={resetGame}
											className="bg-red-500 hover:bg-red-600 text-white border-none"
										>
											Yes, reset game
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</form>

					{error && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className="absolute top-full mt-2 w-full flex items-center justify-center gap-2 text-red-400 text-sm bg-red-400/10 py-2 rounded-lg"
						>
							<AlertCircle className="w-4 h-4" /> {error}
						</motion.div>
					)}
				</div>

				{/* Guesses List */}
				<div className="w-full space-y-2 pb-20">
					<AnimatePresence mode="popLayout">
						{guesses.map((guess, index) => (
							<motion.div
								key={guess.id}
								layout
								initial={{ opacity: 0, scale: 0.9, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								className="relative w-full"
							>
								<div className={`
                                    relative z-10 flex items-center justify-between px-4 py-3 rounded-lg border shadow-sm overflow-hidden
                                    ${getRankColor(guess.rank)}
                                `}>
									<span className="font-bold text-lg">{guess.word}</span>
									<span className="font-mono text-sm opacity-80">#{guess.rank}</span>

									{/* Progress Bar Background */}
									<div
										className="absolute inset-y-0 left-0 bg-white/20 -z-10 guess-bar"
										style={{ width: `${getWidthPercentage(guess.rank)}%` }}
									/>
								</div>
							</motion.div>
						))}
					</AnimatePresence>

					{guesses.length === 0 && (
						<div className="text-center text-slate-500 py-12">
							Type a word to start guessing...
						</div>
					)}
				</div>
			</main>
		</div>
	);
}