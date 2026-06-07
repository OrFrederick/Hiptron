import { Card } from "../../../shared/kit";

interface Props {
  note: string | null;
}

export function FamilyNoteCard({ note }: Props) {
  if (!note) return null;
  return (
    <Card style={{ background: "#FFF7E6", borderColor: "#F4E3BD" }}>
      <p className="text-[17px] text-ink">💌 {note}</p>
    </Card>
  );
}
