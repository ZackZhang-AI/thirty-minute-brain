import { IconSearch } from "@tabler/icons-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="relative block">
      <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={22} stroke={1.8} />
      <input
        className="h-14 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-12 pr-4 text-base text-zinc-50 outline-none transition focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search your last 30 minutes..."
        autoFocus
      />
    </label>
  );
}

