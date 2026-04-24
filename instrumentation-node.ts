/**
 * Background auto-sync. Runs every AUTOSYNC_HOURS hours per account whose
 * lastSyncAt is older than the threshold. Set AUTOSYNC_HOURS=0 to disable.
 */
import { prisma } from "./lib/db";
import { syncAccount } from "./lib/sync";

const hours = Number(process.env.AUTOSYNC_HOURS ?? "6");
if (hours > 0) {
  const intervalMs = 30 * 60 * 1000;
  const thresholdMs = hours * 60 * 60 * 1000;

  async function tick() {
    try {
      const cutoff = new Date(Date.now() - thresholdMs);
      const due = await prisma.account.findMany({
        where: { OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: cutoff } }] },
        select: { id: true, label: true, storeId: true },
      });
      for (const a of due) {
        try {
          const r = await syncAccount(a.id);
          console.log(`[autosync] ${a.storeId}/${a.label}: +${r.added} ~${r.updated} (${r.total})`);
        } catch (e) {
          console.warn(`[autosync] ${a.storeId}/${a.label} FAILED:`, e instanceof Error ? e.message : e);
        }
      }
    } catch (e) {
      console.warn("[autosync] tick error:", e);
    }
  }

  setTimeout(tick, 60_000);
  setInterval(tick, intervalMs);
  console.log(`[autosync] enabled — accounts older than ${hours}h will sync every 30min`);
}
