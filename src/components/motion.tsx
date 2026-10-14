import { useEffect, useRef, useState, type ReactNode } from "react";

// Animate only presentation: records and form state stay in the workspace layer.
export function MotionPage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const selector =
      ".hero,.page-heading,.creative-route,.section-title,.task-card,.mini-inspiration,.shoot-note,.ai-box,.inspiration-card,.topic-card,.garment-card,.outfit-card,.shoot-card,.metric-card,.ranking,.outfit-intro";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.reveal = "visible";
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.04 },
    );
    const observe = () => {
      root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (element.dataset.reveal) return;
        element.dataset.reveal = "waiting";
        const index = Array.from(element.parentElement?.children || []).indexOf(
          element,
        );
        element.style.setProperty(
          "--reveal-delay",
          `${Math.min(index, 4) * 45}ms`,
        );
        observer.observe(element);
      });
    };
    observe();
    const additions = new MutationObserver(observe);
    additions.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      additions.disconnect();
      // StrictMode replays effects; the next observer must own fresh markers.
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
        delete element.dataset.reveal;
        element.style.removeProperty("--reveal-delay");
      });
    };
  }, []);
  return (
    <div ref={ref} className="motion-page">
      {children}
    </div>
  );
}

export function AnimatedNumber({
  value,
  format = String,
}: {
  value: number;
  format?: (number: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const current = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const from = current.current;
    let start: number | undefined;
    let frame: number;
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min((time - start) / 650, 1);
      const next = Math.round(
        from + (value - from) * (1 - (1 - progress) ** 3),
      );
      current.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span className="animated-number" aria-label={format(value)}>
      <span aria-hidden="true">{format(display)}</span>
    </span>
  );
}
