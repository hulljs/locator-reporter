const pool = require('./db');

const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        lat DECIMAL NOT NULL,
        lng DECIMAL NOT NULL
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS pocs (
        id SERIAL PRIMARY KEY,
        location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT,
        email TEXT,
        phone TEXT
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        is_top_5 BOOLEAN DEFAULT false
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
        report_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT,
        email TEXT,
        phone TEXT,
        organization TEXT,
        skills TEXT
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
        location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
        role_at_location TEXT,
        start_date DATE,
        end_date DATE,
        status TEXT DEFAULT 'active'
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        body TEXT,
        report_type TEXT DEFAULT 'general',
        report_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query('COMMIT');
        console.log('Tables created successfully');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error creating tables', e);
    } finally {
        client.release();
        // Do not close pool here as this might run inside the app or separately
    }
};

if (require.main === module) {
    createTables().then(() => process.exit(0));
}

module.exports = createTables;
