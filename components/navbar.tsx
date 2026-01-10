"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

export function Navbar() {
	return (
		<motion.nav
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut" }}
			className="fixed top-0 w-full z-50"
		>
			<div className="mx-4 mt-4">
				<div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
					{/* Logo */}
					<Link href="/" className="flex items-center gap-2 group">
						<motion.div
							whileHover={{ rotate: 180, scale: 1.1 }}
							transition={{ duration: 0.4 }}
							className="w-8 h-8 rounded-lg bg-purple-500/30 flex items-center justify-center"
						>
							<Sparkles className="w-4 h-4 text-purple-300" />
						</motion.div>
						<span className="text-base font-semibold text-white">
							satyajit.fun
						</span>
					</Link>

					{/* Status */}
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10">
						<div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
						<span className="text-xs text-white/70 font-medium">2 games</span>
					</div>
				</div>
			</div>
		</motion.nav>
	);
}