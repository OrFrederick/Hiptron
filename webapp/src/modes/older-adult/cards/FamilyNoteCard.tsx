import { Card } from "../../../shared/Card";

interface Props {
  note: string | null;
}

export function FamilyNoteCard({ note }: Props) {
  if (!note) return null;
  return (
    <Card className="bg-warm-200">
      <p className="text-lg">💌 {note}</p>
    </Card>
  );
}
