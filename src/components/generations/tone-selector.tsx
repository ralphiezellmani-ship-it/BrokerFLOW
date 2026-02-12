"use client";

import { TONE_LABELS, type Tone } from "@/types/generation";
import { cn } from "@/lib/utils";

const TONES: Tone[] = ["professional", "casual", "luxury"];

const toneDescriptions: Record<Tone, string> = {
  professional: "Tydlig, saklig och trovärdig",
  casual: "Varm, personlig och inbjudande",
  luxury: "Exklusiv, elegant och premium",
};

interface ToneSelectorProps {
  value: Tone;
  onChange: (tone: Tone) => void;
  disabled?: boolean;
}

export function ToneSelector({ value, onChange, disabled }: ToneSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TONES.map((tone) => (
        <button
          key={tone}
          type="button"
          disabled={disabled}
          onClick={() => onChange(tone)}
          className={cn(
            "rounded-md border px-3 py-2 text-left text-sm transition-colors",
            value === tone
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <p className="font-medium">{TONE_LABELS[tone]}</p>
          <p className="text-xs text-muted-foreground">
            {toneDescriptions[tone]}
          </p>
        </button>
      ))}
    </div>
  );
}
