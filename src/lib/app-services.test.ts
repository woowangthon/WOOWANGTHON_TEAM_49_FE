import { describe, expect, it } from "vitest";

import { createAppServices } from "./app-services";
import { queryKeys } from "./query/keys";

describe("user cache isolation", () => {
  it("isolates service instances for different application trees", () => {
    const first = createAppServices();
    const second = createAppServices();
    first.session.start("first-user-token");
    first.queryClient.setQueryData(["private"], { document: "first-user" });
    expect(second.session.getSnapshot().accessToken).toBeNull();
    expect(second.queryClient.getQueryData(["private"])).toBeUndefined();
    first.queryClient.clear();
    second.queryClient.clear();
  });

  it("clears private query and mutation caches and aborts requests on logout", () => {
    const { session, queryClient } = createAppServices();
    session.start("user-token");
    const before = session.getSnapshot();
    queryClient.setQueryData(queryKeys.session(before.generation), { private: true });
    queryClient.getMutationCache().build(queryClient, { mutationKey: ["private"] });
    session.clear();
    expect(before.signal.aborted).toBe(true);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it("clears account A's cache when account B starts, but retains cache during token rotation", () => {
    const { session, queryClient } = createAppServices();
    session.start("user-a");
    const generation = session.getSnapshot().generation;
    queryClient.setQueryData(queryKeys.session(generation), { owner: "a" });
    expect(session.rotate("user-a-refreshed", generation)).toBe(true);
    expect(queryClient.getQueryData(queryKeys.session(generation))).toEqual({ owner: "a" });
    session.start("user-b");
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(session.rotate("late-user-a", generation)).toBe(false);
    expect(session.getSnapshot().accessToken).toBe("user-b");
  });

  it("cancels in-flight queries so old private responses do not repopulate the cache", async () => {
    const { session, queryClient } = createAppServices();
    session.start("user-a");
    const key = queryKeys.session(session.getSnapshot().generation);
    let finish!: (data: unknown) => void;
    const query = queryClient.fetchQuery({ queryKey: key, queryFn: () => new Promise((resolve) => { finish = resolve; }) }).catch(() => undefined);
    session.start("user-b");
    finish({ owner: "a" });
    await query;
    expect(queryClient.getQueryData(key)).toBeUndefined();
  });
});
