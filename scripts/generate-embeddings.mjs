import fs from "fs";
import path from "path";

const wordsPath = path.join(process.cwd(), "lib/words.txt");
const embeddingsPath = path.join(process.cwd(), "lib/word_embeddings.f32");

const words = fs
    .readFileSync(wordsPath, "utf-8")
    .split("\n")
    .filter((w) => w.trim());
const dim = 128;
const buffer = new Float32Array(words.length * dim);

console.log(`Generating embeddings for ${words.length} words...`);

for (let i = 0; i < words.length * dim; i++) {
    buffer[i] = (Math.random() - 0.5) * 2; // Random values between -1 and 1
}

fs.writeFileSync(embeddingsPath, Buffer.from(buffer.buffer));
console.log(`Saved to ${embeddingsPath}`);
