import { useRef, type ClipboardEvent, type InputHTMLAttributes, type KeyboardEvent } from "react";

export function Input({
  label,
  error,
  helper,
  className = "",
  id,
  ...rest
}: {
  label?: string;
  error?: string;
  helper?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? (label ? `in-${label.replace(/\W+/g, "-").toLowerCase()}` : undefined);
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-primary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={!!error || undefined}
        className={`min-h-11 w-full rounded-chip border-2 bg-surface px-3.5 text-primary outline-none transition-colors placeholder:text-muted focus:border-accent ${
          error ? "border-danger" : "border-primary/20"
        }`}
        {...rest}
      />
      {(error || helper) && (
        <p className={`mt-1.5 text-sm ${error ? "text-danger" : "text-primary/60"}`}>
          {error ?? helper}
        </p>
      )}
    </div>
  );
}

const CODE_CHARS = /[^A-Z0-9]/g;

/** Large 6-box class code input: auto-uppercase, auto-advance, paste fills every box. */
export function CodeInput({
  value,
  onChange,
  length = 6,
  error = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const setAt = (i: number, ch: string) => {
    const next = chars.slice();
    next[i] = ch;
    onChange(next.join("").slice(0, length));
  };

  const handleInput = (i: number, raw: string) => {
    let clean = raw.toUpperCase().replace(CODE_CHARS, "");
    if (!clean) return;
    // typed after an existing char in the same box: keep only the new char
    if (clean.length === 2 && chars[i] && clean[0] === chars[i]) clean = clean[1]!;
    if (clean.length > 1) {
      // typed over an existing char or mobile autofill: spread from here
      const next = chars.slice();
      for (let k = 0; k < clean.length && i + k < length; k++) next[i + k] = clean[k]!;
      onChange(next.join(""));
      focus(i + clean.length);
      return;
    }
    setAt(i, clean);
    focus(i + 1);
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (chars[i]) setAt(i, "");
      else if (i > 0) {
        setAt(i - 1, "");
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") focus(i - 1);
    else if (e.key === "ArrowRight") focus(i + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const clean = e.clipboardData.getData("text").toUpperCase().replace(CODE_CHARS, "").slice(0, length);
    if (!clean) return;
    onChange(clean);
    focus(clean.length);
  };

  return (
    <div className="flex gap-1.5 sm:gap-2.5" role="group" aria-label="Class code">
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={ch}
          disabled={disabled}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          aria-label={`Character ${i + 1}`}
          onChange={(e) => handleInput(i, e.target.value.slice(-length))}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`h-14 w-11 rounded-card border-2 bg-surface text-center font-mono text-3xl font-bold sm:h-20 sm:w-16 sm:text-5xl uppercase tracking-widest text-primary outline-none transition-colors focus:border-accent focus:bg-accent/5 disabled:opacity-50 ${
            error ? "border-danger" : ch ? "border-primary" : "border-primary/20"
          }`}
        />
      ))}
    </div>
  );
}
