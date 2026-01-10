"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Home } from "lucide-react";

interface GameNavbarProps {
	accentColor?: string;
	children?: React.ReactNode;
}

export function GameNavbar({ accentColor = "#a855f7", children }: GameNavbarProps) {
	return (
		<motion.nav
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="sticky top-0 z-50 backdrop-blur-xl"
		>
			<div className="px-6 py-4">
				<div className="max-w-4xl mx-auto flex items-center justify-between">
					{/* Back button */}
					<Link href="/">
						<motion.div
							whileHover={{ x: -3 }}
							className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
						>
							<ArrowLeft className="w-4 h-4 text-white/60" />
							<span className="text-sm font-medium text-white/60">Home</span>
						</motion.div>
					</Link>

					{/* Right side content (stats, etc.) */}
					<div className="flex items-center gap-3">
						{children}
					</div>
				</div>
			</div>

			{/* Bottom accent line */}
			<div
				className="h-px w-full opacity-30"
				style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }}
			/>
		</motion.nav>
	);
}