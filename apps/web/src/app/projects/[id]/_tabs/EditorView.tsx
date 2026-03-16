// "use client";

// import React, { useMemo, useState, useCallback } from "react";
// import { ArrowRightIcon } from "@phosphor-icons/react";
// import type { ProjectDetail } from "@/types/api";
// import { useEditorPlayback } from "./editor/useEditorPlayback";
// import type { SceneClipInfo } from "./editor/useEditorPlayback";
// import { EditorVideoPreview } from "./editor/EditorVideoPreview";
// import type { ActiveTransition } from "./editor/EditorVideoPreview";
// import { PlaybackControls } from "./editor/PlaybackControls";
// import { TimelinePanel } from "./editor/TimelinePanel";
// import type { TimelineSegment, TransitionSegment, VoiceSegment, SfxSegment } from "./editor/TimelineTrack";
// import { resolveMediaUrl } from "./scene-flow/types";

// interface EditorViewProps {
//   project: ProjectDetail;
//   onBack: () => void;
// }

// interface EditableScene {
//   id: string;
//   label: string;
//   startSec: number;
//   endSec: number;
//   originalDuration: number;
//   clipUrl: string | null;
//   thumbnailUrl: string | null;
// }

// function formatTransitionLabel(type: string): string {
//   switch (type) {
//     case "fade": return "Fade In";
//     case "fadeout": return "Fade Out";
//     case "crossfade": return "Cross Dissolve";
//     case "wipeleft": return "Wipe Left";
//     case "wiperight": return "Wipe Right";
//     case "slideup": return "Slide Up";
//     case "slidedown": return "Slide Down";
//     default: return type.charAt(0).toUpperCase() + type.slice(1);
//   }
// }

// export function EditorView({ project, onBack }: EditorViewProps) {
//   const sortedScenes = useMemo(
//     () => [...(project.scenes ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
//     [project.scenes],
//   );

//   // ─── Mutable state for ALL segments ───

//   const [editableScenes, setEditableScenes] = useState<EditableScene[]>(() =>
//     sortedScenes.map((scene, i) => {
//       const startSec = scene.narrationStartSec ?? scene.startSec ?? 0;
//       const endSec = scene.narrationEndSec ?? scene.endSec ?? 0;
//       return {
//         id: scene.id,
//         label: `Scene ${i + 1}`,
//         startSec,
//         endSec,
//         originalDuration: endSec - startSec,
//         clipUrl: scene.clip?.videoUrl ?? null,
//         thumbnailUrl: scene.frames?.[0]?.imageUrl ?? null,
//       };
//     }),
//   );

//   const [editableTransitions, setEditableTransitions] = useState<TransitionSegment[]>(() => {
//     const result: TransitionSegment[] = [];
//     for (let i = 1; i < sortedScenes.length; i++) {
//       const scene = sortedScenes[i];
//       const prevScene = sortedScenes[i - 1];
//       const tp = scene.transitionPlan ?? prevScene.transitionPlan;
//       if (!tp) continue;
//       const boundaryTime = prevScene.narrationEndSec ?? prevScene.endSec ?? 0;
//       const halfDur = (tp.durationSec ?? 0.5) / 2;
//       result.push({
//         id: `transition-${scene.id}`,
//         label: formatTransitionLabel(tp.type ?? tp.ffmpegTransition ?? "fade"),
//         startSec: Math.max(0, boundaryTime - halfDur),
//         endSec: boundaryTime + halfDur,
//       });
//     }
//     return result;
//   });

//   const voiceoverDurationSec = project.voiceovers?.[0]?.durationSec ?? 0;

//   const [voiceSegment, setVoiceSegment] = useState<VoiceSegment | null>(() =>
//     voiceoverDurationSec > 0
//       ? { id: "voice-main", startSec: 0, endSec: voiceoverDurationSec }
//       : null,
//   );

//   const [sfxSegments, setSfxSegments] = useState<SfxSegment[]>(() =>
//     sortedScenes.map((scene, i) => {
//       const start = scene.narrationStartSec ?? scene.startSec ?? 0;
//       const end = scene.narrationEndSec ?? scene.endSec ?? 0;
//       const dur = end - start;
//       // Place SFX in the middle 60% of each scene
//       return {
//         id: `sfx-${scene.id}`,
//         startSec: start + dur * 0.2,
//         endSec: end - dur * 0.2,
//       };
//     }),
//   );

//   // ─── Computed values ───

//   const lastSceneEnd = editableScenes.length > 0
//     ? Math.max(...editableScenes.map((s) => s.endSec))
//     : 0;
//   const voiceEnd = voiceSegment?.endSec ?? 0;
//   const sfxEnd = sfxSegments.length > 0 ? Math.max(...sfxSegments.map((s) => s.endSec)) : 0;
//   const totalDuration = Math.max(lastSceneEnd, voiceEnd, sfxEnd, 10);

//   const audioUrl = project.voiceovers?.[0]?.audioUrl ?? null;

//   const sceneClips: SceneClipInfo[] = useMemo(
//     () => editableScenes.map((s) => ({
//       id: s.id, startSec: s.startSec, endSec: s.endSec,
//       clipUrl: s.clipUrl, thumbnailUrl: s.thumbnailUrl,
//     })),
//     [editableScenes],
//   );

//   const sceneSegments: TimelineSegment[] = useMemo(
//     () => editableScenes.map((s) => ({
//       id: s.id, label: s.label,
//       startSec: s.startSec, endSec: s.endSec,
//       thumbnailUrl: s.thumbnailUrl ?? undefined,
//     })),
//     [editableScenes],
//   );

