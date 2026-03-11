"use strict";
/**
 * YouTube Data API adapter.
 * Set USE_MOCK_YOUTUBE=true for local dev.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createYouTubeProvider = createYouTubeProvider;
// ─── Real YouTube Data API v3 ─────────────────────────────────────────────────
class YouTubeDataProvider {
    constructor() {
        this.baseUrl = "https://www.googleapis.com/youtube/v3";
        this.apiKey = process.env.YOUTUBE_API_KEY ?? "";
        if (!this.apiKey)
            throw new Error("YOUTUBE_API_KEY is not set");
    }
    async getChannelVideos(channelId, maxResults = 50) {
        // Fetch uploads playlist
        const channelRes = await fetch(`${this.baseUrl}/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${this.apiKey}`);
        if (!channelRes.ok)
            throw new Error(`YouTube API error: ${channelRes.status}`);
        const channelData = (await channelRes.json());
        const uploadsId = channelData.items[0]?.contentDetails.relatedPlaylists.uploads;
        if (!uploadsId)
            return [];
        // Fetch playlist items
        const playlistRes = await fetch(`${this.baseUrl}/playlistItems?part=contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&key=${this.apiKey}`);
        if (!playlistRes.ok)
            throw new Error(`YouTube playlist error: ${playlistRes.status}`);
        const playlistData = (await playlistRes.json());
        const videoIds = playlistData.items.map((i) => i.contentDetails.videoId);
        if (videoIds.length === 0)
            return [];
        // Fetch video statistics
        const statsRes = await fetch(`${this.baseUrl}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}&key=${this.apiKey}`);
        if (!statsRes.ok)
            throw new Error(`YouTube stats error: ${statsRes.status}`);
        const statsData = (await statsRes.json());
        return statsData.items.map((item) => ({
            videoId: item.id,
            title: item.snippet.title,
            viewCount: parseInt(item.statistics.viewCount, 10) || 0,
            likeCount: item.statistics.likeCount
                ? parseInt(item.statistics.likeCount, 10)
                : undefined,
            durationSec: parseDuration(item.contentDetails.duration),
            publishedAt: item.snippet.publishedAt,
            thumbnailUrl: item.snippet.thumbnails.high?.url,
            description: item.snippet.description,
        }));
    }
    async getVideoDetails(videoId) {
        const res = await fetch(`${this.baseUrl}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${this.apiKey}`);
        if (!res.ok)
            return null;
        const data = (await res.json());
        if (!data.items[0])
            return null;
        const item = data.items[0];
        return {
            videoId: item.id,
            title: item.snippet.title,
            viewCount: parseInt(item.statistics.viewCount, 10) || 0,
            likeCount: item.statistics.likeCount
                ? parseInt(item.statistics.likeCount, 10)
                : undefined,
            durationSec: parseDuration(item.contentDetails.duration),
            publishedAt: item.snippet.publishedAt,
            thumbnailUrl: item.snippet.thumbnails.high?.url,
            description: item.snippet.description,
        };
    }
}
function parseDuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match)
        return 0;
    return (parseInt(match[1] ?? "0", 10) * 3600 +
        parseInt(match[2] ?? "0", 10) * 60 +
        parseInt(match[3] ?? "0", 10));
}
// ─── Mock provider ───────────────────────────────────────────────────────────
class MockYouTubeProvider {
    async getChannelVideos(channelId, maxResults = 10) {
        return Array.from({ length: Math.min(maxResults, 5) }, (_, i) => ({
            videoId: `mock-video-${channelId}-${i}`,
            title: `Mock Video ${i + 1}: Why ${["science", "history", "space"][i % 3]} is fascinating`,
            viewCount: Math.floor(Math.random() * 5000000) + 100000,
            durationSec: 600 + i * 60,
            publishedAt: new Date(Date.now() - i * 7 * 24 * 3600 * 1000).toISOString(),
        }));
    }
    async getVideoDetails(videoId) {
        return {
            videoId,
            title: `Mock Video: ${videoId}`,
            viewCount: 1000000,
            durationSec: 720,
            publishedAt: new Date().toISOString(),
        };
    }
}
function createYouTubeProvider() {
    if (process.env.USE_MOCK_YOUTUBE === "true")
        return new MockYouTubeProvider();
    return new YouTubeDataProvider();
}
//# sourceMappingURL=youtube-provider.js.map