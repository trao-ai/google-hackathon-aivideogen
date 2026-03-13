import { Router } from "express";
import { prisma, trackLLMCost } from "@atlas/db";
import { createLLMProvider } from "@atlas/integrations";
import { ApiError } from "../middleware/error-handler";
import * as fs from "fs";
import * as path from "path";

export const scriptRouter = Router();

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");

const SCRIPT_WRITER_PROMPT = `You are the most electrifying science storyteller on the planet.

Your voice is: Neil deGrasse Tyson's AWE + Joe Rogan's RAW ENERGY + Kurzgesagt's MIND-BENDING CLARITY.

You have one job: make the listener feel like they are hearing the most fascinating thing they've ever heard in their life. You write with GENUINE excitement — because you ARE genuinely excited. Every word drips with energy. Every sentence builds on the last. You never let the listener breathe without giving them something new to think about.

════════════════════════════════
THE GOLDEN RULE: WRITE FOR A HUMAN VOICE
════════════════════════════════
This script will be spoken by a human narrator. Every single sentence must:
1. Sound NATURAL when spoken aloud — test each line by reading it in your head
2. Have RHYTHM — short punchy sentences. Then a longer one that builds and builds. Then a short one. BAM.
3. Feel like the narrator is TALKING TO THEIR BEST FRIEND at 2am, not reading a textbook

════════════════════════════════
HOW TO CREATE EXPLOSIVE EXCITEMENT
════════════════════════════════
TECHNIQUE 1 — THE MID-STORY PLUNGE:
Never start with "Today we're going to learn about..."
START IN THE MIDDLE OF THE ACTION. Mid-sentence, mid-story, mid-revelation.
Example: "In 1928, Alexander Fleming came back from vacation to find his lab overrun with mold. He was FURIOUS. He almost threw everything away. And then... he looked closer."

TECHNIQUE 2 — THE PAUSE AND PUNCH:
Set up a long sentence that builds tension... and then.
Short.
That.
The listener FEELS it.

TECHNIQUE 3 — THE "WAIT, WHAT?" BEAT:
Every 30 seconds, drop a fact so surprising the listener literally says "wait, what?" out loud.
"Your gut has more neurons than your spinal cord. Not a few more. MORE NEURONS. In your gut. Right now. Making decisions."

TECHNIQUE 4 — RHETORICAL QUESTIONS THAT DEMAND ANSWERS:
"But here's the question nobody was asking — WHY would evolution do that? What's the point?"
Then make them wait 10 full seconds before answering it.

TECHNIQUE 5 — SCALE SHIFTS:
"We're talking about 38 TRILLION bacteria. That's more cells than your entire body has. Think about that for a second..."

TECHNIQUE 6 — THE PERSONAL STAKES:
Bring it home. Make it about THEM. Their body. Their life. Their future.
"The next time you feel anxious... that might not be your brain. That might be your gut. Talking."

════════════════════════════════
ELEVENLABS PROSODY — USE THESE RELIGIOUSLY
════════════════════════════════
These are NOT optional. They are the difference between a boring read and a captivating performance:

"..." — DRAMATIC PAUSE (0.7-1.2 seconds). Use before the punchline. Before a revelation. Before a number that blows minds. Example: "And the answer was... nothing. Absolutely nothing worked."

"—" — SHARP PIVOT. Like a comedian's timing cut. Kills one thought, starts another instantly. Example: "They thought they understood it — they were WRONG."

CAPS ONE WORD — peak stress, use like hot sauce (sparingly but POWERFULLY). Max 2-3 per paragraph. The word that carries the whole meaning. "The bacteria weren't just living there. They were TALKING."

"!" — Genuine excitement, real astonishment. Not performative. "And it works! Every single time!"

Short. Fragment. Sentences. — These hit like punches. Use when you want the narrator to let each word land separately.

"Now..." — transitional gravity. Signals "pay attention, this is important."
"Here's the thing..." — about to drop truth. Creates lean-in.
"Wait. It gets better." — explicit tease. Listener cannot stop now.
"And that's just... wild." — letting a revelation breathe before moving on.
"You know what that means?" — direct engagement, makes listener answer in their head.
"Think about that." — commands reflection. Creates a micro-pause in listener's mind.
"Because here's what nobody talks about..." — positions next fact as secret knowledge.
"Actually..." — gentle reversal, suggests what we thought was wrong.

════════════════════════════════
WHAT MAKES THE VOICE EXPRESSIVE (DO THESE)
════════════════════════════════
- Vary sentence length WILDLY. Long complex sentences followed by three-word blasts.
- Use lists of three for rhythm: "Fast, efficient, and absolutely terrifying."
- Repeat a word for emphasis: "Not slightly different. Not a little bit different. COMPLETELY different."
- Whisper moments (write it slow and quiet): "And nobody knew. For forty years. Nobody knew."
- Explosion moments (write it fast and punchy): "And then it all clicked — in one experiment, one paper, one morning in a lab in Belgium — everything we knew changed."
- Questions that hang: "Why? Why would the body do this to itself?"
- Answers that land: "Because it was never trying to hurt you. It was trying to save you."

════════════════════════════════
WHAT YOU ABSOLUTELY MUST NOT DO
════════════════════════════════
NEVER:
- Start with "In this video..." or "Today we'll explore..." or "Welcome back..."
- Use words like "Furthermore," "In conclusion," "Subsequently," "Moreover"
- Write sentences that feel like Wikipedia
- Use passive voice ("It was discovered that" → "Scientists discovered")
- Repeat a fact you already stated
- Leave 40 seconds without a new revelation or pivot
- End a section flatly — every section ends on a hook or a question

ALWAYS:
- Write in contractions: "it's", "we're", "they're", "that's", "you'd", "I've"
- Name real researchers, real places, real years — specificity = credibility
- Give analogies that make complex things feel touchable
- Make the listener feel SMART for understanding this

{{SECTION_STRUCTURE}}`;

