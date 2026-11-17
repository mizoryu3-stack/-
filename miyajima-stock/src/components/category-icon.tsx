import {
  Armchair, Bath, BedDouble, CookingPot, DoorOpen, Droplets, Flame, Footprints, Lamp, Package, Plug, Shirt,
  Sofa, SprayCan, Tag, Tv, Utensils, Wrench, Flower2, Wifi, Key, Sparkles, type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tag: Tag, sofa: Sofa, "bed-double": BedDouble, armchair: Armchair, "cooking-pot": CookingPot, bath: Bath,
  droplets: Droplets, "door-open": DoorOpen, footprints: Footprints, plug: Plug, flame: Flame, "spray-can": SprayCan,
  package: Package, lamp: Lamp, shirt: Shirt, tv: Tv, utensils: Utensils, wrench: Wrench, flower: Flower2, wifi: Wifi,
  key: Key, sparkles: Sparkles,
};

export const CATEGORY_COLORS = [
  "#1f4d3a", "#3d6b57", "#6b8f71", "#b08d57", "#9c7a3c", "#8c6e4a", "#4a7c8c", "#7a9aa8",
  "#3b4a5c", "#5c8a8a", "#a8423a", "#8a5a7a", "#6b6b6b", "#a3a08c",
];

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = CATEGORY_ICONS[icon] ?? Tag;
  return <Icon className={className} />;
}

export function CategoryChip({ name, color, icon, active = true, small }: { name: string; color: string; icon: string; active?: boolean; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1.5 text-[13px]"}`}
      style={
        active
          ? { backgroundColor: `${color}1f`, borderColor: `${color}55`, color: "var(--foreground)" }
          : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
      }
    >
      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
      <CategoryIcon icon={icon} className={small ? "size-3" : "size-3.5"} />
      {name}
    </span>
  );
}
