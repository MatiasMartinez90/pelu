import { User, Scissors, CalendarDays, CircleCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepId = 0 | 1 | 2 | 3;

const items = [
  { id: 0, label: "Barbero", icon: User },
  { id: 1, label: "Servicio", icon: Scissors },
  { id: 2, label: "Fecha y hora", icon: CalendarDays },
  { id: 3, label: "Confirmación", icon: CircleCheck },
] as const;

export function Stepper({ current }: { current: StepId }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-y-3">
      {items.map((it, i) => {
        const done = current > it.id;
        const active = current === it.id;
        const Icon = it.icon;
        return (
          <div key={it.id} className="flex items-center">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-md border transition-colors",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-primary bg-primary/15 text-primary",
                  !active &&
                    !done &&
                    "border-border bg-card text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {it.label}
              </span>
            </div>
            {i < items.length - 1 && (
              <span className="mx-3 hidden text-muted-foreground sm:inline">
                ›
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
