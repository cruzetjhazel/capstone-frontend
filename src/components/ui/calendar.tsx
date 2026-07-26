"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 relative", className)}
      classNames={{
        root: "w-fit relative",
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mx-10",
        caption_label: "text-sm font-medium",
        
        // Forces the navigation container to span the top header area cleanly
        nav: "absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none z-20",
        
        // Style hooks for v8 compatibility
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-background p-0 border border-input opacity-80 hover:opacity-100 pointer-events-auto shadow-sm"
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        
        // Style hooks for v9 compatibility
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-background p-0 border border-input opacity-80 hover:opacity-100 pointer-events-auto shadow-sm absolute left-0"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-background p-0 border border-input opacity-80 hover:opacity-100 pointer-events-auto shadow-sm absolute right-0"
        ),
        
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-30 line-through",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        // Dual-compatibility icon rendering mapping
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        Chevron: ({ orientation, className, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
          }
          return <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }