import {
  AlignLeft,
  Type,
  CircleDot,
  CheckSquare,
  ChevronDownSquare,
  SlidersHorizontal,
  Star,
  Calendar,
  Clock,
  Grid3x3,
  LayoutGrid,
  Upload,
} from "lucide-react";
import type { FormQuestionType } from "@/types";

export interface QuestionTypeMeta {
  type: FormQuestionType;
  label: string;
  icon: React.ElementType;
}

export const QUESTION_TYPE_META: QuestionTypeMeta[] = [
  { type: "short_answer", label: "Short answer", icon: Type },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft },
  { type: "multiple_choice", label: "Single choice", icon: CircleDot },
  { type: "checkboxes", label: "Multiple choice (checkboxes)", icon: CheckSquare },
  { type: "dropdown", label: "Dropdown", icon: ChevronDownSquare },
  { type: "linear_scale", label: "Linear scale", icon: SlidersHorizontal },
  { type: "rating", label: "Rating", icon: Star },
  { type: "date", label: "Date", icon: Calendar },
  { type: "time", label: "Time", icon: Clock },
  { type: "multiple_choice_grid", label: "Single choice grid", icon: Grid3x3 },
  { type: "checkbox_grid", label: "Multiple choice grid (checkboxes)", icon: LayoutGrid },
  { type: "file_upload", label: "File upload", icon: Upload },
];

export const QUESTION_TYPE_LABEL: Record<FormQuestionType, string> = Object.fromEntries(
  QUESTION_TYPE_META.map((m) => [m.type, m.label])
) as Record<FormQuestionType, string>;

export const CHOICE_TYPES: FormQuestionType[] = ["multiple_choice", "checkboxes", "dropdown"];
export const GRID_TYPES: FormQuestionType[] = ["multiple_choice_grid", "checkbox_grid"];
export const GRADABLE_TYPES: FormQuestionType[] = [
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "short_answer",
];
