/** Use this non-secret generation to prevent cache reuse after login/account switch. */
export const queryKeys = {
  session: (generation: number) => ["session", generation] as const,
};
