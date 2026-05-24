interface Props {
  text: string;
  className?: string;
}

export function Sentence({ text, className = "" }: Props) {
  return <p className={`text-lg leading-snug text-warm-800 ${className}`}>{text}</p>;
}
