import ReactWordcloud from "react-wordcloud";
import type { WordCloudItem } from "@/types";

const options = {
  rotations: 2,
  rotationAngles: [-90, 0] as [number, number],
  fontSizes: [14, 56] as [number, number],
  fontFamily: "Plus Jakarta Sans, sans-serif",
  padding: 3,
  spiral: "archimedean" as const,
  scale: "sqrt" as const,
  transitionDuration: 500,
  enableOptimizations: true,
};

const callbacks = {
  getWordColor: (word: { value: number }) => {
    if (word.value > 20) return "#6366f1";
    if (word.value > 10) return "#818cf8";
    if (word.value > 5) return "#a5b4fc";
    return "#c7d2fe";
  },
  getWordTooltip: (word: { text: string; value: number }) =>
    `"${word.text}" — ${word.value} votes`,
};

interface WordCloudWidgetProps {
  words: WordCloudItem[];
}

export function WordCloudWidget({ words }: WordCloudWidgetProps) {
  if (!words.length) return null;

  return (
    <div className="border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold">Word Cloud — Response Trends</h3>
      <div className="h-64 w-full">
        <ReactWordcloud
          words={words}
          options={options}
          callbacks={callbacks}
        />
      </div>
    </div>
  );
}
