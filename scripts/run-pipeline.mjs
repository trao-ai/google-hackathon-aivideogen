#!/usr/bin/env node
/**
 * Project Atlas — 1-Minute Video Pipeline
 * Self-contained end-to-end runner: research → script → TTS → scenes → frames → video
 *
 * Usage:
 *   node scripts/run-pipeline.mjs "Why the Moon is Slowly Drifting Away From Earth"
 *   node scripts/run-pipeline.mjs  (uses default topic)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ─── Load .env ────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) throw new Error(".env file not found at " + envPath);
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not set in .env");
if (!ELEVENLABS_KEY) throw new Error("ELEVENLABS_API_KEY not set in .env");
if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not set in .env");

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function callOpenAI(messages, model = "gpt-4o") {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.85 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const tokens = data.usage;
  const cost = tokens.prompt_tokens * 0.000005 + tokens.completion_tokens * 0.000015;
  console.log(
    `   [OpenAI] ${tokens.prompt_tokens}in/${tokens.completion_tokens}out tokens — $${cost.toFixed(4)}`
  );
  return data.choices[0].message.content;
}

async function generateTTS(text) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${err}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function generateImage(prompt) {
  // Use Imagen 4.0 Fast via predict endpoint
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const prediction = data.predictions?.[0];
  if (prediction?.bytesBase64Encoded) {
    return Buffer.from(prediction.bytesBase64Encoded, "base64");
  }
  // Fallback: try gemini-2.0-flash-exp-image-generation (generateContent API)
  const res2 = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );
  if (!res2.ok) {
    const err2 = await res2.text();
    throw new Error(`Gemini fallback error ${res2.status}: ${err2.slice(0, 300)}`);
  }
  const data2 = await res2.json();
  for (const candidate of data2.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
  }
  throw new Error(`No image in any Gemini response: ${JSON.stringify(data2).slice(0, 300)}`);
}

function parseJSON(text, label = "response") {
  // Strip markdown code fences if present
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1].trim() : text.trim();

  // Try array first, then object
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch {}
  }
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {}
  }
  throw new Error(
    `Could not parse JSON from ${label}:\n${text.slice(0, 400)}`
  );
}

function getAudioDurationSec(audioPath) {
  try {
    const result = execSync(
      `ffprobe -v quiet -print_format json -show_format "${audioPath}"`,
      { encoding: "utf8" }
    );
    const data = JSON.parse(result);
    return parseFloat(data.format.duration);
  } catch {
    // Rough estimate: 150 wpm
    return 60;
  }
}

function colorPlaceholder(outPath, color, _label, width = 1920, height = 1080) {
  // Simple solid-color PNG (no drawtext — avoids libfreetype dependency)
  execSync(
    `ffmpeg -y -f lavfi -i "color=c=${color}:size=${width}x${height}:duration=1" ` +
      `-frames:v 1 "${outPath}"`,
    { stdio: "pipe" }
  );
}

// ─── MAIN PIPELINE ────────────────────────────────────────────────────────────

async function main() {
  const topic =
    process.argv[2] ||
    "Why the Moon is Slowly Drifting Away From Earth";

  const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(ROOT, "output", runId);
  mkdirSync(outDir, { recursive: true });

  console.log("\n🎬  PROJECT ATLAS — 1-MINUTE VIDEO PIPELINE");
  console.log("============================================");
  console.log(`Topic : "${topic}"`);
  console.log(`RunID : ${runId}`);
  console.log(`Output: ${outDir}\n`);

  // ── STEP 1: RESEARCH ────────────────────────────────────────────────────────
  console.log("📚  Step 1/6  Research");

  const researchResponse = await callOpenAI([
    {
      role: "system",
      content:
        "You are an expert research synthesizer for an educational YouTube channel. " +
        "Use your broad knowledge to create compelling, accurate research briefs. " +
        "Return only valid JSON.",
    },
    {
      role: "user",
      content: `Topic: "${topic}"

Generate a research brief for a 1-minute animated educational video.

Return JSON exactly:
{
  "summary": "2-3 sentence engaging overview",
  "hookAngle": "the most surprising or counterintuitive fact that opens the video",
  "keyFacts": ["fact 1", "fact 2", "fact 3", "fact 4"],
  "coreExplanation": "the main mechanism or story in 2-3 sentences",
  "twist": "the counterintuitive conclusion or mind-blowing implication",
  "visualIdeas": ["visual metaphor 1", "visual metaphor 2", "visual metaphor 3"]
}`,
    },
  ]);

  const research = parseJSON(researchResponse, "research");
  writeFileSync(
    path.join(outDir, "research.json"),
    JSON.stringify(research, null, 2)
  );
  console.log(`   ✓ Research brief: ${research.summary?.slice(0, 80)}...`);

  // ── STEP 2: SCRIPT ───────────────────────────────────────────────────────────
  console.log("\n✍️   Step 2/6  Script (1-minute short-form)");

  const scriptResponse = await callOpenAI([
    {
      role: "system",
      content: `You are a viral script writer for 1-minute animated educational YouTube videos.

Rules:
- Total: 130-160 words (~58-65 seconds at natural speech pace of ~145 wpm)
- Hook in the first sentence — startling fact or provocative question
- Build curiosity, then satisfy it with a satisfying twist
- Every sentence earns its place — no filler
- Write for voice: short punchy sentences, natural rhythm
- No on-screen text instructions in narration

4 sections only:
1. hook     (~30 words, ~12 sec): startling opening fact or question
2. core     (~85 words, ~35 sec): explanation with escalating curiosity, 3 beats
3. reveal   (~25 words, ~10 sec): the surprising twist or implication
4. cta      (~10 words, ~4 sec):  "Subscribe for more mind-bending science."

Return only valid JSON:
{
  "title": "compelling SEO-optimized video title",
  "sections": [
    { "type": "hook",   "text": "...", "estimatedSec": 12 },
    { "type": "core",   "text": "...", "estimatedSec": 35 },
    { "type": "reveal", "text": "...", "estimatedSec": 10 },
    { "type": "cta",    "text": "...", "estimatedSec": 4  }
  ]
}`,
    },
    {
      role: "user",
      content: `Topic: "${topic}"

Research brief:
- Hook angle: ${research.hookAngle}
- Key facts: ${research.keyFacts.join(" | ")}
- Core explanation: ${research.coreExplanation}
- Twist: ${research.twist}

Write the 1-minute script now.`,
    },
  ]);

  let script = parseJSON(scriptResponse, "script");
  // Handle case where LLM returned array of sections directly
  if (Array.isArray(script)) {
    script = { title: topic, sections: script };
  }
  if (!script.sections || !Array.isArray(script.sections)) {
    throw new Error(`Script JSON missing 'sections' array. Got: ${JSON.stringify(script).slice(0, 200)}`);
  }
  writeFileSync(
    path.join(outDir, "script.json"),
    JSON.stringify(script, null, 2)
  );

  const fullText = script.sections.map((s) => s.text).join("\n\n");
  const wordCount = fullText.split(/\s+/).length;
  console.log(`   ✓ Title: "${script.title}"`);
  console.log(`   ✓ ${wordCount} words across ${script.sections.length} sections`);
  writeFileSync(path.join(outDir, "script.txt"), fullText);

  // ── STEP 3: TTS ──────────────────────────────────────────────────────────────
  console.log("\n🎙️   Step 3/6  Voiceover (ElevenLabs TTS)");

  const audioBuffer = await generateTTS(fullText);
  const audioPath = path.join(outDir, "voiceover.mp3");
  writeFileSync(audioPath, audioBuffer);

  const audioDuration = getAudioDurationSec(audioPath);
  const costElevenLabs = (fullText.length / 1000) * 0.3;
  console.log(`   ✓ Audio: ${audioDuration.toFixed(1)}s  (est. $${costElevenLabs.toFixed(3)})`);

  // Build precise timestamps by proportional word-count distribution
  const totalWords = wordCount;
  let cursor = 0;
  const timedSections = script.sections.map((s) => {
    const words = s.text.split(/\s+/).length;
    const frac = words / totalWords;
    const dur = audioDuration * frac;
    const startSec = parseFloat(cursor.toFixed(3));
    cursor += dur;
    return { ...s, startSec, endSec: parseFloat(cursor.toFixed(3)) };
  });

  // ── STEP 4: SCENE PLANNING ───────────────────────────────────────────────────
  console.log("\n🎬  Step 4/6  Scene Planning");

  const STYLE_PREFIX =
    "flat-design vector illustration, clean minimal educational infographic, " +
    "vibrant colors (#3B6EF8 blue, #F97316 orange, #10B981 green), " +
    "bold outlines, no gradients, white background, high quality, professional";

  const scenePlanResponse = await callOpenAI([
    {
      role: "system",
      content:
        "You are a visual scene director for 1-minute animated educational YouTube videos. " +
        "Create exactly 6 scenes that visually complement the narration. " +
        "Each scene must have a detailed, specific image generation prompt. " +
        "Return only a valid JSON array.",
    },
    {
      role: "user",
      content: `Topic: "${topic}"

Narration sections with timestamps:
${timedSections
  .map(
    (s) =>
      `[${s.startSec.toFixed(1)}s → ${s.endSec.toFixed(1)}s] ${s.type.toUpperCase()}: "${s.text}"`
  )
  .join("\n")}

Total duration: ${audioDuration.toFixed(1)} seconds

Visual ideas from research: ${research.visualIdeas?.join(", ")}

Style for all image prompts: "${STYLE_PREFIX}"

Create exactly 6 scenes evenly distributed across the full ${audioDuration.toFixed(1)}s duration.
Each scene should last ~${(audioDuration / 6).toFixed(1)}s.

Scene types: character_explanation | infographic | metaphor | dramatic_reveal | comparison | timeline | cta

Return JSON array (exactly 6 items):
[
  {
    "orderIndex": 0,
    "narrationStartSec": 0,
    "narrationEndSec": 10.5,
    "sceneType": "dramatic_reveal",
    "purpose": "one sentence describing what this scene shows",
    "imagePrompt": "FULL detailed image generation prompt starting with '${STYLE_PREFIX}, ...'",
    "motionNotes": "slow zoom in from center"
  }
]

Make each imagePrompt highly specific and visual. Include what characters, objects, text labels, and composition to show.`,
    },
  ]);

  let scenes = parseJSON(scenePlanResponse, "scenes");
  // Handle case where LLM wrapped scenes in an object
  if (!Array.isArray(scenes) && scenes.scenes) scenes = scenes.scenes;
  if (!Array.isArray(scenes)) {
    throw new Error(`Scenes JSON is not an array. Got: ${JSON.stringify(scenes).slice(0, 200)}`);
  }
  writeFileSync(
    path.join(outDir, "scenes.json"),
    JSON.stringify(scenes, null, 2)
  );
  console.log(`   ✓ ${scenes.length} scenes planned`);
  scenes.forEach((s, i) =>
    console.log(
      `     Scene ${i + 1} [${s.narrationStartSec?.toFixed(1)}s–${s.narrationEndSec?.toFixed(1)}s]: ${s.purpose?.slice(0, 60)}`
    )
  );

  // ── STEP 5: FRAME GENERATION ─────────────────────────────────────────────────
  console.log("\n🖼️   Step 5/6  Frame Generation (Gemini Imagen 3)");

  const framePaths = [];
  const FALLBACK_COLORS = [
    "0x1e3a5f", "0x2d6a4f", "0x7b2d8b", "0x8b1a1a", "0x1a5276", "0x145a32",
  ];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const label = `Scene ${i + 1}/${scenes.length}`;
    process.stdout.write(`   ${label}: ${scene.purpose?.slice(0, 55)}... `);

    const framePath = path.join(outDir, `frame-${i}.png`);

    try {
      const prompt = scene.imagePrompt || `${STYLE_PREFIX}, ${scene.purpose}`;
      const imageBuffer = await generateImage(prompt);
      writeFileSync(framePath, imageBuffer);
      framePaths.push(framePath);
      console.log("✓");
    } catch (err) {
      console.log(`⚠️  fallback (${err.message.slice(0, 60)})`);
      // Create a styled placeholder with ffmpeg
      colorPlaceholder(
        framePath,
        FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        scene.purpose?.slice(0, 35) || `Scene ${i + 1}`
      );
      framePaths.push(framePath);
    }
  }
  console.log(`   ✓ ${framePaths.length} frames ready`);

  // ── STEP 6: VIDEO ASSEMBLY ───────────────────────────────────────────────────
  console.log("\n🎞️   Step 6/6  Video Assembly (ffmpeg)");

  const fps = 25;
  const clipPaths = [];

  // Create one video clip per scene with Ken Burns zoom effect
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const clipPath = path.join(outDir, `clip-${i}.mp4`);

    const rawDur =
      (scene.narrationEndSec ?? audioDuration) -
      (scene.narrationStartSec ?? 0);
    const dur = Math.max(rawDur, 0.5); // at least 0.5s
    const frames = Math.round(dur * fps);
    const zoomIncrement = (0.25 / Math.max(frames, 1)).toFixed(8);

    // Ken Burns: slow zoom from 1.0 to ~1.25, centered
    const vf =
      `scale=3840:2160:force_original_aspect_ratio=increase,` +
      `crop=3840:2160,` +
      `zoompan=` +
      `z='if(eq(on\\,1)\\,1\\,min(zoom+${zoomIncrement}\\,1.25))':` +
      `x='iw/2-(iw/zoom/2)':` +
      `y='ih/2-(ih/zoom/2)':` +
      `d=${frames}:` +
      `s=1920x1080:` +
      `fps=${fps}`;

    process.stdout.write(
      `   Clip ${i + 1}/${scenes.length} (${dur.toFixed(1)}s)... `
    );

    execSync(
      `ffmpeg -y -loop 1 -t ${dur.toFixed(3)} -i "${framePaths[i]}" ` +
        `-vf "${vf}" ` +
        `-c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p ` +
        `"${clipPath}"`,
      { stdio: "pipe" }
    );

    clipPaths.push(clipPath);
    console.log("✓");
  }

  // Write ffmpeg concat list
  const concatListPath = path.join(outDir, "concat.txt");
  writeFileSync(
    concatListPath,
    clipPaths.map((p) => `file '${p}'`).join("\n")
  );

  // Concatenate clips + merge voiceover
  const finalPath = path.join(outDir, "final.mp4");
  process.stdout.write("   Merging clips + audio... ");
  execSync(
    `ffmpeg -y ` +
      `-f concat -safe 0 -i "${concatListPath}" ` +
      `-i "${audioPath}" ` +
      `-map 0:v -map 1:a ` +
      `-c:v libx264 -preset fast -crf 18 ` +
      `-c:a aac -b:a 192k ` +
      `-movflags +faststart ` +
      `-shortest ` +
      `"${finalPath}"`,
    { stdio: "pipe" }
  );
  console.log("✓");

  // ── DONE ──────────────────────────────────────────────────────────────────────
  const finalDuration = getAudioDurationSec(finalPath);

  console.log(`
╔══════════════════════════════════════════════════════╗
║             VIDEO COMPLETE                           ║
╠══════════════════════════════════════════════════════╣
║  Title   : ${(script.title || topic).slice(0, 40).padEnd(40)} ║
║  Duration: ${String(finalDuration.toFixed(1) + "s").padEnd(40)} ║
║  Scenes  : ${String(scenes.length).padEnd(40)} ║
╠══════════════════════════════════════════════════════╣
║  Output folder:                                      ║
║  ${outDir.slice(-50).padEnd(50)} ║
╠══════════════════════════════════════════════════════╣
║  Files:                                              ║
║    research.json   — research brief                  ║
║    script.json     — script + sections               ║
║    script.txt      — plain narration text            ║
║    voiceover.mp3   — ElevenLabs TTS audio            ║
║    scenes.json     — scene plan                      ║
║    frame-0..N.png  — Gemini-generated frames         ║
║    final.mp4       — assembled video                 ║
╚══════════════════════════════════════════════════════╝
`);

  // Open the video on macOS
  try {
    execSync(`open "${finalPath}"`);
  } catch {}
}

main().catch((err) => {
  console.error("\n❌  Pipeline failed:", err.message);
  if (err.stack) console.error(err.stack.split("\n").slice(1, 4).join("\n"));
  process.exit(1);
});
