import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ApiError } from "@/api/client";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-relay text-on-relay hover:brightness-110",
  secondary: "bg-surface text-ink border border-line hover:border-muted",
  ghost: "text-muted hover:text-ink hover:bg-ink/5",
  danger: "bg-fault text-white hover:brightness-110",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; busy?: boolean }
>(function Button({ variant = "secondary", size = "md", busy, className, children, disabled, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-control font-medium whitespace-nowrap transition-[filter,border-color,background-color] disabled:opacity-50 disabled:pointer-events-none",
        size === "md" ? "h-9 px-3.5 text-sm" : "h-7 px-2.5 text-xs",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

const control =
  "w-full rounded-control border border-line bg-surface px-3 h-9 text-sm text-ink placeholder:text-muted/70 focus:border-relay focus:outline-none aria-[invalid=true]:border-fault";

type FieldProps = { label: string; hint?: ReactNode; error?: string | null; children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode };

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-fault">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }>(
  function Input({ className, mono, ...rest }, ref) {
    return <input ref={ref} className={clsx(control, mono && "font-mono text-[13px]", className)} {...rest} />;
  },
);

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(control, "pr-8", className)} {...rest} />;
}

export function TextField({
  label,
  hint,
  error,
  ...input
}: { label: string; hint?: ReactNode; error?: string | null } & InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} {...input} />
      )}
    </Field>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p id={`${id}-label`} className="text-sm font-medium">
          {label}
        </p>
        {description && (
          <p id={`${id}-desc`} className="text-xs text-muted mt-0.5 max-w-prose">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-relay" : "bg-line",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-sm transition-transform",
            checked && "translate-x-4",
          )}
        />
      </button>
    </div>
  );
}

/** A modal on the native <dialog>, which brings focus trapping, Esc and an inert page. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  dismissible = true,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  dismissible?: boolean;
  width?: "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
      className={clsx(
        "m-auto w-[calc(100%-2rem)] rounded-panel border border-line bg-surface p-0 text-ink shadow-2xl",
        width === "md" ? "max-w-md" : "max-w-2xl",
      )}
    >
      {open && (
        <div className="p-6">
          <h2 id={titleId} className="text-lg">
            {title}
          </h2>
          {description && <div className="mt-1.5 text-sm text-muted">{description}</div>}
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  error?: unknown;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <ErrorNote error={error} />
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} busy={busy}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function CopyButton({ value, label = "Copy", onCopied }: { value: string; label?: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setFailed(false);
          setCopied(true);
          onCopied?.();
        } catch {
          setFailed(true);
        }
      }}
    >
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : failed ? "Select and copy" : label}</span>
    </Button>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-[60ch]">
        <h1 className="text-xl">{title}</h1>
        {description && <p className="mt-1.5 text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx("rounded-panel border border-line bg-surface", className)}>{children}</section>;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-panel border border-dashed border-line px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-[48ch] text-muted">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

/** The message for a field, when the API pinned its error to that field. */
export function fieldError(error: unknown, param: string): string | null {
  return error instanceof ApiError && error.param === param ? error.message : null;
}

/** An error not already shown under a field. */
export function ErrorNote({ error, fields = [] }: { error: unknown; fields?: string[] }) {
  if (!error) return null;
  if (error instanceof ApiError && error.param && fields.includes(error.param)) return null;
  return (
    <p role="alert" className="rounded-control bg-fault-soft px-3 py-2 text-sm text-fault">
      {errorMessage(error)}
    </p>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="py-16 text-center text-muted">
      {label}…
    </div>
  );
}

export function Dot({ tone }: { tone: "ok" | "caution" | "fault" | "idle" }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-block size-2 shrink-0 rounded-full",
        tone === "ok" && "bg-relay",
        tone === "caution" && "bg-caution",
        tone === "fault" && "bg-fault",
        tone === "idle" && "bg-line",
      )}
    />
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <code className={clsx("font-mono text-[13px]", className)}>{children}</code>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-surface">
      <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-2.5 [&_th]:font-medium [&_th]:text-muted [&_th]:text-xs [&_tbody_tr]:border-t [&_tbody_tr]:border-line">
        {children}
      </table>
    </div>
  );
}
