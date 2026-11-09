import { StatePanel } from "@/components/ui/state-panel";

export function AuthPending({ fullPage = false, title = "로그인 상태를 확인하고 있습니다", description = "잠시만 기다려 주세요." }: {
  fullPage?: boolean;
  title?: string;
  description?: string;
}) {
  const content = <StatePanel title={title} description={description} live />;
  return fullPage
    ? <main id="main-content" className="grid min-h-dvh place-items-center p-4">{content}</main>
    : content;
}
