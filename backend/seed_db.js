const pool = require('./db');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Clear existing data
        await client.query('TRUNCATE TABLE notification_preferences, notifications, users, activity_log, reports, assignments, people, projects, pocs, metrics, locations RESTART IDENTITY CASCADE');

        // ===== Locations =====
        const locResult = await client.query(`
      INSERT INTO locations (name, description, lat, lng) VALUES
      ('Headquarters', 'Main administrative building', 38.8977, -77.0365),
      ('R&D Center', 'Research and Development facility', 37.7749, -122.4194),
      ('Manufacturing Plant', 'Primary production facility', 41.8781, -87.6298)
      RETURNING id, name
    `);
        const locations = locResult.rows;

        // ===== POCs =====
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
        }

        // ===== Projects (with status, phase, dates, budget) =====
        // HQ projects
        await client.query(`
      INSERT INTO projects (location_id, name, description, is_top_5, status, phase, start_date, end_date, percent_complete, budget_planned, budget_actual) VALUES
      ($1, 'Solar Panel Upgrade', 'Installing 500kw solar array on south wing', true, 'on-track', 'construction', '2025-03-01', '2026-06-30', 65, 1200000, 780000),
      ($1, 'HVAC Renovation', 'Replacing chillers and air handlers in wing A', true, 'on-track', 'construction', '2025-01-15', '2025-12-31', 80, 850000, 720000),
      ($1, 'Security System Overhaul', 'Upgrading cameras and access control', false, 'at-risk', 'procurement', '2025-06-01', '2026-03-31', 25, 450000, 180000),
      ($1, 'Lobby Remodel', 'Modernizing the front entrance and reception', true, 'behind', 'design', '2025-09-01', '2026-04-30', 15, 600000, 120000),
      ($1, 'Parking Lot Resurfacing', 'Asphalt repair and striping', false, 'complete', 'closeout', '2025-04-01', '2025-10-15', 100, 200000, 195000),
      ($1, 'Cafeteria Expansion', 'Adding 50 seats to the dining area', true, 'on-track', 'construction', '2025-05-01', '2026-01-31', 70, 350000, 260000),
      ($1, 'Network Infrastructure', 'Fiber optic backbone upgrade', true, 'complete', 'closeout', '2025-02-01', '2025-11-30', 100, 500000, 485000)
    `, [locations[0].id]);

        // R&D projects
        await client.query(`
      INSERT INTO projects (location_id, name, description, is_top_5, status, phase, start_date, end_date, percent_complete, budget_planned, budget_actual) VALUES
      ($1, 'Lab C Expansion', 'New materials testing equipment wing', true, 'on-track', 'design', '2025-08-01', '2026-08-31', 20, 2100000, 420000),
      ($1, 'AI Climate Control', 'AI-driven HVAC optimization prototype', true, 'on-track', 'construction', '2025-04-01', '2026-02-28', 55, 380000, 210000),
      ($1, 'Clean Room Upgrade', 'ISO Class 5 clean room conversion', false, 'at-risk', 'procurement', '2025-07-01', '2026-05-31', 30, 750000, 300000),
      ($1, 'Solar Panel Upgrade', 'Rooftop 200kw installation', true, 'on-track', 'planning', '2026-01-01', '2026-09-30', 5, 600000, 30000),
      ($1, 'Data Center Migration', 'Moving to on-prem hybrid cloud', true, 'on-track', 'construction', '2025-06-01', '2026-03-31', 45, 900000, 405000),
      ($1, 'Cafeteria Expansion', 'Expanding break room and kitchen', false, 'behind', 'design', '2025-10-01', '2026-06-30', 10, 280000, 56000),
      ($1, 'Parking Structure', 'New 200-space parking garage', true, 'on-track', 'procurement', '2025-09-01', '2026-12-31', 15, 3500000, 525000)
    `, [locations[1].id]);

        // Manufacturing projects
        await client.query(`
      INSERT INTO projects (location_id, name, description, is_top_5, status, phase, start_date, end_date, percent_complete, budget_planned, budget_actual) VALUES
      ($1, 'Assembly Line B Overhaul', 'Complete rebuild of conveyor and robotics', true, 'at-risk', 'construction', '2025-06-01', '2026-04-30', 40, 1800000, 900000),
      ($1, 'Packaging Automation', 'Robotic palletizing system installation', true, 'on-track', 'procurement', '2025-10-01', '2026-07-31', 20, 950000, 190000),
      ($1, 'Safety System Upgrade', 'Emergency stop and sensor network', false, 'on-track', 'construction', '2025-08-01', '2026-02-28', 60, 320000, 200000),
      ($1, 'HVAC Renovation', 'Industrial cooling for production floor', true, 'on-track', 'construction', '2025-05-01', '2026-01-31', 75, 680000, 530000),
      ($1, 'Solar Panel Upgrade', 'Warehouse roof 300kw array', true, 'on-track', 'planning', '2026-02-01', '2026-10-31', 3, 800000, 24000),
      ($1, 'Loading Dock Expansion', 'Adding 4 new truck bays', false, 'complete', 'closeout', '2025-03-01', '2025-11-30', 100, 450000, 440000),
      ($1, 'Network Infrastructure', 'Industrial IoT network backbone', true, 'on-track', 'construction', '2025-07-01', '2026-03-31', 50, 550000, 280000)
    `, [locations[2].id]);

        // ===== People =====
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

        // ===== Assignments (with allocation_pct) =====
        // Alice Chen: 60% HQ, 25% R&D, 15% Mfg oversight = 100%
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status, allocation_pct) VALUES
      ($1, $2, 'Program Lead', '2025-01-15', 'active', 60),
      ($1, $3, 'Program Oversight', '2025-03-01', 'active', 25),
      ($1, $4, 'Program Oversight', '2025-03-01', 'active', 15)
    `, [people[0].id, locations[0].id, locations[1].id, locations[2].id]);

        // Bob Martinez: 50% HQ, 60% Mfg = 110% OVERCOMMITTED
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status, allocation_pct) VALUES
      ($1, $2, 'Lead Structural Engineer', '2024-06-01', 'active', 50),
      ($1, $3, 'Engineering Consultant', '2025-02-01', 'active', 60)
    `, [people[1].id, locations[0].id, locations[2].id]);

        // Carol Washington: 40% HQ, 30% R&D, 40% Mfg = 110% OVERCOMMITTED
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status, allocation_pct) VALUES
      ($1, $2, 'Safety Lead', '2024-01-01', 'active', 40),
      ($1, $3, 'Safety Auditor', '2024-01-01', 'active', 30),
      ($1, $4, 'Safety Inspector', '2024-01-01', 'active', 40)
    `, [people[2].id, locations[0].id, locations[1].id, locations[2].id]);

        // David Kim: 100% R&D
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status, allocation_pct) VALUES
      ($1, $2, 'Principal Researcher', '2024-03-15', 'active', 100)
    `, [people[3].id, locations[1].id]);

        // Elena Rossi: 50% HQ, 50% Mfg = 100%
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status, allocation_pct) VALUES
      ($1, $2, 'Facilities Lead', '2024-08-01', 'active', 50),
      ($1, $3, 'Facilities Coordinator', '2025-01-10', 'active', 50)
    `, [people[4].id, locations[0].id, locations[2].id]);

        // Frank Okafor: 40% HQ, 30% R&D, 40% Mfg = 110% OVERCOMMITTED
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status, allocation_pct) VALUES
      ($1, $2, 'IT Director', '2024-01-01', 'active', 40),
      ($1, $3, 'Network Oversight', '2024-06-01', 'active', 30),
      ($1, $4, 'Systems Administrator', '2024-06-01', 'active', 40)
    `, [people[5].id, locations[0].id, locations[1].id, locations[2].id]);

        // Grace Liu: 100% HQ
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status, allocation_pct) VALUES
      ($1, $2, 'Budget Analyst', '2025-01-01', 'active', 100)
    `, [people[6].id, locations[0].id]);

        // Henry Patel: 50% R&D, 60% Mfg = 110% OVERCOMMITTED
        await client.query(`
      INSERT INTO assignments (person_id, location_id, role_at_location, start_date, status, allocation_pct) VALUES
      ($1, $2, 'Construction Lead', '2024-09-01', 'active', 50),
      ($1, $3, 'Site Supervisor', '2025-01-15', 'active', 60)
    `, [people[7].id, locations[1].id, locations[2].id]);

        // ===== Reports =====
        await client.query(`
      INSERT INTO reports (location_id, author_id, title, body, report_type, report_date) VALUES
      ($1, $2, 'Q4 2025 Headquarters Status', 'All projects on track. Solar panel installation phase 2 begins next month. HVAC renovation in wing A is 80% complete. Budget utilization at 92% for the quarter. Lobby remodel design phase delayed due to permitting issues.', 'quarterly', '2025-12-15'),
      ($1, $3, 'Safety Inspection - December 2025', 'Annual safety inspection completed. All fire suppression systems operational. Emergency exits properly marked. Two minor findings: replacement of exit signs in parking garage B2 and updated safety placards in the cafeteria.', 'inspection', '2025-12-20'),
      ($1, $4, 'Network Upgrade Completion Report', 'Fiber optic backbone upgrade completed across all floors. Bandwidth increased from 1Gbps to 10Gbps. All access points upgraded to WiFi 6E. Project came in $15K under budget. Server room cooling optimization remains.', 'sitrep', '2026-01-10'),
      ($5, $6, 'R&D Lab Expansion Proposal', 'Proposing expansion of Lab C to accommodate new materials testing equipment. Estimated cost: $2.1M. Timeline: 6 months. This expansion would increase testing throughput by 40% and support the upcoming DoD contract requirements.', 'assessment', '2026-01-05'),
      ($5, $7, 'R&D Quarterly Research Summary', 'Three active research programs progressing well. Advanced materials project achieved key milestone - new composite passed stress testing. AI-driven climate control prototype ready for Phase 2 trials. Clean room procurement delayed due to vendor availability.', 'quarterly', '2025-12-30'),
      ($8, $9, 'Manufacturing Plant Quarterly Review', 'Production output steady at 94% capacity. Assembly Line B showing signs of wear - overhaul recommended for Q2 but falling behind schedule. Safety certification renewal due March 2026. Staff morale high following cafeteria expansion completion.', 'quarterly', '2025-12-28'),
      ($8, $3, 'Manufacturing Safety Audit', 'Comprehensive safety audit of all production lines completed. Assembly Line B flagged for potential mechanical failure risks. Recommended immediate inspection of conveyor belt tensioners. All chemical storage areas compliant.', 'inspection', '2026-01-18'),
      ($8, $10, 'Packaging Automation Feasibility Study', 'Analysis of packaging line automation options complete. Recommended solution: robotic palletizing system. ROI expected within 18 months. Would reduce manual handling injuries by an estimated 60% and increase throughput by 25%.', 'assessment', '2026-02-01')
    `, [
            locations[0].id, people[0].id, people[2].id, people[5].id,
            locations[1].id, people[3].id, people[7].id,
            locations[2].id, people[4].id, people[1].id
        ]);

        // ===== Users (P2: Auth) =====
        const passwordHash = await bcrypt.hash('password123', 10);
        const usersResult = await client.query(`
      INSERT INTO users (username, password_hash, name, email, role) VALUES
      ('admin', $1, 'System Admin', 'admin@example.com', 'admin'),
      ('alice.chen', $1, 'Alice Chen', 'alice.chen@example.com', 'manager'),
      ('bob.martinez', $1, 'Bob Martinez', 'bob.martinez@example.com', 'manager'),
      ('viewer', $1, 'Read Only User', 'viewer@example.com', 'viewer')
      RETURNING id, username
    `, [passwordHash]);
        const users = usersResult.rows;

        // ===== Notification Preferences =====
        for (const user of users) {
            await client.query(`
        INSERT INTO notification_preferences (user_id, digest_frequency, alert_overcommit, alert_status_change, alert_budget_threshold, budget_threshold_pct)
        VALUES ($1, $2, true, true, true, 90)
      `, [user.id, user.username === 'admin' ? 'daily' : 'weekly']);
        }

        // ===== Notifications (sample) =====
        await client.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at) VALUES
      ($1, 'Bob Martinez overcommitted', 'Bob Martinez is allocated at 110% across 2 locations. Consider rebalancing workload.', 'warning', false, '/dashboard?tab=people', NOW() - INTERVAL '2 hours'),
      ($1, 'Lobby Remodel status changed', 'Lobby Remodel at Headquarters changed from on-track to behind schedule.', 'alert', false, '/dashboard?tab=projects', NOW() - INTERVAL '1 day'),
      ($1, 'Assembly Line B Overhaul at risk', 'Assembly Line B Overhaul at Manufacturing Plant flagged as at-risk. Budget at 50% with only 40% completion.', 'alert', false, '/dashboard?tab=projects', NOW() - INTERVAL '2 days'),
      ($1, 'Weekly digest available', 'Your weekly portfolio summary is ready for review. 3 locations, 21 projects, 8 personnel tracked.', 'info', true, '/dashboard', NOW() - INTERVAL '7 days'),
      ($2, 'Clean Room Upgrade at risk', 'Clean Room Upgrade at R&D Center moved to at-risk status due to vendor delays.', 'alert', false, '/dashboard?tab=projects', NOW() - INTERVAL '3 days'),
      ($2, 'Henry Patel overcommitted', 'Henry Patel is allocated at 110% across R&D Center and Manufacturing Plant.', 'warning', false, '/dashboard?tab=people', NOW() - INTERVAL '5 days')
    `, [users[0].id, users[1].id]);

        // ===== Activity Log (P1) =====
        await client.query(`
      INSERT INTO activity_log (entity_type, entity_id, action, details, user_name, created_at) VALUES
      ('project', 5, 'status_changed', 'Parking Lot Resurfacing at Headquarters marked as complete', 'Alice Chen', NOW() - INTERVAL '30 days'),
      ('project', 7, 'status_changed', 'Network Infrastructure at Headquarters marked as complete', 'Frank Okafor', NOW() - INTERVAL '25 days'),
      ('report', 1, 'created', 'Q4 2025 Headquarters Status report filed', 'Alice Chen', NOW() - INTERVAL '20 days'),
      ('assignment', 3, 'updated', 'Carol Washington allocation at R&D Center changed from 25% to 30%', 'System Admin', NOW() - INTERVAL '18 days'),
      ('project', 4, 'status_changed', 'Lobby Remodel at Headquarters changed to behind - permitting delays', 'Alice Chen', NOW() - INTERVAL '15 days'),
      ('report', 4, 'created', 'R&D Lab Expansion Proposal submitted', 'David Kim', NOW() - INTERVAL '14 days'),
      ('project', 8, 'status_changed', 'Assembly Line B Overhaul at Manufacturing Plant changed to at-risk', 'Henry Patel', NOW() - INTERVAL '10 days'),
      ('report', 7, 'created', 'Manufacturing Safety Audit filed - Assembly Line B flagged', 'Carol Washington', NOW() - INTERVAL '8 days'),
      ('assignment', 2, 'created', 'Bob Martinez assigned to Manufacturing Plant at 60%', 'System Admin', NOW() - INTERVAL '7 days'),
      ('project', 3, 'status_changed', 'Security System Overhaul at Headquarters changed to at-risk - procurement delays', 'Elena Rossi', NOW() - INTERVAL '5 days'),
      ('report', 8, 'created', 'Packaging Automation Feasibility Study completed', 'Bob Martinez', NOW() - INTERVAL '3 days'),
      ('project', 9, 'updated', 'AI Climate Control percent_complete updated to 55%', 'David Kim', NOW() - INTERVAL '1 day')
    `);

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
