// Runs supabase/schema.sql against an embedded Postgres, with a stand-in for Supabase's auth schema,
// and checks what each signed-in person can and can't do. Needs no project or credentials.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dailyTable, rankGame } from '../src/social/standings';

const ann = '00000000-0000-0000-0000-00000000000a', bea = '00000000-0000-0000-0000-00000000000b', cal = '00000000-0000-0000-0000-00000000000c';
const today = Math.floor(Date.now() / 86_400_000);
let checks = 0, failures = 0;
function expect(label: string, passed: boolean) {
  checks += 1;
  if (passed) return;
  failures += 1;
  console.error(`FAILED ${label}`);
}

function standings() {
  const names = { a: 'Ann', b: 'Bea', c: 'Cal' };
  const results = [
    { user_id: 'a', game: 'word', score: 4, label: '3/6' }, { user_id: 'b', game: 'word', score: 4, label: '3/6' }, { user_id: 'c', game: 'word', score: 1, label: '6/6' },
    { user_id: 'b', game: 'zip', score: -30, label: '0:30' }, { user_id: 'a', game: 'zip', score: -45, label: '0:45' },
    { user_id: 'c', game: 'sudoku', score: -60, label: '1:00' },
  ];
  const word = rankGame(results, names, 'word');
  expect('a tie shares a rank', word[0].rank === 1 && word[1].rank === 1 && word[2].rank === 3);
  const table = dailyTable(results, names);
  expect('the table counts wins first', table[0].name === 'Bea' && table[0].wins === 2 && table[1].name === 'Ann' && table[1].wins === 1);
  expect('a game nobody else played is not a win', table[2].name === 'Cal' && table[2].wins === 0 && table[2].played === 2);
}

async function main() {
  standings();
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; grant usage on schema auth to authenticated, anon;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user', true), '')::uuid $$;
    grant usage on schema public to authenticated, anon;
    alter default privileges in schema public grant all on tables to authenticated, anon;
  `);
  await db.exec(readFileSync(join(__dirname, '../supabase/schema.sql'), 'utf8'));
  await db.exec(`insert into auth.users values ('${ann}'), ('${bea}'), ('${cal}');`);

  const as = async <T,>(user: string | null, sql: string) => {
    await db.exec(`reset role; select set_config('test.user', '${user ?? ''}', false); set role ${user ? 'authenticated' : 'anon'};`);
    try { return { rows: (await db.query<T>(sql)).rows, error: null as string | null }; } catch (error) { return { rows: [] as T[], error: (error as Error).message }; } finally { await db.exec('reset role;'); }
  };
  const refused = async (label: string, user: string | null, sql: string) => expect(label, (await as(user, sql)).error !== null);
  const allowed = async (label: string, user: string | null, sql: string) => {
    const { error } = await as(user, sql);
    if (error) console.error(`  ${label}: ${error}`);
    expect(label, error === null);
  };
  const count = async (user: string, sql: string) => (await as<{ n: number }>(user, `select count(*)::int as n from ${sql}`)).rows[0]?.n ?? -1;
  const post = (user: string, game: string, score: number, day = today) => `insert into public.results (user_id, day, game, score, label) values ('${user}', ${day}, '${game}', ${score}, 'x')`;

  await allowed('creates own profile', ann, `insert into public.profiles (id, name) values ('${ann}', 'Ann')`);
  await allowed('second profile', bea, `insert into public.profiles (id, name) values ('${bea}', 'Bea')`);
  await allowed('third profile', cal, `insert into public.profiles (id, name) values ('${cal}', 'Cal')`);
  await refused('cannot create a profile for someone else', ann, `insert into public.profiles (id, name) values ('${bea}', 'Fake')`);
  await refused('a one-letter name is refused', ann, `update public.profiles set name = 'A' where id = '${ann}'`);
  await allowed('renames self', ann, `update public.profiles set name = 'Annie' where id = '${ann}'`);
  await refused('cannot rewrite own friend code', ann, `update public.profiles set friend_code = 'AAAAAAAA' where id = '${ann}'`);
  await as(ann, `update public.profiles set name = 'Hacked' where id = '${bea}'`);
  expect('cannot rename someone else', (await db.query<{ name: string }>(`select name from public.profiles where id = '${bea}'`)).rows[0].name === 'Bea');

  expect('strangers are invisible', await count(ann, 'public.profiles') === 1);
  await allowed('posts today', bea, post(bea, 'word', 4));
  await refused('cannot post for someone else', ann, post(bea, 'zip', 1));
  await refused('cannot post a past day', ann, post(ann, 'word', 6, today - 1));
  await refused('cannot post a future day', ann, post(ann, 'word', 6, today + 1));
  await refused('a game must exist', ann, post(ann, 'chess', 6));
  await refused('a result cannot be posted twice', bea, post(bea, 'word', 6));
  await as(bea, `update public.results set score = 6 where user_id = '${bea}'`);
  expect('a result cannot be edited', (await db.query<{ score: number }>('select score from public.results')).rows[0].score === 4);
  await as(bea, `delete from public.results where user_id = '${bea}'`);
  expect('a result cannot be deleted', (await db.query('select 1 from public.results')).rows.length === 1);
  expect('a stranger cannot read results', await count(ann, 'public.results') === 0);

  const code = (await db.query<{ friend_code: string }>(`select friend_code from public.profiles where id = '${bea}'`)).rows[0].friend_code;
  const own = (await db.query<{ friend_code: string }>(`select friend_code from public.profiles where id = '${ann}'`)).rows[0].friend_code;
  expect('codes are eight characters', /^[0-9A-F]{8}$/.test(code));
  await refused('a wrong code is refused', ann, `select public.add_friend('ZZZZZZZZ')`);
  await refused('your own code is refused', ann, `select public.add_friend('${own}')`);
  await refused('signed-out callers cannot add friends', null, `select public.add_friend('${code}')`);
  await refused('friendships cannot be written directly', ann, `insert into public.friends (user_id, friend_id) values ('${ann}', '${cal}')`);
  const added = await as<{ add_friend: string }>(ann, `select public.add_friend('${code.toLowerCase()}')`);
  expect('adds by code in any case and returns the name', added.rows[0]?.add_friend === 'Bea');
  await allowed('adding twice is harmless', ann, `select public.add_friend('${code}')`);
  expect('friendship is on both sides', await count(ann, 'public.friends') === 1 && await count(bea, 'public.friends') === 1);
  expect('a friend can read results', await count(ann, 'public.results') === 1);
  expect('a friend can read the profile', await count(ann, 'public.profiles') === 2);
  expect('a third person still sees nothing', await count(cal, 'public.results') === 0 && await count(cal, 'public.profiles') === 1);

  await allowed('removes a friend', bea, `select public.remove_friend('${ann}')`);
  expect('removal clears both sides', await count(ann, 'public.friends') === 0 && await count(bea, 'public.friends') === 0);
  expect('results hide again after removal', await count(ann, 'public.results') === 0);

  await refused('signed-out callers cannot delete accounts', null, `select public.delete_account()`);
  await allowed('deletes own account', bea, `select public.delete_account()`);
  const left = await db.query(`select 1 from public.results union all select 1 from public.profiles where id = '${bea}' union all select 1 from auth.users where id = '${bea}'`);
  expect('deleting an account removes everything of theirs', left.rows.length === 0);
  expect('others are untouched', (await db.query('select 1 from auth.users')).rows.length === 2);

  console.log(`${checks - failures} of ${checks} account and friend rules hold`);
  process.exit(failures > 0 ? 1 : 0);
}
void main();
