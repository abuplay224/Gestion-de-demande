import * as React from "react"
import { cn } from "cn"

// Tableau adapté au prototype Doztra : en-tête #F5F6F8 aux coins arrondis, lignes séparées par #EEF0F3.

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full min-w-0 overflow-hidden">
      <table
        data-slot="table"
        className={cn(
          "w-full table-fixed border-separate border-spacing-0 text-sm",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={className} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={cn("transition-colors duration-400", className)} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "bg-doztra-soft-2 px-3.5 py-[13px] text-left text-[12.5px] font-semibold text-doztra-muted first:rounded-l-xl last:rounded-r-xl",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("border-b border-doztra-line p-3.5 align-middle", className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell }
