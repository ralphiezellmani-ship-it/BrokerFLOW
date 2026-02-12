"use client";

import { cn } from "@/lib/utils";
import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_ORDER,
  type TransactionStatus,
} from "@/types/transaction";
import { Check } from "lucide-react";

interface TransactionStatusStepperProps {
  currentStatus: TransactionStatus;
}

export function TransactionStatusStepper({
  currentStatus,
}: TransactionStatusStepperProps) {
  const currentIndex = TRANSACTION_STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1">
      {TRANSACTION_STATUS_ORDER.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={status} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-medium",
                  isCompleted &&
                    "border-green-500 bg-green-500 text-white",
                  isCurrent &&
                    "border-primary bg-primary text-primary-foreground",
                  !isCompleted &&
                    !isCurrent &&
                    "border-muted-foreground/30 text-muted-foreground/50",
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "mt-1 max-w-[70px] text-center text-[10px] leading-tight",
                  isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {TRANSACTION_STATUS_LABELS[status]}
              </span>
            </div>
            {index < TRANSACTION_STATUS_ORDER.length - 1 && (
              <div
                className={cn(
                  "mb-4 h-0.5 w-4 sm:w-6",
                  index < currentIndex ? "bg-green-500" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
