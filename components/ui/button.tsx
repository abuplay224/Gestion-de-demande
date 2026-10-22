import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Adapté à la charte Doztra : focus visible global (globals.css), pas d’anneau shadcn.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-bold whitespace-nowrap transition-colors select-none hover:no-underline disabled:cursor-default [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-doztra-primary text-white hover:bg-doztra-primary-hover hover:text-white",
        outline:
          "border-[1.5px] border-doztra-control bg-white text-doztra-ink hover:text-doztra-ink",
        dark: "bg-doztra-ink text-white hover:text-white",
        night:
          "bg-doztra-night-surface text-white hover:text-white",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 rounded-lg px-2.5 text-sm",
        none: "",
        icon: "size-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
