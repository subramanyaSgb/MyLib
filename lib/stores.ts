export const STORES = [
  { id: "steam", name: "Steam" },
  { id: "epic", name: "Epic Games" },
  { id: "gog", name: "GOG" },
  { id: "stove", name: "Stove" },
  { id: "play", name: "Google Play" },
] as const;

export type StoreId = (typeof STORES)[number]["id"];
