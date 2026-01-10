import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Cache the data in memory to avoid reading files on every request
let words: string[] | null = null;
let embeddings: Float32Array | null = null;
let wordToIndex: Map<string, number> | null = null;

// Cache for daily game specifically
let currentDayIndex: number | null = null;
let dailyTargetIndex: number | null = null;
let dailySortedRanks: number[] | null = null;

const DIM = 128;

const STOP_WORDS = new Set([
    "the",
    "and",
    "for",
    "that",
    "this",
    "with",
    "you",
    "not",
    "are",
    "from",
    "your",
    "all",
    "have",
    "new",
    "more",
    "was",
    "will",
    "can",
    "about",
    "has",
    "but",
    "our",
    "one",
    "other",
    "they",
    "site",
    "may",
    "what",
    "which",
    "their",
    "out",
    "use",
    "any",
    "there",
    "see",
    "only",
    "his",
    "when",
    "here",
    "who",
    "also",
    "now",
    "help",
    "get",
    "view",
    "first",
    "been",
    "would",
    "how",
    "were",
    "some",
    "these",
    "its",
    "like",
    "than",
    "find",
    "back",
    "top",
    "had",
    "list",
    "just",
    "over",
    "into",
    "two",
    "next",
    "used",
    "last",
    "most",
    "buy",
    "make",
    "them",
    "should",
    "her",
    "add",
    "such",
    "please",
    "after",
    "best",
    "then",
    "good",
    "well",
    "where",
    "info",
    "through",
    "each",
    "she",
    "very",
    "need",
    "many",
    "said",
    "does",
    "set",
    "under",
    "full",
    "know",
    "way",
    "could",
    "must",
    "off",
    "before",
    "did",
    "right",
    "because",
    "those",
    "using",
    "take",
    "want",
    "between",
    "even",
    "check",
    "being",
    "much",
    "same",
    "own",
    "found",
    "both",
    "while",
    "down",
    "three",
    "him",
    "without",
    "per",
    "think",
    "big",
    "since",
    "including",
]);

function loadData() {
    if (words && embeddings) return;

    try {
        const wordsPath = path.join(process.cwd(), "lib/words.txt");
        const embeddingsPath = path.join(
            process.cwd(),
            "lib/word_embeddings.f32"
        );

        const wordsContent = fs.readFileSync(wordsPath, "utf-8");
        words = wordsContent
            .split("\n")
            .map((w) => w.trim())
            .filter((w) => w.length > 0);

        wordToIndex = new Map();
        words.forEach((w, i) => wordToIndex!.set(w.toLowerCase(), i));

        const buffer = fs.readFileSync(embeddingsPath);
        embeddings = new Float32Array(
            buffer.buffer,
            buffer.byteOffset,
            buffer.byteLength / 4
        );

        console.log(`Loaded ${words.length} words and embeddings.`);
    } catch (error) {
        console.error("Failed to load Contexto data:", error);
    }
}

function getDayIndex() {
    const now = new Date();
    // Use a fixed epoch to ensure consistency
    const start = new Date(2024, 0, 1).getTime();
    const diff = now.getTime() - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function cosineSimilarity(vecA: Float32Array, vecB: Float32Array) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < DIM; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getEmbedding(index: number) {
    if (!embeddings) return new Float32Array(DIM);
    const start = index * DIM;
    return embeddings.subarray(start, start + DIM);
}

function getTargetForGame(gameId: number, mode: "daily" | "random") {
    if (!words) return null;

    let index =
        Math.abs(Math.floor(gameId * 1664525 + 1013904223)) % words.length;

    // If the word is a stop word, linearly probe until we find a non-stop word
    // We also want to ensure we don't just pick the same next word for every "collision"
    // So we use the gameId to influence the probe step as well
    let attempt = 0;
    while (STOP_WORDS.has(words[index].toLowerCase()) && attempt < 1000) {
        index = (index + 1) % words.length;
        attempt++;
    }

    return index;
}

function initializeDailyData() {
    if (!words || !embeddings) return;

    const day = getDayIndex();

    if (currentDayIndex !== day || dailyTargetIndex === null) {
        currentDayIndex = day;
        dailyTargetIndex = getTargetForGame(day, "daily");

        if (dailyTargetIndex === null) return;

        console.log(
            `Contexto Word of the Day Index: ${dailyTargetIndex}, Word: ${words[dailyTargetIndex]}`
        );

        // Pre-calculate ranks for daily game
        const targetVec = getEmbedding(dailyTargetIndex);
        const scores = words.map((_, i) => ({
            index: i,
            score: cosineSimilarity(targetVec, getEmbedding(i)),
        }));

        scores.sort((a, b) => b.score - a.score);
        dailySortedRanks = scores.map((s) => s.index);
    }
}

export async function POST(req: Request) {
    loadData();

    if (!words || !wordToIndex || !embeddings) {
        return NextResponse.json(
            { error: "Game data not loaded" },
            { status: 500 }
        );
    }

    try {
        const { guess, gameMode = "daily", gameId } = await req.json();
        const normalizedGuess = guess.toLowerCase().trim();

        const guessIndex = wordToIndex.get(normalizedGuess);

        if (guessIndex === undefined) {
            return NextResponse.json(
                { error: "Word not found in dictionary" },
                { status: 404 }
            );
        }

        let rank: number;

        if (gameMode === "daily") {
            initializeDailyData();
            if (!dailySortedRanks) throw new Error("Daily data not ready");

            // Fast lookup for daily
            const rankIndex = dailySortedRanks.indexOf(guessIndex);
            rank = rankIndex + 1;
        } else {
            // Random game calculation
            const targetIndex = getTargetForGame(Number(gameId), "random");
            if (targetIndex === null) throw new Error("Invalid game ID");

            if (guessIndex === targetIndex) {
                rank = 1;
            } else {
                const targetVec = getEmbedding(targetIndex);
                const guessVec = getEmbedding(guessIndex);
                const guessScore = cosineSimilarity(targetVec, guessVec);

                // Count how many words have a higher score
                let betterCount = 0;
                for (let i = 0; i < words.length; i++) {
                    if (i === targetIndex) {
                        betterCount++; // Target is always better
                        continue;
                    }
                    if (i === guessIndex) continue;

                    const vec = getEmbedding(i);
                    const score = cosineSimilarity(targetVec, vec);
                    if (score > guessScore) {
                        betterCount++;
                    }
                }
                rank = betterCount + 1;
            }
        }

        return NextResponse.json({
            word: words[guessIndex],
            rank: rank,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
