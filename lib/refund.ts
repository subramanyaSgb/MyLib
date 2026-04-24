import type { DerivedOwner } from "./design/derived";

type RefundRule = {
  windowDays: number;
  maxPlaytimeMin: number;
  /// Human-readable store policy summary for tooltip copy.
  summary: string;
};

const RULES: Record<string, RefundRule> = {
  steam: {
    windowDays: 14,
    maxPlaytimeMin: 120,
    summary: "Steam: within 14 days of purchase and under 2 hours played.",
  },
  epic: {
    windowDays: 14,
    maxPlaytimeMin: 120,
    summary: "Epic: within 14 days of purchase and under 2 hours played (unlaunched titles always eligible).",
  },
  gog: {
    windowDays: 30,
    maxPlaytimeMin: 0,
    summary: "GOG: within 30 days, unlaunched. GOG reviews every request individually.",
  },
};

const FALLBACK: RefundRule = {
  windowDays: 14,
  maxPlaytimeMin: 0,
  summary: "Store-specific refund rules apply.",
};

export type RefundVerdict = {
  eligible: boolean;
  daysLeft: number;
  rule: RefundRule;
  /// True if we fell back to firstSeenAt because the store connector didn't
  /// surface purchasedAt. Keeps the UI honest about lower confidence.
  basisIsHeuristic: boolean;
};

export function computeRefund(owner: Pick<DerivedOwner, "storeId" | "playtimeMin" | "purchasedAt" | "firstSeenAt">, now: Date = new Date()): RefundVerdict {
  const rule = RULES[owner.storeId] ?? FALLBACK;
  const anchor = owner.purchasedAt ?? owner.firstSeenAt;
  const dayMs = 86_400_000;
  const elapsed = (now.getTime() - anchor.getTime()) / dayMs;
  const daysLeft = Math.max(0, Math.ceil(rule.windowDays - elapsed));
  const withinWindow = elapsed <= rule.windowDays;
  const withinPlaytime = owner.playtimeMin <= rule.maxPlaytimeMin;
  const eligible = withinWindow && withinPlaytime;
  return {
    eligible,
    daysLeft,
    rule,
    basisIsHeuristic: owner.purchasedAt == null,
  };
}
