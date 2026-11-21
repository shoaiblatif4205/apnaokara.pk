import { q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { SAMPLE_ADS } from '@/lib/samples.data';
import { Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { importSamples, removeSamples } from './actions';

export const metadata = { title: 'Sample ads' };
export const maxDuration = 60;

export default async function SamplesPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin([]);
  const s = await q1<{ live: number; total: number }>(
    `select count(*) filter (where status = 'approved' and (expires_at is null or expires_at > now()))::int as live, count(*)::int as total from listings where is_sample`,
  );
  const live = s?.live ?? 0;
  return (
    <>
      <PageHeader
        title="Sample ads"
        description="Example ads so new visitors see a lively site. Each one shows a blue “Sample ad” label, has no call / WhatsApp buttons, is hidden from Google, and ends by itself after 30 days (services and businesses 60). Photos: Pexels (free to use)."
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <Section title={`On the site now: ${live} of ${SAMPLE_ADS.length}`}>
        <div className="flex flex-wrap gap-3">
          {live < SAMPLE_ADS.length && (
            <form action={importSamples}>
              <SubmitButton>{live ? 'Add the next sample ads' : 'Add sample ads'}</SubmitButton>
            </form>
          )}
          {live > 0 && (
            <form action={removeSamples}>
              <SubmitButton className="btn-danger" confirm="Take all sample ads off the site?">
                Remove all sample ads
              </SubmitButton>
            </form>
          )}
        </div>
        <p className="mt-3 text-sm text-ink-muted">Each click adds up to 12 ads (about 30 seconds). Click until all {SAMPLE_ADS.length} are added. Remove them once real ads start coming in.</p>
      </Section>
    </>
  );
}
