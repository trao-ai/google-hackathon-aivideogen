export declare function buildStartFramePrompt(params: {
    purpose: string;
    narrationExcerpt: string;
    sceneType: string;
    visualMetaphor?: string;
    characterNotes?: string;
    bubbleText?: string;
    palette: string;
    negativePrompts: string[];
    stylePrimitives: string;
}): string;
export declare function buildEndFramePrompt(startFramePrompt: string, progressionNotes: string): string;
//# sourceMappingURL=frame-generator.d.ts.map