// ─── Duration presets ────────────────────────────────────────────────────────

const SECTION_STRUCTURE_SHORT = `════════════════════════════════
4-SECTION STRUCTURE (~1 MINUTE)
════════════════════════════════
sectionType: cold_open       (~15 sec, 35-40 words)  — PLUNGE mid-story, one explosive hook. Zero fluff.
sectionType: main_explanation_1 (~20 sec, 45-55 words) — The core insight. One killer analogy. Make it VISUAL.
sectionType: twist           (~15 sec, 30-40 words)  — The reveal that flips it. Short. Punchy. Mind = blown.
sectionType: cta             (~10 sec, 20-25 words)   — Quick close. "Share this." style. Earned, human.

TARGET: 130-160 words total. That's ~1 minute at 150 words per minute.
CRITICAL: Do NOT exceed 180 words. This is a SHORT-FORM video. Every word must earn its place.`;

const SECTION_STRUCTURE_LONG = `════════════════════════════════
8-SECTION STRUCTURE (4-5 MINUTES)
════════════════════════════════
sectionType: cold_open       (~30 sec, 70-80 words)   — PLUNGE mid-story, most dramatic moment first. Zero fluff.
sectionType: hook            (~20 sec, 45-55 words)    — The counterintuitive truth that sets up the mystery.
sectionType: context         (~50 sec, 110-130 words)  — Background as STORY. Characters, places, turning points.
sectionType: main_explanation_1 (~60 sec, 135-155 words) — The deep mechanism. Analogies. Visuals. WONDER.
sectionType: twist           (~35 sec, 80-90 words)    — The reveal that reframes EVERYTHING we just learned.
sectionType: consequences    (~35 sec, 80-90 words)    — What this means for the world. For YOU.
sectionType: closing_hook    (~25 sec, 55-65 words)    — One final fact that leaves them thinking for DAYS.
sectionType: cta             (~15 sec, 30-40 words)    — Natural, earned, human. "If this broke your brain a little..." style.

TARGET: 600-700 words total. That's 4-5 minutes at 150 words per minute.`;

