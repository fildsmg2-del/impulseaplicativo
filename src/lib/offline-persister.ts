import { openDB, IDBPDatabase } from 'idb';
import { Persister } from '@tanstack/react-query-persist-client';

/**
 * Interface para o banco de dados de cache do TanStack Query
 */
interface QueryCacheDB {
  'react-query-cache': {
    key: string;
    value: any;
  };
}

const DB_NAME = 'impulse-query-cache';
const STORE_NAME = 'react-query-cache';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<QueryCacheDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<QueryCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Cria um persister baseado em IndexedDB para o TanStack Query.
 * Mais robusto que localStorage para grandes volumes de dados no Android.
 */
export const createIDBPersister = (id = 'main'): Persister => {
  return {
    persistClient: async (client) => {
      try {
        const db = await getDB();
        await db.put(STORE_NAME, client, id);
      } catch (error) {
        console.error('[IDBPersister] Failed to persist client:', error);
      }
    },
    restoreClient: async () => {
      try {
        const db = await getDB();
        return await db.get(STORE_NAME, id);
      } catch (error) {
        console.error('[IDBPersister] Failed to restore client:', error);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        const db = await getDB();
        await db.delete(STORE_NAME, id);
      } catch (error) {
        console.error('[IDBPersister] Failed to remove client:', error);
      }
    },
  };
};
