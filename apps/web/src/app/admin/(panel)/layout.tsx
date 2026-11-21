import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  Sparkles,
  Bell,
  CalendarClock,
  DatabaseBackup,
  QrCode,
  Send,
  UserPlus,
  FileText,
  Inbox,
  Newspaper,
  BadgeDollarSign,
  Ban,
  Flag,
  Megaphone,
  MessageCircle,
  TicketPercent,
  Wallet,
  FolderTree,
  Heart,
  House,
  Gift,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Search,
  Settings,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { can, requireAdmin, ROLE_LABELS, type AdminRole } from '@/lib/admin/auth';
import { logout } from '../login/actions';

export const dynamic = 'force-dynamic';

type NavItem = { href: string; label: string; icon: LucideIcon; roles: AdminRole[]; soon?: string };

const nav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['moderator', 'blog_writer', 'rishta_coordinator'] },
  { href: '/admin/listings', label: 'Listings', icon: ListChecks, roles: ['moderator'] },
  { href: '/admin/reports', label: 'Reports', icon: Flag, roles: ['moderator'] },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, roles: ['moderator'] },
  { href: '/admin/rishta', label: 'Rishta', icon: Heart, roles: ['rishta_coordinator'] },
  { href: '/admin/messages', label: 'Messages', icon: Inbox, roles: ['moderator'] },
  { href: '/admin/reminders', label: 'Expiry reminders', icon: CalendarClock, roles: ['moderator'] },
  { href: '/admin/daily-post', label: 'Daily WhatsApp post', icon: Send, roles: ['moderator'] },
  { href: '/admin/payments', label: 'Payments', icon: Wallet, roles: ['moderator'] },
  { href: '/admin/boost', label: 'WhatsApp Boost', icon: MessageCircle, roles: ['moderator'] },
  { href: '/admin/banners', label: 'Banners', icon: Megaphone, roles: ['moderator'] },
  { href: '/admin/pricing', label: 'Pricing', icon: BadgeDollarSign, roles: [] },
  { href: '/admin/promo-codes', label: 'Promo codes', icon: TicketPercent, roles: [] },
  { href: '/admin/blocklist', label: 'Blocked numbers', icon: Ban, roles: ['moderator'] },
  { href: '/admin/blog', label: 'Blog', icon: Newspaper, roles: ['blog_writer'] },
  { href: '/admin/pages', label: 'Pages', icon: FileText, roles: ['blog_writer'] },
  { href: '/admin/samples', label: 'Sample ads', icon: Sparkles, roles: [] },
  { href: '/admin/homepage', label: 'Homepage', icon: House, roles: [] },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree, roles: [] },
  { href: '/admin/locations', label: 'Locations', icon: MapPin, roles: [] },
  { href: '/admin/free-listings', label: 'Free listings', icon: Gift, roles: [] },
  { href: '/admin/referrals', label: 'Referrals', icon: UserPlus, roles: ['moderator'] },
  { href: '/admin/qr', label: 'QR posters', icon: QrCode, roles: ['moderator'] },
  { href: '/admin/push', label: 'App notifications', icon: Bell, roles: [] },
  { href: '/admin/seo', label: 'SEO', icon: Search, roles: [] },
  { href: '/admin/settings', label: 'Site settings', icon: Settings, roles: [] },
  { href: '/admin/users', label: 'Admin users', icon: Users, roles: [] },
  { href: '/admin/backups', label: 'Backups & export', icon: DatabaseBackup, roles: [] },
  { href: '/admin/activity', label: 'Activity log', icon: Activity, roles: [] },
];

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const items = nav.filter((n) => can(admin, n.roles));

  return (
    <div className="flex min-h-screen flex-wrap">
      <aside className="w-full border-b border-line bg-white print:hidden md:min-h-screen md:w-60 md:border-b-0 md:border-e">
        <div className="flex items-center gap-2 px-4 py-4">
          <LogoMark size={28} />
          <div>
            <p className="text-sm font-extrabold text-brand">Apna Okara</p>
            <p className="text-xs text-ink-muted">Admin panel</p>
          </div>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {items.map(({ href, label, icon: Icon, soon }) =>
            soon ? (
              <span key={href} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-muted">
                <Icon size={18} aria-hidden="true" />
                {label}
                <span className="text-[11px]">({soon})</span>
              </span>
            ) : (
              <Link
                key={href}
                href={href}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-light hover:text-brand-dark"
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            ),
          )}
        </nav>
        <div className="border-t border-line px-4 py-3 text-sm">
          <p className="font-semibold">{admin.fullName}</p>
          <p className="text-xs text-ink-muted">
            {ROLE_LABELS[admin.role]} · {admin.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/en" className="btn-sm border border-line bg-white">
              View site
            </Link>
            <form action={logout}>
              <button type="submit" className="btn-sm border border-line bg-white">
                <LogOut size={16} aria-hidden="true" /> Log out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-[999_1_560px] p-4 md:p-8">{children}</main>
    </div>
  );
}
