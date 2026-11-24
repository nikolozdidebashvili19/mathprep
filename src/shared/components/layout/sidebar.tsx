'use client';
import { BookOpen, ClipboardList, House, Map, Route, TrendingUp, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  SIDEBAR_NAV_ITEMS,
  SIDEBAR_SECTION_LABEL,
  type SidebarNavItem,
} from '@/shared/const/navigation.const';
import { cn } from '@/shared/lib/utils';

const SIDEBAR_ICON_MAP: Record<SidebarNavItem['icon'], LucideIcon> = {
  home: House,
  clipboard: ClipboardList,
  map: Map,
  route: Route,
  trending: TrendingUp,
  book: BookOpen,
};

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export const Sidebar = ({ className, onNavigate }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex w-64 shrink-0 flex-col gap-2 border-r-2 border-border bg-sidebar p-4',
        className
      )}
    >
      <p className="px-3 pb-2 pt-1 text-sm font-extrabold text-muted-foreground">
        {SIDEBAR_SECTION_LABEL}
      </p>
      <nav className="flex flex-col gap-2">
        {SIDEBAR_NAV_ITEMS.map(({ href, label, icon }) => {
          const Icon = SIDEBAR_ICON_MAP[icon];
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-4 rounded-xl border-2 px-3 py-2.5 text-sm font-extrabold transition-colors',
                isActive
                  ? 'border-sky bg-sky/10 text-sky'
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-6 shrink-0" strokeWidth={2.25} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
