import { cn } from "@/lib/utils";

interface OptionQuestionProps<T extends string> {
  title: string;
  subtitle?: string;
  options: { value: T; label: string; blurb?: string }[];
  selected?: T;
  onSelect: (value: T) => void;
  columns?: 1 | 2 | 3;
}

export function OptionQuestion<T extends string>({
  title,
  subtitle,
  options,
  selected,
  onSelect,
  columns = 1,
}: OptionQuestionProps<T>) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          columns === 2 && "sm:grid-cols-2",
          columns === 3 && "sm:grid-cols-3"
        )}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              "border-2 p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5",
              selected === opt.value ? "border-primary bg-primary/10" : "border-border"
            )}
          >
            <p className="text-sm font-medium">{opt.label}</p>
            {opt.blurb && <p className="mt-1 text-xs text-muted-foreground">{opt.blurb}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}
