export type JobType = "channel_analysis" | "topic_discovery" | "research" | "script_generation" | "tts_generation" | "scene_planning" | "frame_generation" | "animation_generation" | "composition";
export interface JobPayload {
    projectId: string;
    jobType: JobType;
    data?: Record<string, unknown>;
}
export type JobStatus = "waiting" | "active" | "completed" | "failed" | "delayed";
export interface JobInfo {
    id: string;
    type: JobType;
    projectId: string;
    status: JobStatus;
    progress?: number;
    error?: string;
    createdAt: string;
}
//# sourceMappingURL=jobs.d.ts.map