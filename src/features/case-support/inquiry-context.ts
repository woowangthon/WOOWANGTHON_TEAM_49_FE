import type { Results } from "@/features/results/schemas";

/** UI context only. Versions and amounts remain server-owned. */
export function inquiryContext(result: (Results & { interpretation?: string }) | undefined) {
  if (!result) return undefined;
  const snapshots = Object.entries(result.versions).sort(([a], [b]) => a.localeCompare(b));
  const available = snapshots.filter(([, snapshot]) => snapshot.snapshotId !== null && snapshot.version !== null);
  return {
    key: JSON.stringify([result.caseId, result.currentInputVersion, result.resultVersion, snapshots, result.items.map(item => item.id)]),
    versions: Object.fromEntries(available.map(([name, snapshot]) => [name, snapshot.version!])),
    ready: result.interpretation !== "interpretation-error"
      && result.freshness.overall === "CURRENT"
      && result.freshness.hasOutdatedResults !== true
      && result.freshness.activeJobId == null
      && available.length > 0
      && available.every(([, snapshot]) => snapshot.freshness === "CURRENT" && snapshot.inputVersion === result.currentInputVersion),
  };
}
