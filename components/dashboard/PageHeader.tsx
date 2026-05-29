export function PageHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-10 md:mb-12">
      <p
        className="font-mono text-ink-faint mb-3"
        style={{ fontSize: "11px", letterSpacing: "0.28em" }}
      >
        {label}
      </p>
      <h1
        className="font-display font-medium text-ink"
        style={{
          fontSize: "clamp(2rem, 3.4vw, 2.8rem)",
          lineHeight: 1.02,
          letterSpacing: "-0.025em",
        }}
      >
        {title}
      </h1>
      {description && (
        <p
          className="text-ink-soft mt-4 max-w-[58ch]"
          style={{ fontSize: "1rem", lineHeight: 1.55 }}
        >
          {description}
        </p>
      )}
    </header>
  );
}
