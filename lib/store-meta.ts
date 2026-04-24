/**
 * Full design palette per store. `dark` is used for the contrasting letter
 * inside the StoreDot chip; `letter` is the displayed glyph.
 */
export type StoreMeta = { id: string; name: string; color: string; dark: string; letter: string };

export const STORE_PALETTE: Record<string, StoreMeta> = {
  steam: { id: "steam", name: "Steam",        color: "#66c0f4", dark: "#1b2838", letter: "S" },
  epic:  { id: "epic",  name: "Epic Games",   color: "#efefef", dark: "#2a2a2a", letter: "E" },
  gog:   { id: "gog",   name: "GOG",          color: "#a25fff", dark: "#2b1a3f", letter: "G" },
  stove: { id: "stove", name: "Stove",        color: "#ff8a3d", dark: "#3a1f10", letter: "ST" },
  play:  { id: "play",  name: "Google Play",  color: "#34a853", dark: "#0f2a18", letter: "P" },
  xbox:  { id: "xbox",  name: "Xbox",         color: "#9bf00b", dark: "#10230a", letter: "X" },
  psn:   { id: "psn",   name: "PlayStation",  color: "#3d8bff", dark: "#0a1730", letter: "PS" },
  ubi:   { id: "ubi",   name: "Ubisoft",      color: "#dadada", dark: "#1a1a1a", letter: "U" },
  ea:    { id: "ea",    name: "EA App",       color: "#ff5c5c", dark: "#2a0f0f", letter: "EA" },
  bnet:  { id: "bnet",  name: "Battle.net",   color: "#3db8ff", dark: "#0a1f33", letter: "B" },
  itch:  { id: "itch",  name: "itch.io",      color: "#fa5c5c", dark: "#2b1111", letter: "IO" },
};

// Backward-compatible alias used by older modules.
export const STORE_META = STORE_PALETTE;
