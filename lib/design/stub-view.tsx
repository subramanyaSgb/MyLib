import { PageHeader } from "./primitives";

export function StubView({
  eyebrow,
  title,
  subtitle,
  bullet,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  bullet: string[];
}) {
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div style={{ padding: "40px 40px 60px", maxWidth: 720 }}>
        <div
          style={{
            padding: 28,
            border: "1px dashed var(--border)",
            borderRadius: 10,
            background: "var(--bg-2)",
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 10 }}>What it will do</div>
          <ul style={{ paddingLeft: 18, margin: 0, color: "var(--text-soft)", lineHeight: 1.6, fontSize: 13 }}>
            {bullet.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
