import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  name: string;
  isHost?: boolean;
  className?: string;
  colorSeed?: number;
}

export function PlayerAvatar({ name, isHost, className, colorSeed = 0 }: PlayerAvatarProps) {
  const colors = [
    'bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 
    'bg-rose-400', 'bg-fuchsia-400', 'bg-indigo-400'
  ];
  
  const colorClass = colors[(name.length + colorSeed) % colors.length];
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={cn("relative flex flex-col items-center gap-2 group", className)}>
      <div className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg border-4 border-white/20 transition-transform group-hover:scale-110",
        colorClass
      )}>
        {initial}
      </div>
      
      <div className="flex flex-col items-center">
        <span className="font-bold text-foreground truncate max-w-[100px] text-center text-sm">
          {name}
        </span>
        {isHost && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full mt-1">
            Host
          </span>
        )}
      </div>
    </div>
  );
}
