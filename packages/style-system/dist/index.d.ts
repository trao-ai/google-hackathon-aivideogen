import type { StyleBible } from "@atlas/shared";
export type { StyleBible };
/**
 * Converts a StyleBible record into a compact summary string
 * that can be injected into LLM prompts.
 */
export declare function styleBibleToPromptSummary(bible: StyleBible): string;
/**
 * Returns prompt primitives as a string prefix for image generation.
 */
export declare function getStylePrefix(bible: StyleBible): string;
export declare function getPaletteString(bible: StyleBible, mode?: "clean_light" | "dramatic_dark"): string;
//# sourceMappingURL=index.d.ts.map