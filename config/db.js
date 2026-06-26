const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const connectDB = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Connecté à PostgreSQL (LeGourmet)');
    } catch (err) {
        console.error('❌ Erreur de connexion PostgreSQL:', err.message);
        process.exit(1);
    }
};

const getPool = () => pool;

const sql = {
    query: (text, params) => pool.query(text, params),
};

module.exports = { connectDB, getPool, sql, pool };