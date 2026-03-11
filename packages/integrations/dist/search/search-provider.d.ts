/**
 * Web search adapter.
 * Uses Brave Search API by default.
 * Set USE_MOCK_SEARCH=true for local dev.
 */
export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    publishedAt?: string;
}
export interface SearchProvider {
    search(query: string, count?: number): Promise<SearchResult[]>;
}
export declare function createSearchProvider(): SearchProvider;
//# sourceMappingURL=search-provider.d.ts.map