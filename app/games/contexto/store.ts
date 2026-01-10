import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Guess {
    word: string;
    rank: number;
    id: number; // Unique ID for key
}

interface GameState {
    guesses: Guess[];
    gameState: "playing" | "won";
    gameNumber: number; // To track daily resets
    gameMode: "daily" | "random";
    randomGameId: number;
    loading: boolean;
    error: string | null;

    submitGuess: (word: string) => Promise<void>;
    resetGame: () => void;
    startRandomGame: () => void;
    switchToDaily: () => void;
    checkDailyReset: () => void;
}

// Helper to get current day index
const getDayIndex = () => {
    const now = new Date();
    const start = new Date(2024, 0, 1).getTime();
    return Math.floor((now.getTime() - start) / (1000 * 60 * 60 * 24));
};

export const useContextoStore = create<GameState>()(
    persist(
        (set, get) => ({
            guesses: [],
            gameState: "playing",
            gameNumber: getDayIndex(),
            gameMode: "daily",
            randomGameId: Date.now(),
            loading: false,
            error: null,

            checkDailyReset: () => {
                const currentDay = getDayIndex();
                // Only reset if we are in daily mode and the day has changed
                if (
                    get().gameMode === "daily" &&
                    get().gameNumber !== currentDay
                ) {
                    set({
                        guesses: [],
                        gameState: "playing",
                        gameNumber: currentDay,
                        error: null,
                    });
                }
            },

            resetGame: () => {
                set({
                    guesses: [],
                    gameState: "playing",
                    error: null,
                });
            },

            startRandomGame: () => {
                set({
                    guesses: [],
                    gameState: "playing",
                    gameMode: "random",
                    randomGameId: Date.now(),
                    error: null,
                });
            },

            switchToDaily: () => {
                const currentDay = getDayIndex();
                // If we are already on the correct day in daily mode (restored from state), don't reset
                // But if we're switching modes, we might need to restore the daily state or reset if it's stale
                // For simplicity, if we switch to daily, we just ensure the day is correct.
                // The persisted state might have old daily guesses.
                const state = get();
                if (
                    state.gameMode !== "daily" ||
                    state.gameNumber !== currentDay
                ) {
                    set({
                        gameMode: "daily",
                        gameNumber: currentDay,
                        // If the persisted daily game was from a different day, reset it.
                        // Note: partialize saves guesses, so if we switch back to daily on same day, guesses remain.
                        // If day changed, we reset.
                        ...(state.gameNumber !== currentDay
                            ? { guesses: [], gameState: "playing" }
                            : {}),
                    });
                }
            },

            submitGuess: async (word: string) => {
                const { guesses, gameState, gameMode, randomGameId } = get();
                if (gameState === "won") return;

                // Check if already guessed
                if (
                    guesses.some(
                        (g) => g.word.toLowerCase() === word.toLowerCase()
                    )
                ) {
                    set({ error: "Already guessed!" });
                    return;
                }

                set({ loading: true, error: null });

                try {
                    const res = await fetch("/api/contexto/rank", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            guess: word,
                            gameMode,
                            gameId:
                                gameMode === "daily"
                                    ? getDayIndex()
                                    : randomGameId,
                        }),
                    });

                    if (!res.ok) {
                        const data = await res.json();
                        set({ error: data.error || "Failed to submit guess" });
                        set({ loading: false });
                        return;
                    }

                    const data = await res.json();

                    const newGuess: Guess = {
                        word: data.word,
                        rank: data.rank,
                        id: Date.now(),
                    };

                    const newGuesses = [...guesses, newGuess].sort(
                        (a, b) => a.rank - b.rank
                    );

                    set({
                        guesses: newGuesses,
                        gameState: data.rank === 1 ? "won" : "playing",
                        loading: false,
                    });
                } catch (e) {
                    set({ error: "Network error", loading: false });
                }
            },
        }),
        {
            name: "contexto-storage",
            partialize: (state) => ({
                guesses: state.guesses,
                gameState: state.gameState,
                gameNumber: state.gameNumber,
                gameMode: state.gameMode,
                randomGameId: state.randomGameId,
            }),
        }
    )
);
