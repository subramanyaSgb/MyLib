import { StubView } from "@/lib/design/stub-view";

export default function FamilyPage() {
  return (
    <StubView
      eyebrow="Coming soon"
      title="Family"
      subtitle="Members who share access to your linked stores. Built on Steam Family Sharing and equivalents."
      bullet={[
        "Invite members by email",
        "Per-member 'has access to' list of accounts",
        "Track which family members are currently playing your shared games",
        "Revoke / re-grant per account",
      ]}
    />
  );
}
