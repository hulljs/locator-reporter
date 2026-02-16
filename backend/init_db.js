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
        is_top_5 BOOLEAN DEFAULT false,
        status TEXT DEFAULT 'on-track',
        phase TEXT DEFAULT 'planning',
        start_date DATE,
        end_date DATE,
        percent_complete INTEGER DEFAULT 0,
        budget_planned DECIMAL DEFAULT 0,
        budget_actual DECIMAL DEFAULT 0
      );
    `);

        // Add columns to projects if they don't exist (for existing DBs)
        const projectCols = [
            ['status', "TEXT DEFAULT 'on-track'"],
            ['phase', "TEXT DEFAULT 'planning'"],
            ['start_date', 'DATE'],
            ['end_date', 'DATE'],
            ['percent_complete', 'INTEGER DEFAULT 0'],
            ['budget_planned', 'DECIMAL DEFAULT 0'],
            ['budget_actual', 'DECIMAL DEFAULT 0']
        ];
        for (const [col, type] of projectCols) {
            await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS ${col} ${type}`);
        }

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
        status TEXT DEFAULT 'active',
        allocation_pct INTEGER DEFAULT 100
      );
    `);

        // Add allocation_pct if missing
        await client.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS allocation_pct INTEGER DEFAULT 100`);

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

        // P1: Activity log
        await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        user_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // P2: Users
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // P3: Notifications
        await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        digest_frequency TEXT DEFAULT 'weekly',
        alert_overcommit BOOLEAN DEFAULT true,
        alert_status_change BOOLEAN DEFAULT true,
        alert_budget_threshold BOOLEAN DEFAULT true,
        budget_threshold_pct INTEGER DEFAULT 90
      );
    `);

        await client.query('COMMIT');
        console.log('Tables created successfully');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error creating tables', e);
    } finally {
        client.release();
    }
};

if (require.main === module) {
    createTables().then(() => process.exit(0));
}

module.exports = createTables;
