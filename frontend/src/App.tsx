import { LandingPage } from "@/pages/landing";
import { Toaster } from "@/components/ui/sonner";

export function App() {
  return (
    <>
      <LandingPage />
      <Toaster position="top-center" richColors />
    </>
  );
}

export default App;
