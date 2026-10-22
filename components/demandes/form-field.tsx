import { Label } from "@/components/ui/label";

/** Libellé + champ + message d’erreur relié par aria-describedby. */
export function FormField({
  id,
  label,
  optional,
  error,
  aside,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex items-baseline justify-between gap-2.5">
        <Label htmlFor={id} className="block text-sm leading-normal font-bold">
          {label}
          {optional && <span className="font-medium text-doztra-muted"> (facultatif)</span>}
        </Label>
        {aside}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="m-0 text-[13px] font-semibold text-doztra-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldA11y(id: string, error?: string) {
  return {
    id,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}
