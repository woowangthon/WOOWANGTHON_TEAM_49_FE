import { StatePanel } from "@/components/ui/state-panel";

export default function Home() {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center px-4 py-10 sm:px-6">
      <StatePanel title="월급잇다" description="서비스를 준비하고 있습니다." />
    </main>
  );
}
