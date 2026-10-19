import { ImportJsonDialog } from "@/components/builder/import-json-dialog";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { FORM_IMPORT_PROMPT, parseFormImport } from "@/lib/form-import";

/** Replace the form builder's content with imported JSON, then show its settings first. */
export function ImportFormDialog() {
  return (
    <ImportJsonDialog
      entity="form"
      interview
      prompt={FORM_IMPORT_PROMPT}
      placeholder={'{\n  "title": "My form",\n  "questions": [ ... ]\n}'}
      onImport={(json) => {
        const st = useFormBuilderStore.getState();
        st.setForm(parseFormImport(json, st.form));
        st.setStep(1);
      }}
    />
  );
}
