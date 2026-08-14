/**
 * cleanup-workers.mjs
 * Deletes ALL worker entries from the workers collection AND
 * deletes their Appwrite Auth accounts (so they can't log in).
 *
 * Run: node scripts/cleanup-workers.mjs
 * from the /backend folder (needs .env loaded).
 */

import { Client, Users, Databases, Query } from 'node-appwrite';
import 'dotenv/config';

const ADMIN_EMAIL = process.env.SMTP_USER || 'manasakrishnakumar0@gmail.com';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);

const DB_ID = process.env.APPWRITE_DATABASE_ID;
const WORKERS_COL = process.env.COLLECTION_WORKERS || 'workers';

async function run() {
  console.log('🧹 Starting worker cleanup...\n');

  // ── 1. Delete all docs from workers collection ──────────────────────────
  console.log('📋 Fetching workers collection entries...');
  const workerDocs = await databases.listDocuments(DB_ID, WORKERS_COL, [Query.limit(200)]);
  console.log(`   Found ${workerDocs.documents.length} entries`);

  for (const doc of workerDocs.documents) {
    await databases.deleteDocument(DB_ID, WORKERS_COL, doc.$id);
    console.log(`   ✅ Deleted worker doc: ${doc.name} (${doc.$id})`);
  }

  // ── 2. Delete worker Auth accounts (keep admin) ─────────────────────────
  console.log('\n👤 Fetching Appwrite Auth users...');
  const authUsers = await users.list([Query.limit(100)]);
  console.log(`   Found ${authUsers.users.length} auth accounts`);

  for (const u of authUsers.users) {
    if (u.email === ADMIN_EMAIL) {
      console.log(`   ⏭️  Skipping admin account: ${u.email}`);
      continue;
    }
    const prefs = u.prefs || {};
    if (prefs.role === 'worker') {
      await users.delete(u.$id);
      console.log(`   ✅ Deleted worker auth account: ${u.name} <${u.email}>`);
    } else {
      console.log(`   ⏭️  Skipping non-worker account: ${u.email} (role: ${prefs.role || 'owner'})`);
    }
  }

  console.log('\n✨ Cleanup complete! All test workers removed.');
  console.log('   Your admin account is untouched.');
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
