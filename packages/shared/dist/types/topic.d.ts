export type TopicStatus = "candidate" | "approved" | "rejected";
export interface Topic {
    id: string;
    projectId: string;
    title: string;
    summary: string;
    opportunityScore: number;
    visualStorytellingScore: number;
    evergreenScore: number;
    trendScore: number;
    curiosityGapScore: number;
    factDensityScore: number;
    thumbnailAngle?: string;
    likelyAudienceAppeal?: string;
    status: TopicStatus;
    createdAt: string;
}
export interface ChannelProfile {
    id: string;
    channelName: string;
    channelUrl: string;
    topTopics: string[];
    titlePatterns: string[];
    runtimeRangeMinutes: [number, number];
    visualTraits: string[];
    publishCadence?: string;
    createdAt: string;
}
//# sourceMappingURL=topic.d.ts.map