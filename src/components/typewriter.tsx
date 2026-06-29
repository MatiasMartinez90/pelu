"use client";

import { useEffect, useState } from "react";

export function Typewriter({
  words,
  className,
}: {
  words: string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[index % words.length];
    const done = text === current;
    const empty = text === "";

    let delay = deleting ? 45 : 90;
    if (done && !deleting) delay = 1600;
    if (empty && deleting) delay = 300;

    const t = setTimeout(() => {
      if (!deleting && done) {
        setDeleting(true);
      } else if (deleting && empty) {
        setDeleting(false);
        setIndex((i) => i + 1);
      } else {
        setText((prev) =>
          deleting
            ? current.slice(0, prev.length - 1)
            : current.slice(0, prev.length + 1)
        );
      }
    }, delay);

    return () => clearTimeout(t);
  }, [text, deleting, index, words]);

  return (
    <span className={className}>
      {text}
      <span className="ml-0.5 inline-block w-px animate-pulse bg-primary align-middle">
        &nbsp;
      </span>
    </span>
  );
}
