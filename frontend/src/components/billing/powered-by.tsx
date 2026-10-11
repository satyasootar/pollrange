/** Free-plan footer on public pages; hidden for creators whose plan includes branding. */
export function PoweredBy({ show }: { show?: boolean | undefined }) {
  if (!show) return null;
  return (
    <p className="mt-10 text-center text-xs text-muted-foreground">
      <a href="/?ref=badge" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
        <img src="/logo/logo1.png" alt="" className="h-3.5 w-auto" />
        Made with <span className="font-semibold">Kollects</span>
      </a>
    </p>
  );
}
