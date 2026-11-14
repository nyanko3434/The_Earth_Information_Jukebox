interface AnnouncerProps {
  message: string;
}

export function Announcer({ message }: AnnouncerProps) {
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
