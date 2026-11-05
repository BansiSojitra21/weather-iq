import { CloudSun } from "lucide-react";
import { cn } from "@/lib/utils";

export function WeatherLogo({ className }: { className: string }) {
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-2xl bg-accent text-white", className)}
      aria-hidden="true"
    >
      <CloudSun className="h-1/2 w-1/2" strokeWidth={2} />
    </span>
  );
}
