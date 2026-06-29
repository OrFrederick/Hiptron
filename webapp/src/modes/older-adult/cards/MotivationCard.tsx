import { Card } from "../../../shared/kit";
import { HIP } from "../../../shared/theme";

const c = HIP.c;

export function MotivationCard({ status }: { status: "green" | "amber" }) {
  const text =
    status === "green"
      ? "Du machst das richtig gut – weiter so!"
      : "Magst du heute eine kleine Runde drehen? Schön, wenn du wieder etwas mehr unterwegs bist.";

  return (
    <Card>
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          lineHeight: 1.4,
          color: c.textDark,
        }}
      >
        {text}
      </div>
    </Card>
  );
}
