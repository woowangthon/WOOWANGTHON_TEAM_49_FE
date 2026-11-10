// Keep literal environment reads so Next.js can eliminate development imports.
export const mockEnabled = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_MOCK_API === "true";
