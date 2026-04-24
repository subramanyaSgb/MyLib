import type { IconName } from "./primitives";

export type RouteDef = {
  id: string;
  label: string;
  icon: IconName;
  path: string;
};

export const ROUTES: RouteDef[] = [
  { id: "home",         label: "Home",         icon: "home",    path: "/" },
  { id: "library",      label: "Library",      icon: "library", path: "/library" },
  { id: "duplicates",   label: "Duplicates",   icon: "dupe",    path: "/duplicates" },
  { id: "wishlist",     label: "Wishlist",     icon: "wish",    path: "/wishlist" },
  { id: "deals",        label: "Free & deals", icon: "sparkle", path: "/deals" },
  { id: "achievements", label: "Achievements", icon: "ach",     path: "/achievements" },
  { id: "cloud",        label: "Cloud gaming", icon: "cloud",   path: "/cloud" },
  { id: "spend",        label: "Spend",        icon: "spend",   path: "/spend" },
  { id: "family",       label: "Family",       icon: "family",  path: "/family" },
  { id: "accounts",     label: "Accounts",     icon: "acc",     path: "/accounts" },
  { id: "settings",     label: "Settings",     icon: "set",     path: "/settings" },
];
