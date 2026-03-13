"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VIDEO_MODELS = [
  {
    value: "kling",
    label: "Kling",
    description: "2 frames \u00b7 5s clip \u00b7 $0.07/s",
  },
  {
    value: "veo",
    label: "Veo",
    description: "2 frames \u00b7 8s clip \u00b7 $0.35/s",
  },
  {
    value: "seedance",
    label: "SeDance",
    description: "1 frame \u00b7 5s clip \u00b7 $0.07/s",
  },
] as const;

interface Props {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VideoModelSelector({
  projectId,
  value,
  onChange,
  disabled,
}: Props) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (newValue: string) => {
    if (newValue === value) return;
    setSaving(true);
    try {
      await api.projects.update(projectId, { videoProvider: newValue });
      onChange(newValue);
    } catch (err) {
      console.error("Failed to update video provider:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Video Model:
      </span>
      <Select
        value={value}
        onValueChange={handleChange}
        disabled={disabled || saving}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VIDEO_MODELS.map((model) => (
            <SelectItem key={model.value} value={model.value}>
              <div className="flex flex-col">
                <span>{model.label}</span>
                <span className="text-xs text-muted-foreground">
                  {model.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
