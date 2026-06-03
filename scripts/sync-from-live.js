/**
 * Pull the live production dashboard data into the local database.
 *
 * Source of truth is the public, read-only API of the deployed tracker.
 * All three datasets (valid commits, node stats, block producers) plus the
 * last-sync timestamp are fetched and loaded into whatever DATABASE_URL points
 * at — intended for the local Postgres in ./.localpg (port 5433).
 *
 * Usage:
 *   node scripts/sync-from-live.js
 *   LIVE_BASE=https://devnet-status.gcp.o1test.net node scripts/sync-from-live.js
 */
const { Client } = require('pg');
require('dotenv').config();

const BASE = (process.env.LIVE_BASE || 'https://devnet-status.gcp.o1test.net').replace(/\/$/, '');

async function getJSON(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (/neon\.tech|aws\.|\.gcp\./.test(dbUrl)) {
    throw new Error(`Refusing to write: DATABASE_URL looks remote (${dbUrl.split('@')[1] || dbUrl}). Point it at local Postgres first.`);
  }
  console.log(`Source : ${BASE}`);
  console.log(`Target : ${dbUrl.split('@')[1] || dbUrl}`);

  console.log('Fetching live datasets...');
  const [commits, stats, producers, lastSync] = await Promise.all([
    getJSON('/valid-commits'),
    getJSON('/submit/stats'),
    getJSON('/block-producers'),
    getJSON('/block-producers/last-sync').catch(() => ({ lastSync: null })),
  ]);
  console.log(`  valid_commits   : ${commits.length}`);
  console.log(`  node_stats      : ${stats.length}`);
  console.log(`  block_producers : ${producers.length}`);
  console.log(`  last_sync       : ${lastSync.lastSync}`);

  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query('TRUNCATE node_stats, block_producers, valid_commits, sync_metadata RESTART IDENTITY');

    // valid_commits
    for (const v of commits) {
      await c.query(
        'INSERT INTO valid_commits (hash, label, created_at) VALUES ($1,$2,$3) ON CONFLICT (hash) DO NOTHING',
        [v.hash, v.label ?? null, v.createdAt ? new Date(v.createdAt) : new Date()]
      );
    }

    // node_stats (peer_id is unique; live API omits block_producer_public_key when null)
    for (const s of stats) {
      await c.query(
        `INSERT INTO node_stats
           (max_observed_block_height, commit_hash, chain_id, peer_id, peer_count, timestamp, block_producer_public_key, upgraded)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (peer_id) DO NOTHING`,
        [s.max_observed_block_height, s.commit_hash, s.chain_id, s.peer_id, s.peer_count,
         new Date(s.timestamp), s.block_producer_public_key ?? null, !!s.upgraded]
      );
    }

    // block_producers — multi-row batched insert
    const BATCH = 1000;
    for (let i = 0; i < producers.length; i += BATCH) {
      const batch = producers.slice(i, i + BATCH);
      const values = [];
      const params = [];
      batch.forEach((p, j) => {
        const o = j * 7;
        values.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6},$${o+7},NOW())`);
        params.push(p.public_key, p.total_stake, p.num_delegators, p.is_active,
                    p.percent_total_stake, p.percent_total_active_stake, !!p.upgraded);
      });
      await c.query(
        `INSERT INTO block_producers
           (public_key, total_stake, num_delegators, is_active, percent_total_stake, percent_total_active_stake, upgraded, updated_at)
         VALUES ${values.join(',')} ON CONFLICT (public_key) DO NOTHING`,
        params
      );
      process.stdout.write(`\r  block_producers inserted ${Math.min(i + BATCH, producers.length)}/${producers.length}`);
    }
    process.stdout.write('\n');

    // sync_metadata
    if (lastSync.lastSync) {
      await c.query(
        `INSERT INTO sync_metadata (key, value, updated_at) VALUES ($1,$2,$3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        ['block_producers_last_sync', lastSync.lastSync, new Date(lastSync.lastSync)]
      );
    }

    const counts = await c.query(`
      SELECT 'valid_commits' t, count(*)::int n FROM valid_commits
      UNION ALL SELECT 'node_stats', count(*)::int FROM node_stats
      UNION ALL SELECT 'block_producers', count(*)::int FROM block_producers
      UNION ALL SELECT 'sync_metadata', count(*)::int FROM sync_metadata`);
    console.log('Done. Local row counts:');
    for (const r of counts.rows) console.log(`  ${r.t.padEnd(16)} ${r.n}`);
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
