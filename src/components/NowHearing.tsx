interface NowHearingProps {
  /** The sonifier's sentence for the current moment; empty while the picture is not playing. */
  text: string;
}

/**
 * Says in words what the sound is doing now. Plain text that changes a couple
 * of times a second at most, and deliberately not a live region: a screen
 * reader user reads it when they choose, and is not interrupted by it.
 */
export function NowHearing({ text }: NowHearingProps) {
  return (
    <section aria-labelledby="now-hearing-heading" className="now-hearing">
      <h3 id="now-hearing-heading">What you are hearing</h3>
      <p>{text || 'Press Play, and this line says what the sound is doing.'}</p>
    </section>
  );
}
