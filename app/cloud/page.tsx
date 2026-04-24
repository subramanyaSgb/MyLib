import { StubView } from "@/lib/design/stub-view";

export default function CloudPage() {
  return (
    <StubView
      eyebrow="Coming soon"
      title="Cloud saves"
      subtitle="Conflict overview across stores that support cloud — Steam Cloud, Epic Cloud, GOG Galaxy, etc."
      bullet={[
        "Storage used per game, total per store",
        "Conflict detection when newer save exists on multiple stores",
        "One-click resolve: keep latest, keep specific copy",
        "Force-sync-all action",
      ]}
    />
  );
}
