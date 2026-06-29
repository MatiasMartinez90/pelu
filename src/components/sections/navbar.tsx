"use client";

import { useEffect, useState } from "react";
import { Menu, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/#barberos", label: "Barberos" },
  { href: "/galeria", label: "Galería" },
  { href: "/#tienda", label: "Tienda" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent"
      )}
    >
      <nav className="container-px mx-auto flex h-16 max-w-6xl items-center justify-between">
        <a href="#inicio" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="size-5" />
          </span>
          <span className="font-heading text-xl font-bold tracking-wide">
            {site.shortName}
            <span className="text-primary">.</span>
          </span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <a href="/agendar">Agendar turno</a>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="px-4 pt-4 font-heading text-lg">
                {site.name}
              </SheetTitle>
              <ul className="mt-4 flex flex-col gap-1 px-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <SheetClose asChild>
                      <a
                        href={l.href}
                        className="block rounded-md px-4 py-3 text-base font-medium hover:bg-secondary"
                      >
                        {l.label}
                      </a>
                    </SheetClose>
                  </li>
                ))}
              </ul>
              <div className="mt-4 px-4">
                <SheetClose asChild>
                  <Button asChild className="w-full">
                    <a href="/agendar">Agendar turno</a>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
