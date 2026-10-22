import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

// Champs Doztra : 16 px minimum (pas de zoom iOS), focus visible global.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 rounded-xl border-[1.5px] border-doztra-control bg-doztra-field px-3.5 py-[13px] text-base text-doztra-ink placeholder:text-doztra-muted aria-invalid:border-doztra-error-field disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
