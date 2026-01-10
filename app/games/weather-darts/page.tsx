'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameNavbar } from '@/components/game-navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Search, Home, RefreshCw, Trophy, Target, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useWeatherGameStore, type City } from './store';
import './weather-theme.css';
import Link from 'next/link';
import { useDebounce } from 'react-use';

// API Utilities
const searchCity = async (name: string) => {
	if (!name || name.length < 2) return [];
	try {
		const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`);
		const data = await res.json();
		return data.results || [];
	} catch (e) {
		console.error("City search failed", e);
		return [];
	}
};

const getCityWeather = async (lat: number, lon: number) => {
	try {
		const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`);
		const data = await res.json();
		return data.current.temperature_2m;
	} catch (e) {
		console.error("Weather fetch failed", e);
		return null;
	}
};

export default function WeatherDarts() {
	const {
		round,
		remainingScore,
		initialTarget,
		gameState,
		guessedCities,
		makeGuess,
		initializeGame,
		restartGame
	} = useWeatherGameStore();

	const [query, setQuery] = useState('');
	const [suggestions, setSuggestions] = useState<City[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isLoadingWeather, setIsLoadingWeather] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Initialize game on mount
	useEffect(() => {
		initializeGame();
	}, [initializeGame]);


	// Debounced Search
	useDebounce(
		() => {
			if (query.length < 2) {
				setSuggestions([]);
				return;
			}
			setIsSearching(true);
			searchCity(query).then((results) => {
				setSuggestions(results);
				setIsSearching(false);
			});
		},
		300,
		[query]
	);

	const handleCitySelect = async (city: City) => {
		// Check for duplicates
		if (guessedCities.some(c => c.id === city.id)) {
			setError("You've already used this city!");
			setSuggestions([]);
			return;
		}

		setIsLoadingWeather(true);
		setSuggestions([]);
		setQuery(city.name);

		const temp = await getCityWeather(city.latitude, city.longitude);
		setIsLoadingWeather(false);

		if (temp !== null) {
			makeGuess(city, temp);
			setQuery('');
			setError(null);
		} else {
			setError("Failed to fetch weather data. Try again.");
		}
	};

	// Helper to get temperature color
	const getTempColor = (temp: number) => {
		if (temp >= 30) return 'text-temp-hot';
		if (temp <= 10) return 'text-temp-cold';
		return 'text-temp-mild';
	};

	return (
		<div className="weather-game-theme bg-game min-h-screen font-sans selection:bg-cyan-500/30 relative overflow-hidden flex flex-col">
			<GameNavbar accentColor="#06b6d4">
				<div className="flex items-center gap-6">
					<div className="flex flex-col items-end">
						<span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Round</span>
						<span className="text-sm font-bold font-mono text-foreground">{gameState === 'game_over' ? 5 : round}<span className="text-muted-foreground">/</span>5</span>
					</div>
					<div className="h-8 w-px bg-white/10" />
					<div className="flex flex-col items-start">
						<span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Target</span>
						<span className="text-sm font-bold font-mono text-primary">0°</span>
					</div>
				</div>
			</GameNavbar>

			<main className="flex-1 container max-w-5xl mx-auto px-4 py-8 flex flex-col items-center justify-start relative z-10">
				<AnimatePresence mode="wait">
					{gameState === 'playing' && (
						<motion.div
							key="playing"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 1.05 }}
							className="w-full flex flex-col items-center gap-8 max-w-3xl"
						>
							{/* Realistic Dartboard Style Display */}
							<div className="relative mt-8 mb-4">
								<div className="w-80 h-80 rounded-full bg-[#1e293b] border-[16px] border-[#0f172a] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden">
									{/* Dartboard segments pattern */}
									<div className="absolute inset-0 bg-[repeating-conic-gradient(#1e293b_0deg_18deg,#0f172a_18deg_36deg)] opacity-20" />
									<div className="absolute inset-0 rounded-full border-[40px] border-transparent border-t-white/5 opacity-20" />
									<div className="absolute w-[70%] h-[70%] rounded-full border border-white/5" />

									{/* Inner Bullseye Area */}
									<div className="w-48 h-48 rounded-full bg-[#020617] border-4 border-cyan-900/30 flex flex-col items-center justify-center shadow-inner relative z-10">
										<span className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/50 font-bold mb-1">REMAINING</span>
										<div className={`text-6xl font-black tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] ${remainingScore === 0 ? 'text-emerald-400' : 'text-white'}`}>
											{remainingScore.toFixed(1)}
										</div>
									</div>
								</div>

								{/* Target Marker */}
								<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
									TARGET 0
								</div>
							</div>

							{/* Search Interface */}
							<div className="w-full max-w-md relative z-20">
								<div className="relative">
									<div className="absolute left-4 top-3.5 text-muted-foreground">
										<Search className="w-5 h-5" />
									</div>
									<Input
										type="text"
										placeholder="Enter a city to subtract temp..."
										className={`h-12 pl-12 pr-4 bg-slate-900/80 border-white/10 focus:border-cyan-500/50 rounded-xl text-lg backdrop-blur-md transition-all text-white placeholder:text-white/20 ${error ? 'border-red-500/50 focus:border-red-500' : ''}`}
										value={query}
										onChange={(e) => {
											setQuery(e.target.value);
											if (error) setError(null);
										}}
										disabled={isLoadingWeather}
										autoFocus
									/>
									{isLoadingWeather && (
										<div className="absolute right-4 top-3.5 text-cyan-400 animate-spin">
											<Loader2 className="w-5 h-5" />
										</div>
									)}
								</div>

								{error && (
									<motion.div
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										className="mt-2 text-red-400 text-sm flex items-center justify-center gap-2"
									>
										<AlertCircle className="w-4 h-4" /> {error}
									</motion.div>
								)}

								{/* Suggestions Dropdown */}
								<AnimatePresence>
									{suggestions.length > 0 && (
										<motion.div
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											className="absolute w-full mt-2 glass-panel rounded-xl overflow-hidden z-50 divide-y divide-white/5 max-h-64 overflow-y-auto custom-scrollbar shadow-2xl"
										>
											{suggestions.map((city) => (
												<button
													key={city.id}
													onClick={() => handleCitySelect(city)}
													className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left group"
												>
													<div className="flex items-center gap-3">
														{city.country_code && (
															<div className="w-6 h-4 relative shadow-sm rounded-[2px] overflow-hidden">
																<img
																	src={`https://open-meteo.com/images/country-flags/${city.country_code.toLowerCase()}.svg`}
																	alt={city.country}
																	className="w-full h-full object-cover"
																/>
															</div>
														)}
														<div>
															<div className="font-bold text-white text-sm flex items-center gap-2">
																{city.name}
																{guessedCities.some(c => c.id === city.id) && (
																	<span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-muted-foreground uppercase">Used</span>
																)}
															</div>
															<div className="text-xs text-muted-foreground">
																{city.admin1 ? `${city.admin1}, ` : ''}{city.country}
															</div>
														</div>
													</div>
												</button>
											))}
										</motion.div>
									)}
								</AnimatePresence>
							</div>

							{/* Guessed Cities List */}
							<div className="w-full mt-4 space-y-2">
								<h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center mb-4">Flight Path</h3>
								<div className="grid gap-2">
									{/* Initial Target */}
									<div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 opacity-50">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
												<Target className="w-4 h-4 text-cyan-400" />
											</div>
											<span className="font-medium text-white">Initial Target</span>
										</div>
										<span className="font-mono text-cyan-400 font-bold">{initialTarget}°</span>
									</div>

									{/* Guesses */}
									{[...guessedCities].reverse().map((city, i) => (
										<motion.div
											key={city.id}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-white/10"
										>
											<div className="flex items-center gap-3">
												<span className="text-xs font-mono text-muted-foreground w-4">{guessedCities.length - i}.</span>
												{city.country_code && (
													<img
														src={`https://open-meteo.com/images/country-flags/${city.country_code.toLowerCase()}.svg`}
														alt={city.country}
														className="w-5 h-3.5 rounded-[2px]"
													/>
												)}
												<div>
													<div className="font-bold text-white text-sm">{city.name}</div>
												</div>
											</div>
											<div className="flex items-center gap-3">
												<span className={`${getTempColor(city.temperature!)} font-mono font-bold`}>-{city.temperature}°</span>
											</div>
										</motion.div>
									))}
								</div>
							</div>
						</motion.div>
					)}

					{gameState === 'game_over' && (
						<motion.div
							key="game_over"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className="w-full max-w-xl mx-auto"
						>
							<div className="glass-panel rounded-[2rem] overflow-hidden">
								<div className={`p-10 text-center space-y-6 ${Math.abs(remainingScore) < 5 ? 'bg-emerald-500/10' : 'bg-slate-900/50'}`}>
									<div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-cyan-500/30">
										<Trophy className="w-10 h-10 text-cyan-400" />
									</div>

									<div>
										<span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Final Distance from 0</span>
										<h1 className={`text-7xl font-black tracking-tighter my-2 ${Math.abs(remainingScore) === 0 ? 'text-emerald-400' : Math.abs(remainingScore) < 10 ? 'text-white' : 'text-red-400'}`}>
											{Math.abs(remainingScore).toFixed(1)}
										</h1>
										<p className="text-sm text-muted-foreground">
											Started at {initialTarget}°
										</p>
									</div>
								</div>

								<div className="bg-slate-950 p-6 space-y-4">
									<div className="grid grid-cols-2 gap-3 mt-4">
										<Button onClick={restartGame} variant="outline" className="h-12 border-white/10 hover:bg-white/5 text-white">
											<RefreshCw className="mr-2 h-4 w-4" /> Replay
										</Button>
										<Link href="/" className="w-full">
											<Button className="w-full h-12 bg-white text-black hover:bg-white/90">
												<Home className="mr-2 h-4 w-4" /> Home
											</Button>
										</Link>
									</div>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</main>
		</div>
	);
}