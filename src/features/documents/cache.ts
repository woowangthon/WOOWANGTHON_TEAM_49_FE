import type { QueryClient } from "@tanstack/react-query";
import type { DocumentContext } from "./schemas";
import { documentKeys } from "./query-keys";
/** Revoke scoped document views after the owning Case/Workplace is deleted. */
export async function revokeDocumentScope(client: QueryClient, generation: number, scope: Exclude<DocumentContext, {kind: "library"}>) {
  const root = documentKeys.root(generation);
  const belongs = (key: readonly unknown[]) => {
    const context = key[4];
    return typeof context === "object" && context !== null && "kind" in context && "id" in context && context.kind === scope.kind && context.id === scope.id;
  };
  await client.cancelQueries({ queryKey: root });
  client.removeQueries({ queryKey: root, predicate: q => belongs(q.queryKey) || (scope.kind === "workplace" && q.queryKey[3] === "impact" && q.queryKey[4] === scope.id) });
  await client.invalidateQueries({ queryKey: documentKeys.lists(generation), predicate: q => !belongs(q.queryKey) });
}
