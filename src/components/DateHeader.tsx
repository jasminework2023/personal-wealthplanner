import { todayLabel } from "../lib/settings";

export function DateHeader() {
  return (
    <p className="hidden sm:block text-[12.5px] text-charcoal/45 font-medium tracking-wide">
      {todayLabel()}
    </p>
  );
}
