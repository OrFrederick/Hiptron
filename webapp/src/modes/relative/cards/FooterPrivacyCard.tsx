export function FooterPrivacyCard({ name }: { name: string }) {
  return (
    <p className="text-center text-[13px] text-ink-muted mt-1 mb-1 px-4 leading-relaxed">
      {name} teilt diese Einblicke mit dir.
    </p>
  );
}
