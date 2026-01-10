"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Check, Trophy, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { LIFE_EVENTS, LifeEvent } from "./data";
import { toast } from "sonner";
import ShinyText from "@/components/react-bits/ShinyText";

export default function LifeChecklist() {
	const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const saved = localStorage.getItem("life-checklist-state");
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				setCheckedItems(parsed);
			} catch (e) {
				console.error("Failed to load state", e);
			}
		}
		setMounted(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (mounted) {
			localStorage.setItem("life-checklist-state", JSON.stringify(checkedItems));
		}
	}, [checkedItems, mounted]);

	const toggleItem = (id: string) => {
		setCheckedItems((prev) => {
			return { ...prev, [id]: !prev[id] };
		});
	};

	const completedCount = Object.values(checkedItems).filter(Boolean).length;
	const progress = Math.round((completedCount / LIFE_EVENTS.length) * 100);

	const handleShare = async () => {
		const text = `I've completed ${completedCount} out of ${LIFE_EVENTS.length} items on my Life Checklist! ✅\n\nHow many have you done?`;
		if (navigator.share) {
			try {
				await navigator.share({
					title: "Life Checklist",
					text: text,
					url: window.location.href,
				});
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					console.error("Share failed", err);
				}
			}
		} else {
			navigator.clipboard.writeText(text);
			toast.success("Copied to clipboard!");
		}
	};

	const handleReset = () => {
		if (confirm("Are you sure you want to reset your checklist? This cannot be undone.")) {
			setCheckedItems({});
			toast.success("Checklist reset!");
		}
	};

	if (!mounted) return null;

	return (
		<div className="min-h-screen bg-neutral-950 text-white selection:bg-emerald-500/30">
			{/* Header */}
			<div className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5">
				<div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
					<Link
						href="/"
						className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/60 hover:text-white"
					>
						<ArrowLeft className="w-5 h-5" />
					</Link>

					<h1 className="text-lg font-semibold">
						<ShinyText text="Life Checklist" speed={3} className="font-semibold" />
					</h1>

					<div className="w-9" /> {/* Spacer */}
				</div>
			</div>

			<main className="max-w-3xl mx-auto px-4 py-8 pb-32">
				{/* Progress Card */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="mb-10 p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 relative overflow-hidden"
				>
					<div className="absolute top-0 right-0 p-8 opacity-10">
						<Trophy className="w-32 h-32 text-emerald-500" />
					</div>

					<div className="relative z-10">
						<div className="flex items-end gap-2 mb-2">
							<span className="text-5xl font-bold text-emerald-400">{completedCount}</span>
							<span className="text-xl text-emerald-400/60 mb-1.5">/ {LIFE_EVENTS.length} completed</span>
						</div>

						<div className="h-3 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
							<motion.div
								className="h-full bg-emerald-500"
								initial={{ width: 0 }}
								animate={{ width: `${progress}%` }}
								transition={{ duration: 1, ease: "easeOut" }}
							/>
						</div>

						<p className="mt-3 text-sm text-emerald-400/80 font-medium">
							You&apos;ve completed {progress}% of the checklist!
						</p>
					</div>
				</motion.div>

				{/* List */}
				<div className="space-y-2">
					{LIFE_EVENTS.map((event, index) => (
						<motion.div
							key={event.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.01 }}
						>
							<label
								className={`
                  group flex items-center gap-4 p-4 rounded-xl cursor-pointer border transition-all duration-200
                  ${checkedItems[event.id]
										? 'bg-emerald-500/10 border-emerald-500/20'
										: 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
									}
                `}
							>
								<div className={`
                  w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                  ${checkedItems[event.id]
										? 'bg-emerald-500 border-emerald-500'
										: 'border-white/20 group-hover:border-white/40'
									}
                `}>
									{checkedItems[event.id] && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
								</div>

								<input
									type="checkbox"
									className="hidden"
									checked={!!checkedItems[event.id]}
									onChange={() => toggleItem(event.id)}
								/>

								<span className={`
                  flex-1 text-lg transition-colors
                  ${checkedItems[event.id] ? 'text-white' : 'text-white/80'}
                `}>
									{event.label}
								</span>
							</label>
						</motion.div>
					))}
				</div>
			</main>

			{/* Floating Action Bar */}
			<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 p-2 rounded-full bg-neutral-900/90 backdrop-blur-xl border border-white/10 shadow-2xl">
				<button
					onClick={handleShare}
					className="flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-colors"
				>
					<Share2 className="w-4 h-4" />
					<span>Share Progress</span>
				</button>

				<button
					onClick={handleReset}
					className="p-3 rounded-full hover:bg-white/10 text-white/60 hover:text-red-400 transition-colors"
					title="Reset Checklist"
				>
					<Trash2 className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
}