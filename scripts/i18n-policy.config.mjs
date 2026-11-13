// Explicit inspection boundaries. These directories contain data/fixtures, not shipped UI.
export const excludedDirectories = ['test', 'messages', 'mocks'];
export const inspectedMockFiles = ['src/mocks/mock-boundary.tsx'];
// These adapters export raw DTO validators and message descriptors for protocol handling.
// They must not create rendered user labels; presentation callers use their scoped factories.
export const wireSchemaModules = [
 'src/features/auth/schemas.ts', 'src/features/auth/deletion.ts',
 'src/features/cases/schemas.ts', 'src/features/workplaces/schemas.ts',
 'src/features/documents/schemas.ts', 'src/features/case-inputs/schemas.ts',
 'src/features/results/schemas.ts', 'src/features/chats/api.ts',
];
export const defaultLocaleOwners = ['src/i18n/config.ts', 'src/i18n/use-translation.ts', 'src/i18n/language-provider.tsx', 'src/features/auth/controller.ts', ...wireSchemaModules];
