import { prisma } from "@/lib/db";
import { OnboardingFlow } from "./flow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const [accountCount, gameCount] = await Promise.all([
    prisma.account.count(),
    prisma.gameOnStore.count(),
  ]);
  // Detect duplicate count via SQL group-by-then-filter on OwnedCopy.
  const dupes = await prisma.gameOnStore.groupBy({
    by: ["gameId"],
    _count: { _all: true },
  });
  const dupCount = dupes.filter((d) => d._count._all > 1).length;

  return <OnboardingFlow accountCount={accountCount} gameCount={gameCount} dupCount={dupCount} />;
}
