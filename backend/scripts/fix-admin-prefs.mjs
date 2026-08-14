import { Client, Users } from 'node-appwrite';
import 'dotenv/config';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);

async function run() {
  const list = await users.list();
  for (const u of list.users) {
    if (u.email === 'manasakrishnakumar0@gmail.com') {
      console.log('Found admin account:', u.$id);
      console.log('Current prefs:', JSON.stringify(u.prefs));
      await users.updatePrefs(u.$id, { role: 'owner', ownerId: u.$id });
      console.log('✅ Fixed! role:owner ownerId:', u.$id);
    }
    if (u.email === 'manasakrishnakumar14@gmail.com') {
      try {
        await users.delete(u.$id);
        console.log('🗑️  Deleted leftover worker account:', u.email);
      } catch (e) {
        console.log('Delete note:', e.message);
      }
    }
  }
  console.log('Done!');
}

run().catch(e => { console.error(e.message); process.exit(1); });
