import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";


interface Props {
  onDark?: boolean;
  size?: "sm" | "md";
  className?: string;
  linkTo?: string | null;
}

export default function Logo({
  onDark = false,
  size = "md",
  className,
  linkTo = "/",
}: Props) {
  const box = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  const content = (
    <div className={cn("flex items-center gap-2.5 group", className)}>
      <div className={cn(box, "rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1410]")}>
    <img
      src="/images/bulan-logo.png"
      alt="Bulan Photography Booking"
      className="w-full h-full object-cover"
    />
      </div>

      <div className="leading-tight">
        <p
          className={cn(
            "font-heading font-bold text-base tracking-tight",
            onDark ? "text-white" : "text-foreground"
          )}
        >
          Bulan
        </p>

        <p
          className={cn(
            "text-[10px] font-medium",
            onDark ? "text-white/60" : "text-muted-foreground"
          )}
        >
          Photography Booking
        </p>
      </div>
    </div>
  );

  if (linkTo === null) return content;

  return <Link to={linkTo}>{content}</Link>;
}