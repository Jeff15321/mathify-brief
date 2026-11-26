'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, History, Menu, PanelLeftClose, PanelLeftOpen, PenLine, UserRound, X } from 'lucide-react';

const LINKS = [
  { href: '/workspace', label: 'Workspace', Icon: PenLine },
  { href: '/sessions', label: 'Sessions', Icon: History },
  { href: '/profile', label: 'Learner profile', Icon: UserRound },
];
const STORAGE_KEY = 'mathify.navExpanded';
function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

/** Left sidebar on desktop (collapsible to an icon rail), top bar with a menu on narrow screens. */
export function AppNav() {
  const pathname = usePathname();
  const stored = useSyncExternalStore(subscribe, () => localStorage.getItem(STORAGE_KEY), () => null);
  const [menuOpen, setMenuOpen] = useState(false);
  // /workspace always starts as a rail so its panels keep their width; toggles there are not saved.
  const onWorkspace = pathname.startsWith('/workspace');
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const expanded = onWorkspace ? workspaceExpanded : stored !== 'false';
  function toggle() {
    if (onWorkspace) { setWorkspaceExpanded(!expanded); return; }
    localStorage.setItem(STORAGE_KEY, String(!expanded));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }
  return <nav aria-label="Main" className={`relative z-50 flex shrink-0 flex-col border-brand-deep bg-brand-deep text-card [&_:focus-visible]:outline-pale md:sticky md:top-0 md:h-dvh md:border-r ${expanded ? 'md:w-52' : 'md:w-14'}`}>
    <div className={`flex h-12 items-center justify-between gap-2 border-b border-card/20 px-3 md:border-b-0 ${expanded ? '' : 'md:justify-center md:px-0'}`}>
      <span className={`inline-flex items-center gap-2 text-lg font-bold text-card ${expanded ? '' : 'md:hidden'}`}>
        <BookOpen size={20} aria-hidden="true" className="shrink-0 text-pale" />
        Tutor Brief
      </span>
      <button type="button" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        className="rounded p-1 text-card/85 hover:bg-card/15 md:hidden">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
      <button type="button" onClick={toggle} aria-expanded={expanded} aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        className="hidden rounded p-1 text-card/85 hover:bg-card/15 md:block">{expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}</button>
    </div>
    <ul className={`${menuOpen ? 'flex' : 'hidden'} absolute inset-x-0 top-12 flex-col gap-1 border-b border-card/20 bg-brand-deep p-2 md:static md:flex md:border-0`}>
      {LINKS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <li key={href}><Link href={href} onClick={() => { setMenuOpen(false); setWorkspaceExpanded(false); }} aria-current={active ? 'page' : undefined} title={expanded ? undefined : label}
          className={`flex items-center gap-3 rounded-panel px-3 py-2 text-sm ${expanded ? '' : 'md:justify-center md:px-0'} ${active ? 'bg-wash font-bold text-brand-deep' : 'text-card/85 hover:bg-card/15'}`}>
          <Icon size={18} className="shrink-0" aria-hidden="true" /><span className={expanded ? '' : 'md:sr-only'}>{label}</span>
        </Link></li>;
      })}
    </ul>
  </nav>;
}