scriptRouter.post("/:id/generate-scripts", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { topics: { where: { status: "approved" }, take: 1 } },
    });
    if (!project) throw new ApiError(404, "Project not found");
    if (!project.selectedTopicId) throw new ApiError(400, "No approved topic.");

    const topic = project.topics[0];
    const brief = await prisma.researchBrief.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
    });
    if (!brief) throw new ApiError(400, "No research brief found. Run research first.");

    // Duration preset: "short" (~1 min) or "long" (4-5 min)
    const duration: "short" | "long" = req.body.duration === "short" ? "short" : "long";
    const sectionStructure = duration === "short" ? SECTION_STRUCTURE_SHORT : SECTION_STRUCTURE_LONG;
    const systemPrompt = SCRIPT_WRITER_PROMPT.replace("{{SECTION_STRUCTURE}}", sectionStructure);

    const targetWords = duration === "short" ? 150 : 650;
    const targetDurationSec = duration === "short" ? 60 : 270;
    const durationLabel = duration === "short" ? "~1 min" : "4-5 min";

    await prisma.project.update({ where: { id: project.id }, data: { status: "scripting" } });
    console.log(`[script] Writing ${durationLabel} script for: "${topic?.title}"`);

    const researchContext = [
      `SUMMARY:\n${brief.summary}`,
      brief.background ? `\nBACKGROUND:\n${brief.background}` : "",
      brief.currentDevelopments ? `\nCURRENT DEVELOPMENTS:\n${brief.currentDevelopments}` : "",
      `\nKEY FACTS (USE THESE — they're the "wait, what?" moments):\n${(brief.keyFacts as string[]).map((f, i) => `${i + 1}. ${f}`).join("\n")}`,
      brief.controversies ? `\nCONTROVERSIES (tension = engagement):\n${brief.controversies}` : "",
      brief.stakes ? `\nWHY IT MATTERS (emotional anchor):\n${brief.stakes}` : "",
      `\nSTORY ANGLES (pick the best, weave in others):\n${(brief.storyAngles as string[]).map((a, i) => `${i + 1}. ${a}`).join("\n")}`,
    ].join("");

    const sources = brief.sources as Array<{ title: string; url: string; year?: number; credibility?: string }>;
    const sourceList = sources
      .filter((s) => s.credibility !== "low")
      .slice(0, 8)
      .map((s, i) => `[${i + 1}] ${s.title} (${s.year ?? "n.d."}) — ${s.url}`)
      .join("\n");

    const llm = createLLMProvider();
    const response = await llm.chat([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Write the most captivating, electrifying voiceover script you have ever written. This is your masterpiece.

DURATION: ${durationLabel} (${targetWords} words)
TOPIC: "${topic?.title}"
CATEGORY: ${project.niche}

═══ RESEARCH MATERIAL ═══
${researchContext}

═══ CREDIBLE SOURCES (cite naturally — "A 2023 study found..." / "Researchers at MIT discovered...") ═══
${sourceList}

═══ NON-NEGOTIABLE REQUIREMENTS ═══
1. COLD OPEN starts MID-STORY — no intro, no "today we'll explore", just BOOM, you're in it
2. Every ${duration === "short" ? "10-15" : "25-30"} seconds: a new revelation, a new "wait, WHAT?" moment
3. Use "..." before every major reveal — make the listener WAIT for it
4. Use "—" when you pivot hard or cut a thought dramatically
5. CAPS on the ONE word that carries the most weight in a sentence (max 2-3 per section)
6. Sentences vary wildly in length: long building ones then SHORT PUNCHY ones
7. Write questions that DEMAND answers: "But why? Why would it work like that?"
8. Personal stakes: bring it back to the listener's BODY, their LIFE, their FUTURE
9. Cite sources naturally — not "according to [1]" but "A team at Oxford found..."
10. CLOSING HOOK must leave them staring at the ceiling tonight
${duration === "short" ? "11. CRITICAL: This is SHORT-FORM. Keep it TIGHT. No filler. Every word earns its place. ~150 words MAX." : ""}

Return ONLY valid JSON. No markdown. No preamble. Just the JSON object:
{
  "titleCandidates": ["3 punchy titles, max 60 chars each, curiosity-gap format"],
  "thumbnailAngles": ["2 specific thumbnail visuals that stop thumbs mid-scroll"],
  "estimatedDurationSec": ${targetDurationSec},
  "wordCount": ${targetWords},
  "sections": [
    {
      "sectionType": "cold_open",
      "text": "Full electrifying text with prosody markers...",
      "estimatedDurationSec": ${duration === "short" ? 15 : 30},
      "wordCount": ${duration === "short" ? 35 : 75}
    }
  ]
}`,
      },
    ]);

    // Track LLM cost
    await trackLLMCost({
      projectId: project.id,
      stage: "script",
      vendor: "openai",
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      totalCostUsd: response.costUsd,
    });

    let parsed: any = { sections: [] };
    try {
      const match = response.content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      parsed.sections = [{ sectionType: "narration", text: response.content, estimatedDurationSec: targetDurationSec, wordCount: targetWords }];
    }

    const fullText = (parsed.sections ?? []).map((s: any) => s.text).join("\n\n");
    const wordCount = fullText.split(/\s+/).length;
    const estimatedDurationSec = Math.round((wordCount / 150) * 60);

    const script = await prisma.script.create({
      data: {
        projectId: project.id,
        titleCandidates: parsed.titleCandidates ?? [topic?.title ?? ""],
        thumbnailAngles: parsed.thumbnailAngles ?? [],
        outline: (parsed.sections ?? []).map((s: any) => s.sectionType).join(" → "),
        fullText,
        estimatedDurationSec,
        status: "draft",
        qualityScore: {},
        sections: {
          create: (parsed.sections ?? []).map((s: any, i: number) => ({
            orderIndex: i,
            sectionType: s.sectionType ?? "narration",
            text: s.text,
            estimatedDurationSec: s.estimatedDurationSec ?? 60,
            sourceRefs: [],
          })),
        },
      },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });

    // Auto-approve
    await prisma.project.update({
      where: { id: project.id },
      data: { selectedScriptId: script.id, status: "script_selected" },
    });

    console.log(`[script] Done — ${wordCount} words, ~${Math.round(estimatedDurationSec / 60)} min`);
    res.json(script);
  } catch (err) {
    await prisma.project.update({ where: { id: req.params.id }, data: { status: "script_failed" } }).catch(() => {});
    next(err);
  }
});

scriptRouter.get("/:id/scripts", async (req, res, next) => {
  try {
    const scripts = await prisma.script.findMany({
      where: { projectId: req.params.id },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(scripts);
  } catch (err) { next(err); }
});

scriptRouter.post("/:projectId/scripts/:scriptId/approve", async (req, res, next) => {
  try {
    const { projectId, scriptId } = req.params;
    await prisma.$transaction([
      prisma.script.update({ where: { id: scriptId }, data: { status: "approved" } }),
      prisma.project.update({ where: { id: projectId }, data: { selectedScriptId: scriptId, status: "script_selected" } }),
    ]);
    res.json({ message: "Script approved" });
  } catch (err) { next(err); }
});

scriptRouter.delete("/:projectId/scripts/:scriptId", async (req, res, next) => {
  try {
    const { projectId, scriptId } = req.params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new ApiError(404, "Project not found");

    // Voiceover.scriptId has no CASCADE in schema — must delete voiceovers first
    const voiceovers = await prisma.voiceover.findMany({ where: { scriptId } });
    for (const vo of voiceovers) {
      const audioFile = path.join(AUDIO_DIR, path.basename(vo.audioUrl));
      if (fs.existsSync(audioFile)) fs.unlinkSync(audioFile);
    }
    await prisma.voiceover.deleteMany({ where: { scriptId } });

    await prisma.script.delete({ where: { id: scriptId } });

    // If this was the selected script, clear it and roll back project status
    if (project.selectedScriptId === scriptId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { selectedScriptId: null, status: "research_done" },
      });
    }

    res.status(204).send();
  } catch (err) { next(err); }
});
