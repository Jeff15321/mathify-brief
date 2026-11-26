'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, History, NotebookPen, UserRound } from 'lucide-react';

const links = [
  { href: '/workspace', label: 'Workspace', Icon: NotebookPen },
  { href: '/sessions', label: 'Sessions', Icon: History },
  { href: '/profile', label: 'Learner profile', Icon: UserRound },
];

export function AppNav() {
  const pathname = usePathname();
  return <header className="border-b border-line bg-card">
    <div className="site-header">
      <Link href="/workspace" className="brand-link" aria-label="Tutor Brief home">
        <BookOpen size={24} aria-hidden />Tutor Brief
      </Link>
      <nav aria-label="Main" className="flex gap-1">
        {links.map(({ href, label, Icon }) => {
          const current = pathname === href || pathname.startsWith(href + '/');
          return <Link key={href} href={href} aria-current={current ? 'page' : undefined} className="nav-link">
            <Icon size={17} aria-hidden />{label}
          </Link>;
        })}
      </nav>
    </div>
  </header>;
}