//   // Playback
//   const playback = useEditorPlayback(totalDuration, sceneClips);

//   // Active transition for preview effects
//   const activeTransition: ActiveTransition | null = useMemo(() => {
//     const t = playback.currentTime;
//     for (const tr of editableTransitions) {
//       if (t >= tr.startSec && t <= tr.endSec) {
//         const duration = tr.endSec - tr.startSec;
//         return { type: tr.label, progress: duration > 0 ? (t - tr.startSec) / duration : 1 };
//       }
//     }
//     return null;
//   }, [playback.currentTime, editableTransitions]);

//   const audioSrc = audioUrl ? resolveMediaUrl(audioUrl) : undefined;

//   // ─── Unified segment handlers (work for ANY track) ───

//   const handleSegmentTrim = useCallback(
//     (id: string, newStart: number, newEnd: number) => {
//       // Try scenes first
//       setEditableScenes((prev) => {
//         const idx = prev.findIndex((s) => s.id === id);
//         if (idx === -1) return prev;
//         const s = prev[idx];
//         const newDur = newEnd - newStart;
//         const clampedDur = Math.min(newDur, s.originalDuration);
//         const finalDur = Math.max(clampedDur, 0.3);
//         if (newStart !== s.startSec) {
//           return prev.map((x, i) => i === idx ? { ...x, startSec: Math.max(0, x.endSec - finalDur) } : x);
//         }
//         return prev.map((x, i) => i === idx ? { ...x, endSec: x.startSec + finalDur } : x);
//       });
//       // Transitions
//       setEditableTransitions((prev) => prev.map((t) =>
//         t.id === id ? { ...t, startSec: Math.max(0, newStart), endSec: newEnd } : t,
//       ));
//       // Voice
//       setVoiceSegment((prev) =>
//         prev && prev.id === id ? { ...prev, startSec: Math.max(0, newStart), endSec: newEnd } : prev,
//       );
//       // SFX
//       setSfxSegments((prev) => prev.map((s) =>
//         s.id === id ? { ...s, startSec: Math.max(0, newStart), endSec: newEnd } : s,
//       ));
//     },
//     [],
//   );

//   const handleSegmentMove = useCallback(
//     (id: string, newStart: number) => {
//       // Scenes
//       setEditableScenes((prev) => prev.map((s) => {
//         if (s.id !== id) return s;
//         const dur = s.endSec - s.startSec;
//         return { ...s, startSec: newStart, endSec: newStart + dur };
//       }));
//       // Transitions
//       setEditableTransitions((prev) => prev.map((t) => {
//         if (t.id !== id) return t;
//         const dur = t.endSec - t.startSec;
//         return { ...t, startSec: newStart, endSec: newStart + dur };
//       }));
//       // Voice
//       setVoiceSegment((prev) => {
//         if (!prev || prev.id !== id) return prev;
//         const dur = prev.endSec - prev.startSec;
//         return { ...prev, startSec: newStart, endSec: newStart + dur };
//       });
//       // SFX
//       setSfxSegments((prev) => prev.map((s) => {
//         if (s.id !== id) return s;
//         const dur = s.endSec - s.startSec;
//         return { ...s, startSec: newStart, endSec: newStart + dur };
//       }));
//     },
//     [],
//   );

//   return (
//     <div className="flex flex-col gap-3 pb-8">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <span className="text-xl font-semibold text-foreground">Scene Generation</span>
//         <button
//           type="button"
//           onClick={onBack}
//           className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-brand-border-light bg-[#FAF9F5] text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
//         >
//           Back <ArrowRightIcon size={16} weight="bold" />
//         </button>
//       </div>

//       {/* Video Preview */}
//       <div className="bg-[#FAF9F5] rounded-md border border-brand-border-light p-4">
//         <EditorVideoPreview
//           scenes={sceneClips}
//           activeSceneIndex={playback.activeSceneIndex}
//           currentTime={playback.currentTime}
//           isPlaying={playback.isPlaying}
//           activeTransition={activeTransition}
//         />
//         <PlaybackControls
//           isPlaying={playback.isPlaying}
//           onRewind={playback.rewind}
//           onPrevFrame={playback.prevFrame}
//           onStop={playback.stop}
//           onPlayPause={playback.togglePlayPause}
//           onNextFrame={playback.nextFrame}
//           onFastForward={playback.fastForward}
//           onZoomIn={playback.zoomIn}
//           onZoomOut={playback.zoomOut}
//           zoomLevel={playback.zoomLevel}
//         />
//       </div>

//       {/* Timeline */}
//       <TimelinePanel
//         totalDuration={totalDuration}
//         currentTime={playback.currentTime}
//         zoomLevel={playback.zoomLevel}
//         isPlaying={playback.isPlaying}
//         scenes={sceneSegments}
//         transitions={editableTransitions}
//         voiceSegment={voiceSegment}
//         sfxSegments={sfxSegments}
//         onSeek={playback.seekTo}
//         onCancel={onBack}
//         onSave={() => onBack()}
//         onSegmentTrim={handleSegmentTrim}
//         onSegmentMove={handleSegmentMove}
//       />

//       {/* Hidden audio for voiceover */}
//       {audioSrc && (
//         <audio ref={playback.audioRef as React.RefObject<HTMLAudioElement>} src={audioSrc} preload="auto" className="hidden" />
//       )}
//     </div>
//   );
// }
