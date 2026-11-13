export const MAX_TITLE_LENGTH = 120;
export const MAX_IMPORT_BYTES = 256 * 1024;
export const MAX_CONTENT_BYTES = 700 * 1024;
export const DEFAULT_TITLE = "Untitled document";
export const COOKIE_NAME = "ajaia_demo_user";

export const SEEDED_USERS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    displayName: "Alex Morgan",
    email: "alex@demo.ajaia.test",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    displayName: "Sam Patel",
    email: "sam@demo.ajaia.test",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    displayName: "Lee Chen",
    email: "lee@demo.ajaia.test",
  },
] as const;
