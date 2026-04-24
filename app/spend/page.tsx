import { StubView } from "@/lib/design/stub-view";

export default function SpendPage() {
  return (
    <StubView
      eyebrow="Coming soon"
      title="Spend"
      subtitle="Lifetime spend per store. Stacked bar + per-store cards. Surfaces $/hr value."
      bullet={[
        "Pull purchase history from Steam, Epic, GOG when APIs allow",
        "Stacked horizontal bar with brand colors",
        "$/hr value column to see which platform earned its keep",
        "Annual/quarterly breakdown with sparkline",
      ]}
    />
  );
}
