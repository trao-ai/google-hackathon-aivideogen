import { Router } from "express";
import { prisma } from "@atlas/db";
import { createLLMProvider } from "@atlas/integrations";
import { ApiError } from "../middleware/error-handler";

export const researchRouter = Router();

async function fetchOpenAlex(query: string) {
  try {
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&sort=cited_by_count:desc&per-page=8&select=id,title,abstract_inverted_index,cited_by_count,publication_year,authorships,primary_location`,
      { headers: { "User-Agent": "ProjectAtlas/1.0" } },
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.results ?? []).map((w: any) => {
      let abstract = "";
      if (w.abstract_inverted_index) {
        const words: [string, number][] = [];
        for (const [word, positions] of Object.entries(w.abstract_inverted_index as Record<string, number[]>))
          for (const pos of positions) words.push([word, pos]);
        abstract = words.sort((a, b) => a[1] - b[1]).map(x => x[0]).join(" ").slice(0, 500);
      }
      return { title: w.title, url: w.primary_location?.landing_page_url ?? "https://openalex.org", snippet: abstract || w.title, year: w.publication_year, authors: (w.authorships ?? []).slice(0, 3).map((a: any) => a.author.display_name), citations: w.cited_by_count, type: "paper" };
    });
  } catch { return []; }
}

async function fetchSemanticScholar(query: string) {
  try {
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,abstract,year,citationCount,authors,url,externalIds&limit=8`,
      { headers: { "User-Agent": "ProjectAtlas/1.0" } },
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.data ?? []).map((p: any) => ({
      title: p.title, url: p.url ?? (p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : ""),
      snippet: (p.abstract ?? "").slice(0, 400), year: p.year,
      authors: (p.authors ?? []).slice(0, 3).map((a: any) => a.name),
      citations: p.citationCount, type: "paper",
    }));
  } catch { return []; }
}

async function fetchWikipedia(query: string) {
  try {
    const encoded = encodeURIComponent(query.replace(/ /g, "_"));
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`, { headers: { "User-Agent": "ProjectAtlas/1.0" } });
    if (!res.ok) return [];
    const data: any = await res.json();
    return [{ title: `Wikipedia: ${data.title}`, url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encoded}`, snippet: (data.extract ?? "").slice(0, 600), type: "wiki" }];
  } catch { return []; }
}

