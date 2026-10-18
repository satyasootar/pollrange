import { useRef, useState } from "react";
import { FileJson, Copy, Upload, Wand2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { FORM_IMPORT_PROMPT, formatFormJson, parseFormImport } from "@/lib/form-import";
import { cn } from "@/lib/utils";

/** Pretty-printed when it parses; otherwise left as-is so the user can fix it. */
const tryFormat = (text: string) => {
  try {
    return formatFormJson(text);
  } catch {
    return text;
  }
};

/** Replace the builder's form with one pasted/uploaded as JSON (typically AI-generated from FORM_IMPORT_PROMPT). */
export function ImportFormDialog() {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = json ? json.split("\n").length : 1;

  const update = (text: string) => {
    setJson(text);
    setError("");
  };

  const handleFormat = () => {
    try {
      update(formatFormJson(json));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(FORM_IMPORT_PROMPT);
      toast.success("Prompt copied. Paste it into any AI chat and add what your form is about.");
    } catch {
      toast.error("Couldn't copy. Select the prompt text and copy it manually.");
    }
  };

  const handleImport = () => {
    const st = useFormBuilderStore.getState();
    try {
      st.setForm(parseFormImport(json, st.form));
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    st.setStep(2);
    setOpen(false);
    setJson("");
    setError("");
    toast.success("Form imported. Review the questions, then continue.");
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileJson className="h-4 w-4" /> Import JSON
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import form from JSON</DialogTitle>
            <DialogDescription>
              Copy the AI prompt, paste it into ChatGPT, Claude or Gemini with a description of your form, then paste the JSON
              it returns below. Importing replaces everything currently in the builder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">1. AI prompt (describes the accepted format)</p>
              <Button variant="outline" size="sm" onClick={copyPrompt}>
                <Copy className="h-4 w-4" /> Copy prompt
              </Button>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show prompt</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap border border-border bg-background p-2 font-mono text-[11px]">
                {FORM_IMPORT_PROMPT}
              </pre>
            </details>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="import-json" className="text-sm font-medium">
                2. Paste JSON
              </label>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={handleFormat} disabled={!json.trim()}>
                  <Wand2 className="h-3.5 w-3.5" /> Format
                </Button>
                <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <Upload className="h-3.5 w-3.5" /> Upload .json
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) update(tryFormat(await file.text()));
                      e.target.value = "";
                    }}
                  />
                </label>
                {json && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={() => update("")}>
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Code-editor style field: fixed height, line numbers (errors cite them), no soft wrap. */}
            <div
              className={cn(
                "flex h-72 overflow-hidden border bg-muted/30 font-mono text-xs leading-5 transition-shadow focus-within:ring-3",
                error ? "border-destructive focus-within:ring-destructive/20" : "border-border focus-within:border-ring focus-within:ring-ring/30"
              )}
            >
              <div
                ref={gutterRef}
                aria-hidden
                className="shrink-0 select-none overflow-hidden whitespace-pre border-r border-border bg-muted/60 px-2.5 py-3 text-right tabular-nums text-muted-foreground/60"
              >
                {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
              </div>
              <textarea
                id="import-json"
                value={json}
                onChange={(e) => update(e.target.value)}
                onPaste={(e) => {
                  // Replacing the whole field: pretty-print minified AI output instead of one giant line.
                  const el = e.currentTarget;
                  if (el.selectionStart !== 0 || el.selectionEnd !== json.length) return;
                  const pasted = e.clipboardData.getData("text");
                  const pretty = tryFormat(pasted);
                  if (pretty === pasted) return;
                  e.preventDefault();
                  update(pretty);
                }}
                onScroll={(e) => {
                  if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                }}
                wrap="off"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                placeholder={'{\n  "title": "My form",\n  "questions": [ ... ]\n}'}
                aria-invalid={!!error}
                aria-describedby={error ? "import-json-error" : undefined}
                className="min-w-0 flex-1 resize-none overflow-auto whitespace-pre bg-transparent px-3 py-3 outline-none [tab-size:2] placeholder:text-muted-foreground/70"
              />
            </div>

            {error ? (
              <div
                id="import-json-error"
                role="alert"
                className="flex max-h-40 gap-2 overflow-auto border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="min-w-0 whitespace-pre-wrap break-words">{error}</p>
              </div>
            ) : (
              <p className="flex justify-between gap-2 text-xs text-muted-foreground">
                <span>Pasted JSON is formatted automatically.</span>
                {json && (
                  <span className="tabular-nums">
                    {lineCount} line{lineCount !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!json.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
