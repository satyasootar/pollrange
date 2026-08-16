import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";

export function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

/** Render a component that uses react-query, with a fresh isolated client. */
export function renderWithClient(ui: ReactElement) {
  const qc = makeQueryClient();
  return { qc, ...render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>) };
}

/** Render a page component that reads useParams, mounted at a matching route. */
export function renderAtRoute(ui: ReactElement, opts: { path: string; route: string }) {
  const qc = makeQueryClient();
  return {
    qc,
    ...render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[opts.route]}>
          <Routes>
            <Route path={opts.path} element={ui} />
            <Route path="*" element={<div>navigated-away</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  };
}

/** Wrapper for renderHook so hooks can use react-query. */
export function hookWrapper() {
  const qc = makeQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}
