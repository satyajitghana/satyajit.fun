import { create } from "zustand";

export interface City {
    id: number;
    name: string;
    country: string;
    country_code: string;
    latitude: number;
    longitude: number;
    temperature?: number; // Only present after selection
    admin1?: string; // State/Region
}

interface GameState {
    round: number; // Current attempt (1-5)
    remainingScore: number; // The target value on the dartboard (starts high, e.g., 84)
    initialTarget: number; // The starting target to remember what we aimed for
    guessedCities: City[]; // Cities already used
    gameState: "playing" | "game_over";

    // Actions
    initializeGame: () => void;
    makeGuess: (city: City, temp: number) => void;
    restartGame: () => void;
}

export const useWeatherGameStore = create<GameState>((set, get) => ({
    round: 1,
    remainingScore: 0,
    initialTarget: 0,
    guessedCities: [],
    gameState: "playing",

    initializeGame: () => {
        // Target between 50 and 100 for a 5-round game seems reasonable
        const target = Math.floor(Math.random() * 51) + 50; // 50 to 100
        set({
            round: 1,
            remainingScore: target,
            initialTarget: target,
            guessedCities: [],
            gameState: "playing",
        });
    },

    makeGuess: (city, temp) =>
        set((state) => {
            const newScore = state.remainingScore - temp;
            const cityWithTemp = { ...city, temperature: temp };

            // If it was the last round (5), game over
            if (state.round >= 5) {
                return {
                    guessedCities: [...state.guessedCities, cityWithTemp],
                    remainingScore: newScore,
                    gameState: "game_over",
                };
            }

            // Otherwise, continue to next round immediately (no result screen)
            return {
                guessedCities: [...state.guessedCities, cityWithTemp],
                remainingScore: newScore,
                round: state.round + 1,
                gameState: "playing",
            };
        }),

    restartGame: () => {
        get().initializeGame();
    },
}));
