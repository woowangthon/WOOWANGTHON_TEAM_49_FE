import { StatePanel } from "@/components/ui/state-panel";

export default function Loading() {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center p-4">
      <StatePanel title="불러오는 중입니다" description="잠시만 기다려 주세요." live />
    </main>
  );
}
