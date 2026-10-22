import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "block min-h-[150px] w-full resize-y rounded-xl border-[1.5px] border-doztra-control bg-doztra-field px-3.5 py-[13px] text-base leading-normal text-doztra-ink placeholder:text-doztra-muted aria-invalid:border-doztra-error-field disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
