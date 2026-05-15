import { useMemo } from "react";
import { motion } from "framer-motion";
import type { WordCloudItem } from "@/types";

export function WordCloudWidget({ words }: { words: WordCloudItem[] }) {
  const sanitizedWords = useMemo(() => {
    const validWords = (words || [])
      .filter((w) => w && typeof w.text === "string" && w.text.trim().length > 0)
      .map((w) => ({
        text: w.text,
        value: Number(w.value) || 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 40); // Keep top 40 words for performance and layout

    if (validWords.length === 0) return [];

    const max = validWords[0].value;
    const min = validWords[validWords.length - 1].value;

    return validWords.map((w) => {
      // Calculate relative size (0 to 1)
      const weight = max === min ? 0.5 : (w.value - min) / (max - min);
      return {
        ...w,
        fontSize: 0.75 + weight * 1.5, // 0.75rem to 2.25rem
        opacity: 0.4 + weight * 0.6, // 0.4 to 1.0
      };
    });
  }, [words]);

  if (sanitizedWords.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 min-h-[140px] p-2">
      {sanitizedWords.map((word, i) => (
        <motion.span
          key={word.text}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: word.opacity, scale: 1 }}
          transition={{ delay: i * 0.01 }}
          className="inline-block cursor-default transition-colors hover:text-primary"
          style={{
            fontSize: `${word.fontSize}rem`,
            fontWeight: word.fontSize > 1.5 ? "700" : "500",
            color: word.fontSize > 1.8 ? "var(--primary)" : "inherit",
          }}
          title={`${word.value} occurrences`}
        >
          {word.text}
        </motion.span>
      ))}
    </div>
  );
}
