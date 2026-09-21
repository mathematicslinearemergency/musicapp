import { Menu, Search as SearchIcon, Music2 } from 'lucide-react';

interface MobileBarProps {
  onOpenSidebar: () => void;
  onNavigateSearch: () => void;
}

export default function MobileBar({ onOpenSidebar, onNavigateSearch }: MobileBarProps) {
  return (
    <header className="glass sticky top-0 z-20 flex items-center justify-between px-3 py-3 md:hidden">
      <button onClick={onOpenSidebar} className="text-gray-200" aria-label="Menu">
        <Menu size={24} />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
          <Music2 size={18} className="text-white" />
        </div>
        <span className="text-base font-bold">Resonate</span>
      </div>
      <button onClick={onNavigateSearch} className="text-gray-200" aria-label="Search">
        <SearchIcon size={22} />
      </button>
    </header>
  );
}
