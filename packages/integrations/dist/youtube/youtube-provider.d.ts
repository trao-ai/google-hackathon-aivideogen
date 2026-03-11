/**
 * YouTube Data API adapter.
 * Set USE_MOCK_YOUTUBE=true for local dev.
 */
export interface ChannelVideo {
    videoId: string;
    title: string;
    viewCount: number;
    likeCount?: number;
    durationSec?: number;
    publishedAt: string;
    thumbnailUrl?: string;
    description?: string;
}
export interface YoutubeProvider {
    getChannelVideos(channelId: string, maxResults?: number): Promise<ChannelVideo[]>;
    getVideoDetails(videoId: string): Promise<ChannelVideo | null>;
}
export declare function createYouTubeProvider(): YoutubeProvider;
//# sourceMappingURL=youtube-provider.d.ts.map