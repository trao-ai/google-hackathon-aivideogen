export type HeaderProps = {
  totalSpend?: number;
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
