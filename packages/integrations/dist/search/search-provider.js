"use strict";
/**
 * Web search adapter.
 * Uses Brave Search API by default.
 * Set USE_MOCK_SEARCH=true for local dev.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSearchProvider = createSearchProvider;
// ─── Brave Search provider ───────────────────────────────────────────────────
class BraveSearchProvider {
    constructor() {
        this.apiKey = process.env.BRAVE_SEARCH_API_KEY ?? "";
        if (!this.apiKey)
            throw new Error("BRAVE_SEARCH_API_KEY is not set");
    }
    async search(query, count = 10) {
        const url = new URL("https://api.search.brave.com/res/v1/web/search");
        url.searchParams.set("q", query);
        url.searchParams.set("count", String(count));
        const res = await fetch(url.toString(), {
            headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": this.apiKey,
            },
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Brave Search error ${res.status}: ${err}`);
        }
        const data = (await res.json());
        return (data.web?.results ?? []).map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.description,
            publishedAt: r.age,
        }));
    }
}
// ─── Mock provider ───────────────────────────────────────────────────────────
class MockSearchProvider {
    async search(query, count = 5) {
        return Array.from({ length: count }, (_, i) => ({
            title: `Mock Result ${i + 1} for: ${query}`,
            url: `https://example.com/result-${i + 1}`,
            snippet: `This is a mock search result snippet for "${query}". In production this would contain real information from the web.`,
            publishedAt: new Date().toISOString(),
        }));
    }
}
function createSearchProvider() {
    if (process.env.USE_MOCK_SEARCH === "true")
        return new MockSearchProvider();
    return new BraveSearchProvider();
}
//# sourceMappingURL=search-provider.js.map