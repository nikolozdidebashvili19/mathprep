export type SidebarNavItem = {
  href: string;
  label: string;
  icon: 'home' | 'clipboard' | 'map' | 'route' | 'trending';
};

export const SIDEBAR_SECTION_LABEL = 'მომზადება';

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { href: '/dashboard', label: 'მთავარი', icon: 'home' },
  { href: '/diagnostic', label: 'დიაგნოსტიკა', icon: 'clipboard' },
  { href: '/report', label: 'ცოდნის რუკა', icon: 'map' },
  { href: '/course', label: 'ჩემი კურსი', icon: 'route' },
  { href: '/progress', label: 'პროგრესი', icon: 'trending' },
];
