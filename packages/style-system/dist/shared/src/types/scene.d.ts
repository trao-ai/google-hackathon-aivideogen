export type SceneType = "character_explanation" | "map_scene" | "infographic" | "comparison" | "metaphor" | "timeline" | "reaction" | "dramatic_reveal" | "cta";
export interface Scene {
    id: string;
    projectId: string;
    scriptSectionId?: string;
    orderIndex: number;
    narrationStartSec: number;
    narrationEndSec: number;
    purpose: string;
    sceneType: SceneType;
    startPrompt: string;
    endPrompt: string;
    motionNotes: string;
    bubbleText?: string;
    continuityNotes?: string;
    consistencyScore?: number;
    estimatedCostUsd?: number;
}
export interface SceneFrame {
    id: string;
    sceneId: string;
    frameType: "start" | "end";
    imageUrl: string;
    prompt: string;
    seed?: string;
    qualityScore?: number;
    styleMatchScore?: number;
    costUsd: number;
    createdAt: string;
}
export interface SceneClip {
    id: string;
    sceneId: string;
    videoUrl: string;
    durationSec: number;
    costUsd: number;
    createdAt: string;
}
export interface Render {
    id: string;
    projectId: string;
    videoUrl: string;
    subtitleUrl?: string;
    durationSec: number;
    costUsd: number;
    status: "pending" | "processing" | "complete" | "failed";
    createdAt: string;
}
//# sourceMappingURL=scene.d.ts.map