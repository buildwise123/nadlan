export function Placeholder({ title, phase, description }: { title: string; phase: number; description: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">{description}</p>
      <p className="mt-6 inline-block rounded-md border border-border px-3 py-1 text-sm text-muted">
        ייבנה בשלב {phase}
      </p>
    </section>
  );
}
