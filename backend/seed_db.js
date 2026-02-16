const pool = require('./db');

const seedData = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Clear existing data
        await client.query('TRUNCATE TABLE projects, pocs, locations RESTART IDENTITY CASCADE');

        // Insert Locations
        const locResult = await client.query(`
      INSERT INTO locations (name, description, lat, lng) VALUES 
      ('Headquarters', 'Main administrative building', 38.8977, -77.0365),
      ('R&D Center', 'Research and Development facility', 37.7749, -122.4194),
      ('Manufacturing Plant', 'Primary production facility', 41.8781, -87.6298)
      RETURNING id, name
    `);

        const locations = locResult.rows;

        // Insert POCs
        for (const loc of locations) {
            await client.query(`
            INSERT INTO pocs (location_id, name, role, email, phone) VALUES 
            ($1, $2, $3, $4, $5),
            ($1, $6, $7, $8, $9)
        `, [
                loc.id,
                'John Doe', 'Facility Manager', 'john.doe@example.com', '555-0101',
                'Jane Smith', 'Security Cheif', 'jane.smith@example.com', '555-0102'
            ]);

            // Insert Projects
            await client.query(`
            INSERT INTO projects (location_id, name, description, is_top_5) VALUES 
            ($1, 'Solar Panel Upgrade', 'Installing 500kw solar array', true),
            ($1, 'HVAC Renovation', 'Replacing chillers in wing A', true),
            ($1, 'Security System Overhaul', 'Upgrading cameras and access control', false),
            ($1, 'Lobby Remodel', 'Modernizing the front entrance', true),
            ($1, 'Parking Lot Resurfacing', 'Asphalt repair and striping', false),
            ($1, 'Cafeteria Expansion', 'Adding 50 seats to the dining area', true),
            ($1, 'Network Infrastructure', 'Fiber optic backbone upgrade', true)
        `, [loc.id]);
        }

        await client.query('COMMIT');
        console.log('Seed data inserted successfully');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error seeding data', e);
    } finally {
        client.release();
    }
};

if (require.main === module) {
    seedData().then(() => process.exit(0));
}

module.exports = seedData;
