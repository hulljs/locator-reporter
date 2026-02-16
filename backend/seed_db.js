const pool = require('./db');

const seedData = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Clear existing data
        await client.query('TRUNCATE TABLE reports, assignments, people, projects, pocs, metrics, locations RESTART IDENTITY CASCADE');

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
                'Jane Smith', 'Security Chief', 'jane.smith@example.com', '555-0102'
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

        // Insert People
        const peopleResult = await client.query(`
      INSERT INTO people (name, role, email, phone, organization, skills) VALUES
      ('Alice Chen', 'Program Manager', 'alice.chen@example.com', '555-1001', 'Operations', 'Project Management, Budgeting, Stakeholder Relations'),
      ('Bob Martinez', 'Lead Engineer', 'bob.martinez@example.com', '555-1002', 'Engineering', 'Structural Analysis, CAD, HVAC Systems'),
      ('Carol Washington', 'Safety Director', 'carol.washington@example.com', '555-1003', 'Safety & Compliance', 'OSHA Compliance, Risk Assessment, Training'),
      ('David Kim', 'Research Scientist', 'david.kim@example.com', '555-1004', 'R&D', 'Materials Science, Testing Protocols, Data Analysis'),
      ('Elena Rossi', 'Facilities Coordinator', 'elena.rossi@example.com', '555-1005', 'Facilities', 'Maintenance Planning, Vendor Management, Budgeting'),
      ('Frank Okafor', 'IT Director', 'frank.okafor@example.com', '555-1006', 'IT', 'Network Infrastructure, Cybersecurity, Cloud Architecture'),
      ('Grace Liu', 'Financial Analyst', 'grace.liu@example.com', '555-1007', 'Finance', 'Cost Analysis, Forecasting, Procurement'),
      ('Henry Patel', 'Construction Manager', 'henry.patel@example.com', '555-1008', 'Construction', 'General Contracting, Scheduling, Quality Control')
      RETURNING id, name
    `);

        const people = peopleResult.rows;

        // Insert Assignments (people assigned to locations)
        // Alice Chen -> HQ (Program Manager) and R&D (Oversight)
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status) VALUES
      ($1, $2, 'Program Lead', '2025-01-15', 'active'),
      ($1, $3, 'Program Oversight', '2025-03-01', 'active')
    `, [people[0].id, locations[0].id, locations[1].id]);

        // Bob Martinez -> HQ and Manufacturing
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status) VALUES
      ($1, $2, 'Lead Structural Engineer', '2024-06-01', 'active'),
      ($1, $3, 'Engineering Consultant', '2025-02-01', 'active')
    `, [people[1].id, locations[0].id, locations[2].id]);

        // Carol Washington -> All three locations
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status) VALUES
      ($1, $2, 'Safety Lead', '2024-01-01', 'active'),
      ($1, $3, 'Safety Auditor', '2024-01-01', 'active'),
      ($1, $4, 'Safety Inspector', '2024-01-01', 'active')
    `, [people[2].id, locations[0].id, locations[1].id, locations[2].id]);

        // David Kim -> R&D only
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status) VALUES
      ($1, $2, 'Principal Researcher', '2024-03-15', 'active')
    `, [people[3].id, locations[1].id]);

        // Elena Rossi -> HQ and Manufacturing
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status) VALUES
      ($1, $2, 'Facilities Lead', '2024-08-01', 'active'),
      ($1, $3, 'Facilities Coordinator', '2025-01-10', 'active')
    `, [people[4].id, locations[0].id, locations[2].id]);

        // Frank Okafor -> All locations
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status) VALUES
      ($1, $2, 'IT Director', '2024-01-01', 'active'),
      ($1, $3, 'Network Oversight', '2024-06-01', 'active'),
      ($1, $4, 'Systems Administrator', '2024-06-01', 'active')
    `, [people[5].id, locations[0].id, locations[1].id, locations[2].id]);

        // Grace Liu -> HQ only
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status) VALUES
      ($1, $2, 'Budget Analyst', '2025-01-01', 'active')
    `, [people[6].id, locations[0].id]);

        // Henry Patel -> R&D and Manufacturing
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status) VALUES
      ($1, $2, 'Construction Lead', '2024-09-01', 'active'),
      ($1, $3, 'Site Supervisor', '2025-01-15', 'active')
    `, [people[7].id, locations[1].id, locations[2].id]);

        // Insert Reports
        await client.query(`
      INSERT INTO reports (location_id, author_id, title, body, report_type, report_date) VALUES
      ($1, $2, 'Q4 2025 Headquarters Status', 'All projects on track. Solar panel installation phase 2 begins next month. HVAC renovation in wing A is 80% complete. Budget utilization at 92% for the quarter.', 'quarterly', '2025-12-15'),
      ($1, $3, 'Safety Inspection - December 2025', 'Annual safety inspection completed. All fire suppression systems operational. Emergency exits properly marked. Two minor findings: replacement of exit signs in parking garage B2 and updated safety placards in the cafeteria.', 'inspection', '2025-12-20'),
      ($1, $4, 'Network Upgrade Completion Report', 'Fiber optic backbone upgrade completed across all floors. Bandwidth increased from 1Gbps to 10Gbps. All access points upgraded to WiFi 6E. Remaining: server room cooling optimization.', 'sitrep', '2026-01-10'),
      ($5, $6, 'R&D Lab Expansion Proposal', 'Proposing expansion of Lab C to accommodate new materials testing equipment. Estimated cost: $2.1M. Timeline: 6 months. This expansion would increase testing throughput by 40% and support the upcoming DoD contract requirements.', 'assessment', '2026-01-05'),
      ($5, $7, 'R&D Quarterly Research Summary', 'Three active research programs progressing well. Advanced materials project achieved key milestone - new composite passed stress testing. AI-driven climate control prototype ready for Phase 2 trials.', 'quarterly', '2025-12-30'),
      ($8, $9, 'Manufacturing Plant Quarterly Review', 'Production output steady at 94% capacity. Assembly Line B showing signs of wear - overhaul recommended for Q2. Safety certification renewal due March 2026. Staff morale high following cafeteria expansion completion.', 'quarterly', '2025-12-28'),
      ($8, $3, 'Manufacturing Safety Audit', 'Comprehensive safety audit of all production lines completed. Assembly Line B flagged for potential mechanical failure risks. Recommended immediate inspection of conveyor belt tensioners. All chemical storage areas compliant.', 'inspection', '2026-01-18'),
      ($8, $10, 'Packaging Automation Feasibility Study', 'Analysis of packaging line automation options complete. Recommended solution: robotic palletizing system. ROI expected within 18 months. Would reduce manual handling injuries by an estimated 60% and increase throughput by 25%.', 'assessment', '2026-02-01')
    `, [
            locations[0].id, people[0].id, people[2].id, people[5].id,
            locations[1].id, people[3].id, people[7].id,
            locations[2].id, people[4].id, people[1].id
        ]);

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
