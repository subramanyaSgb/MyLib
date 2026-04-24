import { StubView } from "@/lib/design/stub-view";

export default function WishlistPage() {
  return (
    <StubView
      eyebrow="Coming soon"
      title="Wishlist"
      subtitle="Track wanted games across stores. Set a target price; we'll watch."
      bullet={[
        "Add items via store URL paste or search",
        "Per-row price bar showing current vs target vs full price",
        "Sale alerts on the home dashboard",
        "Auto-buy buttons that deep-link to the cheapest store",
      ]}
    />
  );
}
