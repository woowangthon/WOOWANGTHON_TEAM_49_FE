"use client";
import { useMutationState, type MutationKey } from "@tanstack/react-query";

/** Derive removal state from Query's mutation cache, without a second entity store. */
export function useRemovalState(mutationKey: MutationKey) {
  const states = useMutationState({ filters: { mutationKey, exact: true }, select: (mutation) => mutation.state.status });
  return { pending: states.includes("pending"), removed: states.includes("success") };
}
