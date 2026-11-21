import { NextResponse, type NextRequest } from 'next/server';
import { runJobs } from '@/lib/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Hourly jobs for the live site (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>").
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Not allowed' }, { status: 401 });
  }
  return NextResponse.json(await runJobs());
}
