export type HeaderProps = {
  totalSpend?: number;
  showSpend?: boolean;
  userInitials?: string;
};

export type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  position?: "first" | "middle" | "last";
};

export type PipelineStep =
  | "topic"
  | "cost"
  | "research"
  | "script"
  | "voice"
  | "scenes"
  | "export";

export type StepStatus = "completed" | "active" | "pending";

export type PipelineProgressProps = {
  currentStep: PipelineStep;
  completedSteps: number;
  totalSteps: number;
};

export type ProjectCardProps = {
  id: string;
  title: string;
  category: string;
  status: "in_progress" | "completed" | "draft" | "failed";
  thumbnailUrl?: string;
  cost: number;
  date: string;
  currentStep: PipelineStep;
  completedSteps: number;
};

export type ContentCategory =
  | "Education"
  | "Technology"
  | "Finance"
  | "Motivation"
  | "Entertainment";

export type TargetPlatform = "youtube" | "instagram" | "tiktok" | "linkedin";

export type PlatformOption = {
  id: TargetPlatform;
  label: string;
  resolution: string;
  icon: React.ReactNode;
};

export type VideoType = "short" | "medium" | "long";

export type VideoTypeOption = {
  id: VideoType;
  label: string;
  duration: string;
  description: string;
  icon: React.ReactNode;
};

export type VideoStyle =
  | "Educational"
  | "Storytelling"
  | "Documentary"
  | "Explainer"
  | "Viral Social Media";

export type ToneKeyword =
  | "Professional"
  | "Casual"
  | "Energetic"
  | "Inspirational";

export type StepNavItem = {
  id: PipelineStep;
  label: string;
};

export type StepNavProps = {
  steps: StepNavItem[];
  activeStep: PipelineStep;
  currentStepIndex: number;
  totalSteps: number;
  onStepClick?: (step: PipelineStep) => void;
};

export type ScoreBarProps = {
  label: string;
  value: number;
  max?: number;
};

export type TopicCardProps = {
  id: string;
  title: string;
  category: string;
  summary: string;
  thumbnailAngle?: string;
  scores: ScoreBarProps[];
  isSelected?: boolean;
  onSelect: (id: string) => void;
  loading?: boolean;
};

export type CreateProjectFormData = {
  category: ContentCategory | null;
  platform: TargetPlatform | null;
  videoType: VideoType | null;
  videoStyle: VideoStyle | null;
  tone: ToneKeyword | null;
};
