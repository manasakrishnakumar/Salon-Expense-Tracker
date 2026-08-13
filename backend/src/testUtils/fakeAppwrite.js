/**
 * A small in-memory stand-in for the pieces of the `node-appwrite` SDK this
 * backend actually uses (Client, Account, Databases, Users, ID, Query).
 *
 * Why: the app talks to Appwrite through the real SDK everywhere (by
 * design — see config/appwrite.js), so testing the HTTP layer (routing,
 * requireAuth, requireRole, validation, controllers) without either (a)
 * hitting live Appwrite from every test run, or (b) restructuring the app
 * around an injected repository interface just to make it testable, means
 * swapping out the SDK itself at the module level.
 *
 * Usage in a test file (must run before importing app.js):
 *   const fake = createFakeAppwrite();
 *   jest.unstable_mockModule('node-appwrite', () => fake);
 *   const { createApp } = await import('../../app.js');
 *
 * `ID.unique()` deliberately returns the same `'unique()'` sentinel the
 * real SDK returns — Appwrite's server treats that string as "generate an
 * id for me", and this fake's createDocument/create mimic that.
 */
export function createFakeAppwrite() {
  const usersById = new Map(); // id -> { $id, email, name, prefs }
  const sessionsByJwt = new Map(); // jwt -> userId
  const collections = new Map(); // collectionId -> Map(docId -> doc)

  let idCounter = 0;
  const genId = (prefix = 'id') => `${prefix}_${++idCounter}`;

  function collection(collectionId) {
    if (!collections.has(collectionId)) collections.set(collectionId, new Map());
    return collections.get(collectionId);
  }

  function notFound(message) {
    const err = new Error(message);
    err.code = 404;
    return err;
  }

  class Client {
    setEndpoint() { return this; }
    setProject() { return this; }
    setKey() { return this; }
    setJWT(jwt) { this._jwt = jwt; return this; }
  }

  class Account {
    constructor(client) { this.client = client; }
    async get() {
      const userId = sessionsByJwt.get(this.client?._jwt);
      if (!userId) {
        const err = new Error('Invalid or expired JWT');
        err.code = 401;
        throw err;
      }
      const user = usersById.get(userId);
      return { $id: user.$id, email: user.email, name: user.name };
    }
  }

  class Databases {
    async listDocuments(_dbId, collectionId, queries = []) {
      let docs = Array.from(collection(collectionId).values());
      for (const q of queries) {
        if (q.type === 'equal') docs = docs.filter((d) => d[q.field] === q.value);
      }
      const orderQ = queries.find((q) => q.type === 'orderDesc' || q.type === 'orderAsc');
      if (orderQ) {
        docs = [...docs].sort((a, b) => {
          const av = a[orderQ.field];
          const bv = b[orderQ.field];
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return orderQ.type === 'orderDesc' ? -cmp : cmp;
        });
      }
      const limitQ = queries.find((q) => q.type === 'limit');
      if (limitQ) docs = docs.slice(0, limitQ.n);
      return { total: docs.length, documents: docs };
    }

    async createDocument(dbId, collectionId, id, data) {
      const now = new Date().toISOString();
      const $id = id === 'unique()' ? genId('doc') : id;
      const doc = {
        $id, $createdAt: now, $updatedAt: now,
        $collectionId: collectionId, $databaseId: dbId, $permissions: [],
        ...data,
      };
      collection(collectionId).set($id, doc);
      return doc;
    }

    async getDocument(_dbId, collectionId, id) {
      const doc = collection(collectionId).get(id);
      if (!doc) throw notFound(`Document '${id}' not found in '${collectionId}'`);
      return doc;
    }

    async updateDocument(dbId, collectionId, id, data) {
      const doc = await this.getDocument(dbId, collectionId, id);
      Object.assign(doc, data, { $updatedAt: new Date().toISOString() });
      return doc;
    }

    async deleteDocument(_dbId, collectionId, id) {
      collection(collectionId).delete(id);
      return {};
    }

    // Schema-management methods (used by scripts/setupAppwriteSchema.js,
    // not by any app route) — not needed for API integration tests.
  }

  class Users {
    async getPrefs(userId) {
      const user = usersById.get(userId);
      if (!user || !user.prefs || Object.keys(user.prefs).length === 0) {
        throw notFound(`No prefs for user '${userId}'`);
      }
      return user.prefs;
    }

    async updatePrefs(userId, prefs) {
      const user = usersById.get(userId);
      if (!user) throw notFound(`User '${userId}' not found`);
      user.prefs = { ...(user.prefs || {}), ...prefs };
      return user.prefs;
    }

    async create(id, email, _phone, _password, name) {
      const $id = id === 'unique()' ? genId('user') : id;
      const user = { $id, email, name, prefs: {} };
      usersById.set($id, user);
      return { $id, email, name };
    }

    async createSession(userId) {
      if (!usersById.has(userId)) throw notFound(`User '${userId}' not found`);
      return { $id: genId('session') };
    }

    async createJWT(userId) {
      const jwt = genId('jwt');
      sessionsByJwt.set(jwt, userId);
      return { jwt };
    }

    async delete(userId) {
      usersById.delete(userId);
    }
  }

  const ID = { unique: () => 'unique()' };

  const Query = {
    equal: (field, value) => ({ type: 'equal', field, value }),
    orderDesc: (field) => ({ type: 'orderDesc', field }),
    orderAsc: (field) => ({ type: 'orderAsc', field }),
    limit: (n) => ({ type: 'limit', n }),
  };

  // --- Test-only helpers (not part of the real SDK surface) ---

  /** Seeds a ready-to-use identity (e.g. an owner with prefs already set). */
  function _seedIdentity({ id, email = `${id}@test.local`, name = id, prefs = {} }) {
    usersById.set(id, { $id: id, email, name, prefs });
  }

  /** Mints a JWT for an already-seeded (or already-created) user id. */
  function _mintJwtFor(userId) {
    const jwt = genId('jwt');
    sessionsByJwt.set(jwt, userId);
    return jwt;
  }

  function _reset() {
    usersById.clear();
    sessionsByJwt.clear();
    collections.clear();
    idCounter = 0;
  }

  return { Client, Account, Databases, Users, ID, Query, _seedIdentity, _mintJwtFor, _reset };
}
