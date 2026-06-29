"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function Calendar({
  selected,
  onSelect,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
}) {
  const today = startOfDay(new Date());
  const [view, setView] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const canGoPrev =
    view.getFullYear() > today.getFullYear() ||
    (view.getFullYear() === today.getFullYear() &&
      view.getMonth() > today.getMonth());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <button
          aria-label="Mes anterior"
          disabled={!canGoPrev}
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="font-heading text-lg font-semibold">
          {MONTHS[month]} {year}
        </span>
        <button
          aria-label="Mes siguiente"
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {DOW.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={i} />;
          const isPast = date < today;
          const isSunday = date.getDay() === 0;
          const disabled = isPast || isSunday;
          const isSelected =
            selected && date.getTime() === startOfDay(selected).getTime();
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onSelect(date)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-sm transition-colors",
                disabled && "cursor-not-allowed text-muted-foreground/30",
                !disabled && "hover:bg-secondary",
                isSelected &&
                  "bg-primary font-semibold text-primary-foreground hover:bg-primary"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
