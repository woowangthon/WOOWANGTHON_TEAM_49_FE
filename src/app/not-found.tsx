import Link from "next/link";

import { StatePanel } from "@/components/ui/state-panel";

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center p-4">
      <StatePanel
        title="페이지를 찾을 수 없습니다"
        description="주소를 확인하거나 처음 화면으로 이동해 주세요."
        action={<Link href="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 py-3 text-body font-bold text-surface">처음 화면</Link>}
      />
    </main>
  );
}
