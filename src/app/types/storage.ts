import { openDB, deleteDB, wrap, unwrap, IDBPDatabase, DBSchema } from 'idb';
import { Circle, NostrEventDocument, NostrNoteDocument, NostrProfileDocument, NostrRelayDocument, StateDocument } from '../services/interfaces';

/** Make sure you read and learn: https://github.com/jakearchibald/idb */

export function now() {
  return Math.floor(Date.now() / 1000);
}

interface NotesDB extends DBSchema {
  state: {
    value: StateDocument;
    key: number;
  };
  relays: {
    value: NostrRelayDocument;
    key: string;
  };
  circles: {
    value: Circle;
    key: number;
  };
  notes: {
    value: NostrNoteDocument;
    key: string;
  };
  events: {
    value: NostrEventDocument;
    key: string;
    indexes: { pubkey: string; created: number };
  };
  profiles: {
    value: NostrProfileDocument;
    key: string;
    indexes: { status: number };
  };
}

export class Storage {
  public db!: IDBPDatabase<NotesDB>;

  constructor(private name: string, private version: number) {}

  async open() {
    this.db = await openDB<NotesDB>(this.name, this.version, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        db.createObjectStore('relays', { keyPath: 'url' });
        db.createObjectStore('notes', { keyPath: 'id' });
        db.createObjectStore('circles', { keyPath: 'id' });
        db.createObjectStore('state', { keyPath: 'id' });

        const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
        eventsStore.createIndex('pubkey', 'pubkey');
        eventsStore.createIndex('created', 'created_at');

        const profilesStore = db.createObjectStore('profiles', { keyPath: 'pubkey' });
        profilesStore.createIndex('status', 'status');
      },
      blocked(currentVersion, blockedVersion, event) {
        // …
      },
      blocking(currentVersion, blockedVersion, event) {
        // …
      },
      terminated() {
        // …
      },
    });
  }

  close() {
    this.db.close();
  }

  async getState() {
    return this.db.get('state', 1);
  }

  async putState(value: StateDocument) {
    value.id = 1;
    value.modified = now();
    return this.db.put('state', value);
  }

  async getCircle(key: number) {
    return this.db.get('circles', key);
  }

  async getCircles() {
    return this.db.getAll('circles');
  }

  async putCircle(value: Circle) {
    value.modified = now();
    return this.db.put('circles', value);
  }

  async getProfile(key: string) {
    return this.db.get('profiles', key);
  }

  async putProfile(value: NostrProfileDocument) {
    value.modified = now();
    return this.db.put('profiles', value);
  }

  async getProfilesByStatus(status: number) {
    return this.db.getAllFromIndex('profiles', 'status', status);
  }

  async getEvent(key: string) {
    return this.db.get('events', key);
  }

  async putEvents(value: NostrEventDocument) {
    return this.db.put('events', value);
  }

  async getEventsByPubKey(pubkey: string, count?: number) {
    return this.db.getAllFromIndex('events', 'pubkey', pubkey, count);
  }

  async getEventsByCreated(pubkey: string, query: IDBKeyRange, count?: number) {
    return this.db.getAllFromIndex('events', 'created', query, count);
  }

  async getRelay(key: string) {
    return this.db.get('relays', key);
  }

  async getRelays() {
    return this.db.getAll('relays');
  }

  async putRelay(value: NostrRelayDocument) {
    value.modified = now();
    return this.db.put('relays', value);
  }

  async deleteCircle(key: number) {
    return this.db.delete('circles', key);
  }

  async deleteRelay(key: string) {
    return this.db.delete('relays', key);
  }

  async deleteRelays() {
    return this.db.clear(`relays`);
  }

  async delete() {
    await deleteDB(this.name, {
      blocked() {
        // …
      },
    });
  }
}
