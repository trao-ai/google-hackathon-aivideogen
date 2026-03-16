import { prisma } from "./index";
import type { Prisma } from "@prisma/client";
import type { CostStage } from "@atlas/shared";

export interface TrackCostParams {
  projectId: string;
  stage: CostStage;
  vendor: string;
  units: number;
  unitCost: number;
  totalCostUsd: number;
  metadata?: Record<string, unknown>;
}

export interface TrackLLMCostParams {
  projectId: string;
  stage: CostStage;
  vendor: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  metadata?: Record<string, unknown>;
}

export interface TrackTTSCostParams {
  projectId: string;
  vendor: string;
  model: string;
  characterCount: number;
  totalCostUsd: number;
  metadata?: Record<string, unknown>;
}

export interface TrackImageCostParams {
  projectId: string;
  vendor: string;
  model: string;
  imageCount: number;
  totalCostUsd: number;
  metadata?: Record<string, unknown>;
}

export interface TrackVideoCostParams {
  projectId: string;
  vendor: string;
  model: string;
  durationSec: number;
  totalCostUsd: number;
  metadata?: Record<string, unknown>;
}

export interface TrackSFXCostParams {
  projectId: string;
  vendor: string;
  model: string;
  generationCount: number;
  totalCostUsd: number;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a CostEvent and atomically increments Project.totalCostUsd.
 */
export async function trackCost(params: TrackCostParams) {
  return prisma.$transaction([
    prisma.costEvent.create({
      data: {
        projectId: params.projectId,
        stage: params.stage,
        vendor: params.vendor,
        units: params.units,
        unitCost: params.unitCost,
        totalCostUsd: params.totalCostUsd,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    }),
    prisma.project.update({
      where: { id: params.projectId },
      data: { totalCostUsd: { increment: params.totalCostUsd } },
    }),
  ]);
}

/**
 * Track an LLM call. units = total tokens, metadata includes token breakdown.
 */
export async function trackLLMCost(params: TrackLLMCostParams) {
  const totalTokens = params.inputTokens + params.outputTokens;
  return trackCost({
    projectId: params.projectId,
    stage: params.stage,
    vendor: params.vendor,
    units: totalTokens,
    unitCost: totalTokens > 0 ? params.totalCostUsd / totalTokens : 0,
    totalCostUsd: params.totalCostUsd,
    metadata: {
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      ...params.metadata,
    },
  });
}

/**
 * Track a TTS call. units = character count, metadata includes model.
 */
export async function trackTTSCost(params: TrackTTSCostParams) {
  return trackCost({
    projectId: params.projectId,
    stage: "tts",
    vendor: params.vendor,
    units: params.characterCount,
    unitCost:
      params.characterCount > 0
        ? params.totalCostUsd / params.characterCount
        : 0,
    totalCostUsd: params.totalCostUsd,
    metadata: {
      model: params.model,
      characterCount: params.characterCount,
      ...params.metadata,
    },
  });
}

/**
 * Track image generation. units = image count, metadata includes model.
 */
export async function trackImageCost(params: TrackImageCostParams) {
  return trackCost({
    projectId: params.projectId,
    stage: "image_generation",
    vendor: params.vendor,
    units: params.imageCount,
    unitCost:
      params.imageCount > 0 ? params.totalCostUsd / params.imageCount : 0,
    totalCostUsd: params.totalCostUsd,
    metadata: {
      model: params.model,
      imageCount: params.imageCount,
      ...params.metadata,
    },
  });
}

/**
 * Track video generation. units = duration in seconds, metadata includes model.
 */
export async function trackVideoCost(params: TrackVideoCostParams) {
  return trackCost({
    projectId: params.projectId,
    stage: "video_generation",
    vendor: params.vendor,
    units: params.durationSec,
    unitCost:
      params.durationSec > 0 ? params.totalCostUsd / params.durationSec : 0,
    totalCostUsd: params.totalCostUsd,
    metadata: {
      model: params.model,
      durationSec: params.durationSec,
      ...params.metadata,
    },
  });
}

/**
 * Track SFX generation. units = generation count, stage = "sfx".
 */
export async function trackSFXCost(params: TrackSFXCostParams) {
  return trackCost({
    projectId: params.projectId,
    stage: "sfx",
    vendor: params.vendor,
    units: params.generationCount,
    unitCost:
      params.generationCount > 0
        ? params.totalCostUsd / params.generationCount
        : 0,
    totalCostUsd: params.totalCostUsd,
    metadata: {
      model: params.model,
      generationCount: params.generationCount,
      ...params.metadata,
    },
  });
}
