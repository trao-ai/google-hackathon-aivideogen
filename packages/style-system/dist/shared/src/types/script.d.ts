export type ScriptStatus = "draft" | "approved" | "rejected";
export type SectionType = "hook" | "promise" | "context" | "escalation" | "explanation" | "consequences" | "reveal" | "takeaway" | "cta";
export interface ScriptSection {
    id: string;
    scriptId: string;
    orderIndex: number;
    sectionType: SectionType;
    text: string;
    estimatedDurationSec: number;
    sourceRefs: string[];
}
export interface ScriptQualityScore {
    hookStrength: number;
    clarity: number;
    novelty: number;
    escalation: number;
    factSupport: number;
    visualizability: number;
    ctaQuality: number;
    overall: number;
}
export interface Script {
    id: string;
    projectId: string;
    titleCandidates: string[];
    thumbnailAngles: string[];
    outline: string;
    fullText: string;
    sections: ScriptSection[];
    estimatedDurationSec: number;
    qualityScore: ScriptQualityScore;
    status: ScriptStatus;
    createdAt: string;
}
//# sourceMappingURL=script.d.ts.map