import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { BuilderChatPanel } from "./builder-chat-panel";
import type { AiAction } from "@/types";

/**
 * Floating AI assistant for the builders: closed by default, opened by a bottom-right
 * button, slides in as a right-side drawer overlaying the builder. Render inside a
 * `relative` container (the drawer/button are absolutely positioned within it).
 */
export function BuilderChatDock(props: {
  surface: "poll-builder" | "form-builder";
  getBuilderState: () => { title?: string; questions?: string[] };
  onActions: (actions: AiAction[]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2 border border-border bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <Sparkles className="h-4 w-4" /> AI Assistant
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l border-border bg-background shadow-xl sm:max-w-md"
          >
            <BuilderChatPanel {...props} onClose={() => setOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
