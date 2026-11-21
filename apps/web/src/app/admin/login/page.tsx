import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { getAdmin } from '@/lib/admin/auth';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { login } from './actions';

export const metadata = { title: 'Login' };
export const dynamic = 'force-dynamic';

const errors: Record<string, string> = {
  missing: 'Enter your email and password.',
  invalid: 'Email or password is wrong, or this account is not active.',
  locked: 'Too many wrong tries. Try again in 15 minutes.',
};

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  if (await getAdmin()) redirect('/admin');
  const error = searchParams.error ? errors[searchParams.error] : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="flex justify-center">
          <Logo locale="en" />
        </div>
        <h1 className="mt-4 text-center text-lg font-bold">Admin panel</h1>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <form action={login} className="mt-4 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required className="admin-input mt-1" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="admin-input mt-1" />
          </div>
          <SubmitButton className="btn-primary w-full">Log in</SubmitButton>
        </form>
      </div>
    </main>
  );
}
