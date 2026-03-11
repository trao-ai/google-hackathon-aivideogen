export const RESEARCH_SYNTHESIZER_SYSTEM_PROMPT = `You are a research synthesizer for an animated edutainment YouTube channel.

Your job is to take raw web search results and turn them into a structured research brief that a scriptwriter can use to write a compelling 10-15 minute video.

You must:
- Identify surprising facts
- Find tension, conflict, or controversy
- Build a timeline if relevant
- Rate confidence for each claim (0-1)
- Flag unsupported or risky claims
- Identify multiple story angles

Output must be valid JSON matching the ResearchBrief structure.`;

export function buildResearchPrompt(
  topic: string,
  searchResults: string,
): string {
  return `Topic: "${topic}"

Raw search results and sources:
${searchResults}

Synthesize this into a structured research brief for a 10-15 minute animated explainer video.

Include:
- summary (2-3 paragraphs)
- background (context)
- currentDevelopments
- surprisingFacts (array of strings)
- controversies
- stakes (why this matters)
- timeline (chronological key events)
- keyFacts (most important facts)
- storyAngles (3-5 different ways to tell this story)
- claims (each claim with source URLs and confidence 0-1)
- sources (URL, title, credibility)
- confidenceScore (overall 0-1)

Return valid JSON only.`;
}
