import { Badge } from './ui';

export function statusBadge(status: string, expiresAt: string | null) {
  if (status === 'approved' && expiresAt && new Date(expiresAt) <= new Date()) return <Badge>Expired</Badge>;
  const map: Record<string, [string, 'gray' | 'green' | 'orange' | 'red']> = {
    pending: ['Pending', 'orange'],
    approved: ['Live', 'green'],
    rejected: ['Rejected', 'red'],
    removed: ['Removed', 'red'],
    expired: ['Expired', 'gray'],
    sold: ['Sold', 'gray'],
  };
  const [label, tone] = map[status] ?? [status, 'gray'];
  return <Badge tone={tone}>{label}</Badge>;
}
