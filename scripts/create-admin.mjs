// Create (or reset) the first Super Admin for LOCAL development.
// The database must be running (npm run db:start).
//
//   npm run admin:create                         -> admin@apnaokara.local, random password
//   npm run admin:create -- you@example.com "Your Name"
//
// The email and generated password are saved in apps/web/.env.local
// (LOCAL_ADMIN_EMAIL / LOCAL_ADMIN_PASSWORD). That file is never committed.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, 'apps', 'web', '.env.local');
if (!existsSync(envPath)) throw new Error('apps/web/.env.local not found');

let env = readFileSync(envPath, 'utf8');
const dbUrl = env.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length).trim();
if (!dbUrl) throw new Error('DATABASE_URL missing in apps/web/.env.local');

const email = (process.argv[2] || 'admin@apnaokara.local').toLowerCase();
const fullName = process.argv[3] || 'Owner';
const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const password = Array.from({ length: 16 }, () => alphabet[randomInt(alphabet.length)]).join('');
const hash = bcrypt.hashSync(password, 10);

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();
try {
  await client.query('begin');
  const existing = await client.query('select id from auth.users where email = $1', [email]);
  let id;
  if (existing.rowCount) {
    id = existing.rows[0].id;
    await client.query('update auth.users set encrypted_password = $1 where id = $2', [hash, id]);
  } else {
    const ins = await client.query(
      'insert into auth.users (id, email, encrypted_password) values (gen_random_uuid(), $1, $2) returning id',
      [email, hash],
    );
    id = ins.rows[0].id;
  }
  await client.query(
    `insert into admin_users (id, full_name, role, is_active) values ($1, $2, 'super_admin', true)
     on conflict (id) do update set role = 'super_admin', is_active = true, full_name = excluded.full_name`,
    [id, fullName],
  );
  await client.query(
    `insert into activity_log (admin_id, action, entity, entity_id) values ($1, 'admin.create_super_admin', 'admin_users', $2)`,
    [id, String(id)],
  );
  await client.query('commit');
} catch (e) {
  await client.query('rollback');
  throw e;
} finally {
  await client.end();
}

// Save to .env.local (replace old values)
env = env
  .split(/\r?\n/)
  .filter((l) => !l.startsWith('LOCAL_ADMIN_EMAIL=') && !l.startsWith('LOCAL_ADMIN_PASSWORD='))
  .join('\n')
  .replace(/\n*$/, '\n');
env += `LOCAL_ADMIN_EMAIL=${email}\nLOCAL_ADMIN_PASSWORD=${password}\n`;
writeFileSync(envPath, env, 'utf8');

console.log(`Super Admin ready: ${email}`);
console.log('Login details saved in apps/web/.env.local (LOCAL_ADMIN_EMAIL / LOCAL_ADMIN_PASSWORD).');
console.log('Open http://localhost:3000/admin/login');
