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


app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
});
