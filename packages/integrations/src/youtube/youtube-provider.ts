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
  getChannelVideos(
    channelId: string,
    maxResults?: number,
  ): Promise<ChannelVideo[]>;
  getVideoDetails(videoId: string): Promise<ChannelVideo | null>;
}

// ─── Real YouTube Data API v3 ─────────────────────────────────────────────────

class YouTubeDataProvider implements YoutubeProvider {
  private apiKey: string;
  private baseUrl = "https://www.googleapis.com/youtube/v3";

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY ?? "";
    if (!this.apiKey) throw new Error("YOUTUBE_API_KEY is not set");
  }

  async getChannelVideos(
    channelId: string,
    maxResults = 50,
  ): Promise<ChannelVideo[]> {
    // Fetch uploads playlist
    const channelRes = await fetch(
      `${this.baseUrl}/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${this.apiKey}`,
    );
    if (!channelRes.ok)
      throw new Error(`YouTube API error: ${channelRes.status}`);

    const channelData = (await channelRes.json()) as {
      items: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
    };
    const uploadsId =
      channelData.items[0]?.contentDetails.relatedPlaylists.uploads;
    if (!uploadsId) return [];

    // Fetch playlist items
    const playlistRes = await fetch(
      `${this.baseUrl}/playlistItems?part=contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&key=${this.apiKey}`,
    );
    if (!playlistRes.ok)
      throw new Error(`YouTube playlist error: ${playlistRes.status}`);

    const playlistData = (await playlistRes.json()) as {
      items: {
        contentDetails: { videoId: string; videoPublishedAt: string };
      }[];
    };

    const videoIds = playlistData.items.map((i) => i.contentDetails.videoId);
    if (videoIds.length === 0) return [];

    // Fetch video statistics
    const statsRes = await fetch(
      `${this.baseUrl}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}&key=${this.apiKey}`,
    );
    if (!statsRes.ok)
      throw new Error(`YouTube stats error: ${statsRes.status}`);

    const statsData = (await statsRes.json()) as {
      items: {
        id: string;
        snippet: {
          title: string;
          publishedAt: string;
          thumbnails: { high?: { url: string } };
          description: string;
        };
        statistics: { viewCount: string; likeCount?: string };
        contentDetails: { duration: string };
      }[];
    };

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

  async getVideoDetails(videoId: string): Promise<ChannelVideo | null> {
    const res = await fetch(
      `${this.baseUrl}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${this.apiKey}`,
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      items: {
        id: string;
        snippet: {
          title: string;
          publishedAt: string;
          thumbnails: { high?: { url: string } };
          description: string;
        };
        statistics: { viewCount: string; likeCount?: string };
        contentDetails: { duration: string };
      }[];
    };
    if (!data.items[0]) return null;

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

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    parseInt(match[1] ?? "0", 10) * 3600 +
    parseInt(match[2] ?? "0", 10) * 60 +
    parseInt(match[3] ?? "0", 10)
  );
}

// ─── Mock provider ───────────────────────────────────────────────────────────

class MockYouTubeProvider implements YoutubeProvider {
  async getChannelVideos(
    channelId: string,
    maxResults = 10,
  ): Promise<ChannelVideo[]> {
    return Array.from({ length: Math.min(maxResults, 5) }, (_, i) => ({
      videoId: `mock-video-${channelId}-${i}`,
      title: `Mock Video ${i + 1}: Why ${["science", "history", "space"][i % 3]} is fascinating`,
      viewCount: Math.floor(Math.random() * 5_000_000) + 100_000,
      durationSec: 600 + i * 60,
      publishedAt: new Date(
        Date.now() - i * 7 * 24 * 3600 * 1000,
      ).toISOString(),
    }));
  }

  async getVideoDetails(videoId: string): Promise<ChannelVideo | null> {
    return {
      videoId,
      title: `Mock Video: ${videoId}`,
      viewCount: 1_000_000,
      durationSec: 720,
      publishedAt: new Date().toISOString(),
    };
  }
}

export function createYouTubeProvider(): YoutubeProvider {
  if (process.env.USE_MOCK_YOUTUBE === "true") return new MockYouTubeProvider();
  return new YouTubeDataProvider();
}
