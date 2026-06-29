"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPwa() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || !deferred) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur sm:left-auto sm:right-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Download className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Instalá la app de {site.name}</p>
        <p className="text-xs text-muted-foreground">
          Acceso directo desde tu pantalla de inicio.
        </p>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
          setHidden(true);
        }}
      >
        Instalar
      </Button>
      <button
        aria-label="Cerrar"
        onClick={() => setHidden(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
