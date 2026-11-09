import { StatePanel } from "@/components/ui/state-panel";
import Link from "next/link";

export default function Home() {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center px-4 py-10 sm:px-6">
      <StatePanel title="월급잇다" description="내 근무 자료를 연결하고 급여 차이의 근거를 확인하세요." action={<Link href="/login" className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 py-3 text-body font-bold text-surface">로그인하고 시작하기</Link>} />
    </main>
  );
}
