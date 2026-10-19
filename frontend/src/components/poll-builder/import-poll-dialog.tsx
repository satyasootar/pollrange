import { ImportJsonDialog } from "@/components/builder/import-json-dialog";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { POLL_IMPORT_PROMPT, parsePollImport } from "@/lib/poll-import";

/** Replace the poll builder's content with imported JSON, then show its settings first. */
export function ImportPollDialog({ onImported }: { onImported: () => void }) {
  return (
    <ImportJsonDialog
      entity="poll"
      prompt={POLL_IMPORT_PROMPT}
      placeholder={'{\n  "title": "My poll",\n  "questions": [ ... ]\n}'}
      onImport={(json) => {
        const st = usePollBuilderStore.getState();
        st.setForm(parsePollImport(json, st.form));
        st.setStep(1);
        onImported();
      }}
    />
  );
}
