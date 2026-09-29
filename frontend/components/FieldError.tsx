export default function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="field-error" role="alert">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><path d="M12 7v6M12 16.5v.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
      {message}
    </p>
  );
}
