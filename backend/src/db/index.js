import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configure the connection pool from environment variables
const pool = new Pool({
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});

// Log unexpected errors on idle pool clients
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

/**
 * Execute a parameterized query against the database.
 * @param {string} text   - SQL query string
 * @param {Array}  params - Query parameters
 * @returns {Promise}     - pg QueryResult
 */
export const query = (text, params) => pool.query(text, params);

export default pool;
