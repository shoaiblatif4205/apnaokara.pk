import { q } from '@/lib/db';
import { requireAdmin, ROLE_LABELS, type AdminRole } from '@/lib/admin/auth';
import { Badge, Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { createAdminUser, updateAdminUser } from './actions';

export const metadata = { title: 'Admin users' };

type Row = { id: string; email: string; full_name: string; role: AdminRole; is_active: boolean; last_sign_in_at: string | null };

const ROLE_HELP: Record<AdminRole, string> = {
  super_admin: 'Everything, including settings, prices and admin users',
  moderator: 'Approve / reject ads, payments and reports',
  blog_writer: 'Blog only',
  rishta_coordinator: 'Rishta profiles, photos and mediation (female coordinator)',
};

function RoleSelect({ id, value }: { id: string; value?: AdminRole }) {
  return (
    <select id={id} name="role" defaultValue={value ?? 'moderator'} className="admin-input">
      {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}

export default async function UsersPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const me = await requireAdmin();
  const rows = await q<Row>(`
    select a.id, u.email, a.full_name, a.role, a.is_active, u.last_sign_in_at
      from admin_users a join auth.users u on u.id = a.id
     order by a.is_active desc, a.created_at`);

  return (
    <>
      <PageHeader title="Admin users" description="People who can log in to this admin panel. Turn an account off instead of deleting it; its history stays." />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <Section title="Roles">
        <ul className="grid gap-2 text-sm md:grid-cols-2">
          {(Object.keys(ROLE_HELP) as AdminRole[]).map((r) => (
            <li key={r}>
              <span className="font-semibold">{ROLE_LABELS[r]}:</span> {ROLE_HELP[r]}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Accounts (${rows.length})`}>
        <div className="space-y-2">
          {rows.map((r) => (
            <form key={r.id} action={updateAdminUser} className="grid items-end gap-2 rounded-lg border border-line p-3 lg:grid-cols-[1fr_1fr_180px_1fr_auto_auto]">
              <input type="hidden" name="id" value={r.id} />
              <div className="text-sm">
                <p className="font-semibold">
                  {r.email} {r.id === me.id && <Badge tone="green">You</Badge>}
                </p>
                <p className="text-xs text-ink-muted">
                  Last login: {r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : 'never'}
                </p>
              </div>
              <Field label="Name" htmlFor={`n-${r.id}`}>
                <input id={`n-${r.id}`} name="full_name" defaultValue={r.full_name} className="admin-input" required />
              </Field>
              <Field label="Role" htmlFor={`r-${r.id}`}>
                <RoleSelect id={`r-${r.id}`} value={r.role} />
              </Field>
              <Field label="New password (optional)" htmlFor={`p-${r.id}`}>
                <input id={`p-${r.id}`} name="new_password" type="password" minLength={10} autoComplete="new-password" className="admin-input" />
              </Field>
              <Checkbox id={`a-${r.id}`} name="is_active" label="Active" defaultChecked={r.is_active} />
              <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">Save</SubmitButton>
            </form>
          ))}
        </div>
      </Section>

      <Section title="Add an admin user" description="Give the person their email and password yourself (WhatsApp or in person). They can be changed here any time.">
        <form action={createAdminUser} className="grid items-end gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_1fr_auto]">
          <Field label="Email" htmlFor="email">
            <input id="email" name="email" type="email" className="admin-input" required />
          </Field>
          <Field label="Full name" htmlFor="full_name">
            <input id="full_name" name="full_name" className="admin-input" required />
          </Field>
          <Field label="Role" htmlFor="role">
            <RoleSelect id="role" />
          </Field>
          <Field label="Password (10+ characters)" htmlFor="password">
            <input id="password" name="password" type="password" minLength={10} autoComplete="new-password" className="admin-input" required />
          </Field>
          <SubmitButton>Add user</SubmitButton>
        </form>
      </Section>
    </>
  );
}
