import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('ERROR: TURSO_DATABASE_URL is not defined in the environment variables.');
  process.exit(1);
}

console.log('Connecting to Turso database at:', url);

export const db = createClient({
  url,
  authToken
});

export default db;