async function fetchCrossRef(query: string) {
  try {
    const res = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=6&sort=is-referenced-by-count&order=desc&select=title,abstract,published,author,URL,is-referenced-by-count`,
      { headers: { "User-Agent": "ProjectAtlas/1.0 (mailto:atlas@example.com)" } },
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.message?.items ?? []).map((item: any) => ({
      title: item.title?.[0] ?? "Untitled", url: item.URL ?? "",
      snippet: (item.abstract ?? "").replace(/<[^>]+>/g, "").slice(0, 400),
      year: item.published?.["date-parts"]?.[0]?.[0] ?? null,
      authors: (item.author ?? []).slice(0, 3).map((a: any) => `${a.given ?? ""} ${a.family ?? ""}`.trim()),
      citations: item["is-referenced-by-count"], type: "paper",
    }));
  } catch { return []; }
}

researchRouter.post("/:id/research", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { topics: { where: { status: "approved" }, take: 1 } },
    });
    if (!project) throw new ApiError(404, "Project not found");
    if (!project.selectedTopicId) throw new ApiError(400, "No topic selected.");
    const topic = project.topics[0];
    if (!topic) throw new ApiError(400, "Approved topic not found.");

    await prisma.project.update({ where: { id: project.id }, data: { status: "researching" } });
    console.log(`[research] Deep research: "${topic.title}"`);

    const [openAlex, semScholar, wikipedia, crossRef] = await Promise.all([
      fetchOpenAlex(topic.title), fetchSemanticScholar(topic.title),
      fetchWikipedia(topic.title), fetchCrossRef(topic.title),
    ]);

    const allSources = [...wikipedia, ...openAlex, ...semScholar, ...crossRef];
    console.log(`[research] ${allSources.length} sources collected`);

    const sourceText = allSources.map((s: any, i: number) => {
      const meta = [s.year && `Year: ${s.year}`, s.authors?.length && `Authors: ${s.authors.join(", ")}`, s.citations != null && `Citations: ${s.citations}`, `Type: ${s.type}`].filter(Boolean).join(" | ");
      return `[SOURCE ${i + 1}] ${s.title}\n${meta}\nURL: ${s.url}\n${s.snippet}`;
    }).join("\n\n---\n\n");

    const llm = createLLMProvider();
    const response = await llm.chat([
      {
        role: "system",
        content: `You are the world's most rigorous research synthesizer for educational video production.
You have deep expertise across science, history, psychology, technology, and society.
You surface counterintuitive findings, identify scientific debates, and find the human angle.
Distinguish ESTABLISHED consensus from EMERGING or CONTESTED findings.
Return ONLY valid JSON. No markdown. No preamble.`,
      },
      {
        role: "user",
        content: `Topic: "${topic.title}"
Hook: "${topic.summary}"

${allSources.length} sources collected from Wikipedia, OpenAlex, Semantic Scholar, CrossRef:

${sourceText}

Synthesize into a research brief for a 10-15 minute educational video.

Return this JSON:
{
  "summary": "3-4 paragraph overview — the full story we can tell",
  "background": "Historical context — how did we arrive here?",
  "currentDevelopments": "Latest research, debates, news right now",
  "keyFacts": [{ "fact": "specific surprising fact with stat if possible", "source": "source name", "confidence": "high|medium|low" }],
  "counterintuitiveAngles": ["truth that contradicts common belief"],
  "controversies": "Scientific debates or contested claims",
  "stakes": "Real-world consequences and why this matters",
  "storyAngles": [{ "angle": "narrative approach", "hook": "opening sentence", "strength": "why this works" }],
  "sources": [{ "title": "...", "url": "...", "type": "paper|wiki|web", "year": 2023, "credibility": "high|medium|low", "keyContribution": "what this uniquely adds" }],
  "confidenceScore": 0.85
}`,
      },
    ]);

    let brief: any = { summary: "" };
    try {
      const match = response.content.match(/\{[\s\S]*\}/);
      if (match) brief = JSON.parse(match[0]);
    } catch { brief.summary = response.content.slice(0, 2000); }

    const saved = await prisma.researchBrief.create({
      data: {
        projectId: project.id, topicId: topic.id,
        summary: brief.summary ?? "",
        background: brief.background ?? null,
        currentDevelopments: brief.currentDevelopments ?? null,
        surprisingFacts: (brief.keyFacts ?? []).map((f: any) => f.fact),
        controversies: brief.controversies ?? null,
        stakes: brief.stakes ?? null,
        storyAngles: (brief.storyAngles ?? []).map((a: any) => a.angle),
        keyFacts: (brief.keyFacts ?? []).map((f: any) => f.fact),
        claims: brief.keyFacts ?? [],
        sources: brief.sources ?? [],
        confidenceScore: brief.confidenceScore ?? 0.8,
      },
    });

    await prisma.project.update({ where: { id: project.id }, data: { status: "research_done" } });
    console.log(`[research] Done — ${(brief.sources ?? []).length} sources`);

    res.json({ ...saved, keyFacts: brief.keyFacts, storyAngles: brief.storyAngles, counterintuitiveAngles: brief.counterintuitiveAngles, rawSources: brief.sources });
  } catch (err) {
    await prisma.project.update({ where: { id: req.params.id }, data: { status: "research_failed" } }).catch(() => {});
    next(err);
  }
});

researchRouter.get("/:id/research", async (req, res, next) => {
  try {
    const brief = await prisma.researchBrief.findFirst({ where: { projectId: req.params.id }, orderBy: { createdAt: "desc" } });
    res.json(brief ?? null);
  } catch (err) { next(err); }
});

researchRouter.delete("/:projectId/research/:briefId", async (req, res, next) => {
  try {
    const { projectId, briefId } = req.params;
    await prisma.researchBrief.delete({ where: { id: briefId } });

    const remaining = await prisma.researchBrief.count({ where: { projectId } });
    if (remaining === 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "topic_selected" },
      });
    }

    res.status(204).send();
  } catch (err) { next(err); }
});
