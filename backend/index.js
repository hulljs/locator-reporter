const express = require('express');
const cors = require('cors');
const pool = require('./db');
const createTables = require('./init_db');

const app = express();
const port = 3075;

app.use(cors());
app.use(express.json());

// Initialize tables on startup
createTables().catch(err => console.error('Failed to init tables:', err));

// Routes
// Locations
app.get('/api/locations', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM locations');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/locations', async (req, res) => {
    const { name, description, lat, lng } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO locations (name, description, lat, lng) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, lat, lng]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POCs
app.get('/api/locations/:id/pocs', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM pocs WHERE location_id = $1', [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/locations/:id/pocs', async (req, res) => {
    const { id } = req.params;
    const { name, role, email, phone } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO pocs (location_id, name, role, email, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, name, role, email, phone]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Projects
app.get('/api/locations/:id/projects', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM projects WHERE location_id = $1', [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/locations/:id/projects', async (req, res) => {
    const { id } = req.params;
    const { name, description, is_top_5 } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO projects (location_id, name, description, is_top_5) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, name, description, is_top_5]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, is_top_5 } = req.body;
    try {
        const result = await pool.query(
            'UPDATE projects SET name = $1, description = $2, is_top_5 = $3 WHERE id = $4 RETURNING *',
            [name, description, is_top_5, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ message: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// AI Service API (Mock/Placeholder)
app.get('/api/ai/program-overview', (req, res) => {
    // Simulate AI response
    res.json({ overview: "This program focuses on sustainable architecture and renewable energy integration across all locations." });
});

app.get('/api/ai/metrics', (req, res) => {
    // Simulate AI generated metrics
    res.json({
        metrics: [
            { name: "SOW Duplication Check", status: "Pass", details: "No significant duplications found across 5 projects." },
            { name: "Resource Utilization", value: "85%", trend: "up" }
        ]
    });
});

app.get('/api/locations/:id/ai-analysis', (req, res) => {
    const { id } = req.params;
    // Mock data based on ID for variety
    const analysis = {
        1: {
            summary: "Headquarters operating at optimal efficiency. Energy consumption down 12% YOY.",
            risks: ["Lobby remodel slightly behind schedule"],
            opportunities: ["Solar integration on South Wing"]
        },
        2: {
            summary: "R&D Center showing high resource utilization. New lab expansion recommended.",
            risks: ["Power grid stability during peak testing"],
            opportunities: ["AI-driven climate control implementation"]
        },
        3: {
            summary: "Manufacturing Plant output steady. Maintenance requests have increased by 5%.",
            risks: ["Assembly Line B requires overhaul", "Safety certification renewal due"],
            opportunities: ["Automation of packaging line"]
        }
    };

    res.json(analysis[id] || { summary: "No specific analysis available.", risks: [], opportunities: [] });
});

app.put('/api/locations/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, lat, lng } = req.body;
    try {
        const result = await pool.query(
            'UPDATE locations SET name = $1, description = $2, lat = $3, lng = $4 WHERE id = $5 RETURNING *',
            [name, description, lat, lng, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/metrics', async (req, res) => {
    const { report_text, location_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO metrics (location_id, report_text) VALUES ($1, $2) RETURNING *',
            [location_id || null, report_text]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ========== People ==========
app.get('/api/people', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM people ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/people/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM people WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Person not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/people', async (req, res) => {
    const { name, role, email, phone, organization, skills } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO people (name, role, email, phone, organization, skills) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, role, email, phone, organization, skills]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/people/:id', async (req, res) => {
    const { id } = req.params;
    const { name, role, email, phone, organization, skills } = req.body;
    try {
        const result = await pool.query(
            'UPDATE people SET name=$1, role=$2, email=$3, phone=$4, organization=$5, skills=$6 WHERE id=$7 RETURNING *',
            [name, role, email, phone, organization, skills, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Person not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/people/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM people WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Person not found' });
        res.json({ message: 'Person deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== Assignments ==========
app.get('/api/assignments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, p.name as person_name, p.role as person_role, p.email as person_email,
                   p.organization, l.name as location_name
            FROM assignments a
            JOIN people p ON a.person_id = p.id
            JOIN locations l ON a.location_id = l.id
            ORDER BY l.name, p.name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/locations/:id/assignments', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT a.*, p.name as person_name, p.role as person_role, p.email as person_email,
                   p.phone as person_phone, p.organization, p.skills
            FROM assignments a
            JOIN people p ON a.person_id = p.id
            WHERE a.location_id = $1
            ORDER BY p.name
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/people/:id/assignments', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT a.*, l.name as location_name, l.description as location_description
            FROM assignments a
            JOIN locations l ON a.location_id = l.id
            WHERE a.person_id = $1
            ORDER BY a.start_date DESC
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/assignments', async (req, res) => {
    const { person_id, location_id, role_at_location, start_date, end_date, status } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO assignments (person_id, location_id, role_at_location, start_date, end_date, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [person_id, location_id, role_at_location, start_date || null, end_date || null, status || 'active']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/assignments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM assignments WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
        res.json({ message: 'Assignment deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== Reports ==========
app.get('/api/reports', async (req, res) => {
    const { search, type, location_id } = req.query;
    try {
        let query = `
            SELECT r.*, l.name as location_name, p.name as author_name
            FROM reports r
            LEFT JOIN locations l ON r.location_id = l.id
            LEFT JOIN people p ON r.author_id = p.id
            WHERE 1=1
        `;
        const params = [];
        let paramIdx = 1;

        if (search) {
            query += ` AND (r.title ILIKE $${paramIdx} OR r.body ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }
        if (type) {
            query += ` AND r.report_type = $${paramIdx}`;
            params.push(type);
            paramIdx++;
        }
        if (location_id) {
            query += ` AND r.location_id = $${paramIdx}`;
            params.push(location_id);
            paramIdx++;
        }

        query += ' ORDER BY r.report_date DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT r.*, l.name as location_name, p.name as author_name
            FROM reports r
            LEFT JOIN locations l ON r.location_id = l.id
            LEFT JOIN people p ON r.author_id = p.id
            WHERE r.id = $1
        `, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reports', async (req, res) => {
    const { location_id, author_id, title, body, report_type, report_date } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO reports (location_id, author_id, title, body, report_type, report_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [location_id, author_id || null, title, body, report_type || 'general', report_date || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/reports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM reports WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        res.json({ message: 'Report deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== Dashboard Aggregates ==========
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const [locations, people, projects, reports] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM locations'),
            pool.query('SELECT COUNT(*) as count FROM people'),
            pool.query('SELECT COUNT(*) as count FROM projects'),
            pool.query('SELECT COUNT(*) as count FROM reports')
        ]);
        res.json({
            total_locations: parseInt(locations.rows[0].count),
            total_people: parseInt(people.rows[0].count),
            total_projects: parseInt(projects.rows[0].count),
            total_reports: parseInt(reports.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/projects-by-location', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.id as location_id, l.name as location_name,
                   json_agg(json_build_object(
                       'id', p.id, 'name', p.name, 'description', p.description, 'is_top_5', p.is_top_5
                   ) ORDER BY p.is_top_5 DESC, p.name) as projects,
                   COUNT(p.id) as project_count,
                   COUNT(p.id) FILTER (WHERE p.is_top_5) as top_5_count
            FROM locations l
            LEFT JOIN projects p ON l.id = p.location_id
            GROUP BY l.id, l.name
            ORDER BY l.name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/people-by-location', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.id as location_id, l.name as location_name,
                   json_agg(json_build_object(
                       'person_id', pe.id, 'person_name', pe.name, 'person_role', pe.role,
                       'organization', pe.organization, 'role_at_location', a.role_at_location,
                       'status', a.status, 'email', pe.email
                   ) ORDER BY pe.name) as people,
                   COUNT(DISTINCT pe.id) as people_count
            FROM locations l
            LEFT JOIN assignments a ON l.id = a.location_id AND a.status = 'active'
            LEFT JOIN people pe ON a.person_id = pe.id
            GROUP BY l.id, l.name
            ORDER BY l.name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
});
