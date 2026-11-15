interface NowHearingProps {
  text: string;
}

export function NowHearing({ text }: NowHearingProps) {
  return (
    <section aria-labelledby="now-hearing-heading" className="now-hearing">
      <h3 id="now-hearing-heading">What you are hearing</h3>
      <p>{text}</p>
    </section>
  );
}
