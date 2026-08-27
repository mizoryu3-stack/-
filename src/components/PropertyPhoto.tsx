const GRADIENTS = [
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-600",
  "from-rose-400 to-pink-600",
  "from-violet-400 to-indigo-600",
  "from-cyan-400 to-sky-600",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1000;
  }
  return hash;
}

export default function PropertyPhoto({
  photoUrl,
  name,
  buildingType,
  className = "",
}: {
  photoUrl?: string | null;
  name: string;
  buildingType: "HOUSE" | "APARTMENT";
  className?: string;
}) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} className={`object-cover ${className}`} />;
  }

  const gradient = GRADIENTS[hashString(name) % GRADIENTS.length];

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${gradient} text-white ${className}`}
    >
      <div className="flex flex-col items-center gap-1 opacity-90">
        <span className="text-4xl">{buildingType === "HOUSE" ? "🏡" : "🏢"}</span>
        <span className="text-[11px] font-medium tracking-wide">写真未登録</span>
      </div>
    </div>
  );
}
