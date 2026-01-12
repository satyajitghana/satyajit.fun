"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import ShinyText from "@/components/react-bits/ShinyText";
import Silk from "@/components/react-bits/Silk";
import { motion } from "motion/react";
import { KeyRound, Circle, ArrowUpRight, Star, Palette, ThermometerSun, BrainCircuit, ListTodo, Eye, Scan, Loader, Shuffle, Terminal, MousePointerClick, Timer, Waves, Fingerprint, Layers, Hourglass, CreditCard, ScanEye, RotateCcw, Weight, RefreshCw, Flame, MousePointer2, ShieldAlert, HardDrive, Wind, Sparkles, Wand2 } from "lucide-react";

const games = [
  {
    id: "eldermere",
    title: "Eldermere",
    description: "Learn actual magic spells with your hands. Your body is the controller.",
    icon: Wand2,
    accentColor: "#a855f7",
  },
  {
    id: "cosmic-shapes",
    title: "Cosmic Shapes",
    description: "Use your hands and face to control 3D objects in space.",
    icon: Sparkles,
    accentColor: "#a855f7",
  },
  {
    id: "reload-roulette",
    title: "Reload Roulette",
    description: "Refreshing the page is a gamble. Predict the outcome to survive.",
    icon: RefreshCw,
    accentColor: "#4ade80",
  },
  {
    id: "heavy-cursor",
    title: "The Mouse Is Heavy",
    description: "The cursor has physical weight. Inertia is your enemy. Move slowly to survive.",
    icon: Weight,
    accentColor: "#fbbf24", // Amber-400
  },
  {
    id: "temporal-corruption",
    title: "Temporal Corruption",
    description: "The browser back button is your only weapon. Rewind time, but beware of corruption.",
    icon: RotateCcw,
    accentColor: "#22c55e",
  },
  {
    id: "watching-you",
    title: "The Game Is Watching You",
    description: "It knows when you look away. A psychological thriller in your browser.",
    icon: ScanEye,
    accentColor: "#ef4444",
  },
  {
    id: "click-debt",
    title: "Click Debt",
    description: "Every click borrows from the future. A minimalist game about impulse control.",
    icon: CreditCard,
    accentColor: "#ff3333",
  },
  {
    id: "you-missed-it",
    title: "You Missed It",
    description: "The party is over. You arrived too late. A game about regret and acceptance.",
    icon: Hourglass,
    accentColor: "#a78bfa",
  },
  {
    id: "tab-escape",
    title: "Tab Escape",
    description: "Your browser tabs are the enemy. Manage the chaos to survive.",
    icon: Layers,
    accentColor: "#ef4444",
  },
  {
    id: "human-error",
    title: "Human Error",
    description: "Survival game where perfection kills you. Be imprecise to survive.",
    icon: Fingerprint,
    accentColor: "#ef4444",
  },
  {
    id: "entropy",
    title: "Entropy",
    description: "An experimental game about chaos and stillness. The game observes your behavior.",
    icon: Waves,
    accentColor: "#bf5af2",
  },
  {
    id: "lag-labyrinth",
    title: "Lag Labyrinth",
    description: "Input lag is the main mechanic. Predict the future to navigate the maze.",
    icon: Timer,
    accentColor: "#00ff41",
  },
  {
    id: "the-button",
    title: "The Button",
    description: "A psychological experiment. It judges how you click.",
    icon: MousePointerClick,
    accentColor: "#e11d48", // Rose-600
  },
  {
    id: "url-adventure",
    title: "URL Adventure",
    description: "Hacking isn't about code. It's about knowing where to look. Edit the URL to progress.",
    icon: Terminal,
    accentColor: "#22d3ee",
  },
  {
    id: "unlearn",
    title: "Unlearn",
    description: "Your instincts are wrong. A puzzle game about fighting your muscle memory.",
    icon: Shuffle,
    accentColor: "#38bdf8",
  },
  {
    id: "loading-screen-tycoon",
    title: "Loading Screen Tycoon",
    description: "A fake loading screen that becomes a chaotic management game.",
    icon: Loader,
    accentColor: "#a855f7",
  },
  {
    id: "one-pixel-hero",
    title: "One Pixel Hero",
    description: "You are 1px in a giant world. Survive, escape, and reveal the truth.",
    icon: Scan,
    accentColor: "#ffffff",
  },
  {
    id: "dont-blink",
    title: "Don't Blink",
    description: "A test of reflexes and timing. Blink only when the eye allows you to.",
    icon: Eye,
    accentColor: "#ef4444",
  },
  {
    id: "life-checklist",
    title: "Life Checklist",
    description: "How many of these life events have you completed?",
    icon: ListTodo,
    accentColor: "#10b981",
  },
  {
    id: "password-game",
    title: "The Password Game",
    description: "Create a password that follows increasingly absurd rules",
    icon: KeyRound,
    accentColor: "#f97316",
  },
  {
    id: "perfect-circle",
    title: "Draw The Perfect Circle",
    description: "Test your hand steadiness by drawing a perfect circle",
    icon: Circle,
    accentColor: "#06b6d4",
  },
  {
    id: "colour-geo-guesser",
    title: "Colour Geo Guesser",
    description: "Match the random color by adjusting the picker. How close can you get?",
    icon: Palette,
    accentColor: "#8b5cf6",
  },
  {
    id: "weather-darts",
    title: "Weather Darts",
    description: "Find cities that match the target temperature. A global weather hunt!",
    icon: ThermometerSun,
    accentColor: "#06b6d4",
  },
  {
    id: "guess-the-color",
    title: "Guess the Color",
    description: "Given a Pantone color name, can you recreate it on the color wheel?",
    icon: Palette,
    accentColor: "#d946ef",
  },
  {
    id: "contexto",
    title: "Contexto",
    description: "Find the secret word by guessing semantically similar words.",
    icon: BrainCircuit,
    accentColor: "#89b4fa",
  },
  {
    id: "glitch-painter",
    title: "Glitch Painter",
    description: "Create art through system corruption. Drag, smear, and break the UI.",
    icon: Palette,
    accentColor: "#00ff41",
  },
  {
    id: "interface-archaeology",
    title: "Interface Archaeology",
    description: "Dig through layers of computing history. Resolve hardware conflicts to sync data.",
    icon: HardDrive,
    accentColor: "#22c55e",
  },
  {
    id: "keyboard-heat",
    title: "Keyboard Heat",
    description: "Typing generates heat. Balance speed with cooldowns to avoid overheating.",
    icon: Flame,
    accentColor: "#f97316",
  },
  {
    id: "liars-cursor",
    title: "Liar's Cursor",
    description: "The interface is lying to you. Trust nothing but your instincts.",
    icon: MousePointer2,
    accentColor: "#ef4444",
  },
  {
    id: "negative-space",
    title: "Negative Space",
    description: "Be still to shape the void. A generative art game about calmness.",
    icon: Wind,
    accentColor: "#ffffff",
  },
  {
    id: "unreliable-ui",
    title: "Unreliable UI",
    description: "Colors deceive. Labels mislead. Only consistency is betrayal.",
    icon: ShieldAlert,
    accentColor: "#ef4444",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Silk Background */}
      <div className="fixed inset-0 z-0">
        <Silk
          speed={3}
          scale={1.5}
          color="#7c3aed"
          noiseIntensity={1.2}
          rotation={0}
        />
      </div>

      {/* Dark overlay */}
      <div className="fixed inset-0 z-[1] bg-black/50" />

      {/* Navbar */}
      <Navbar />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col pt-28">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="py-16 md:py-24 text-center px-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-6"
          >
            <Star className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300 font-medium">New games coming soon!</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <ShinyText
              text="satyajit.fun"
              color="#ffffff"
              shineColor="#a855f7"
              speed={3}
              spread={120}
              className="font-bold"
            />
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-lg md:text-xl text-white/60 font-medium max-w-md mx-auto"
          >
            A collection of fun, addictive mini-games
          </motion.p>
        </motion.header>

        {/* Games Grid */}
        <main className="flex-1 px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {games.map((game, index) => {
                const Icon = game.icon;
                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      delay: 0.6 + index * 0.1,
                    }}
                  >
                    <Link href={`/games/${game.id}`} className="block group h-full">
                      <div className="h-full p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-5">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                            style={{ backgroundColor: `${game.accentColor}20` }}
                          >
                            <Icon
                              className="w-6 h-6"
                              style={{ color: game.accentColor }}
                            />
                          </div>
                          <ArrowUpRight
                            className="w-5 h-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300"
                          />
                        </div>

                        {/* Content */}
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {game.title}
                        </h3>
                        <p className="text-sm text-white/50 leading-relaxed">
                          {game.description}
                        </p>

                        {/* Bottom accent */}
                        <div className="mt-5 pt-4 border-t border-white/5">
                          <span
                            className="text-xs font-medium"
                            style={{ color: game.accentColor }}
                          >
                            Play now →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Coming soon placeholder */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="mt-6 p-6 rounded-2xl border border-dashed border-white/10 text-center"
            >
              <p className="text-white/30 text-sm">More games coming soon...</p>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="py-8 text-center border-t border-white/5"
        >
          <p className="text-white/30 text-sm">
            Made with ❤️ by Satyajit
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
