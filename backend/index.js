const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const createTables = require('./init_db');

const app = express();
const port = 3075;
const JWT_SECRET = process.env.JWT_SECRET || 'locator-reporter-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Initialize tables on startup
createTables().catch(err => console.error('Failed to init tables:', err));

// ===== Auth Middleware =====
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) req.user = user;
        });
    }
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });
        if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
        next();
    };
}

// ===== Activity Logger Helper =====
async function logActivity(entityType, entityId, action, details, userName) {
    try {
        await pool.query(
            'INSERT INTO activity_log (entity_type, entity_id, action, details, user_name) VALUES ($1,$2,$3,$4,$5)',
            [entityType, entityId, action, details, userName || 'System']
        );
    } catch (e) {
        console.error('Failed to log activity:', e.message);
    }
}

// ===== Auth Routes (P2) =====
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign(
            { id: user.id, username: user.username, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ token, user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, name, email, role FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Locations =====
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

app.put('/api/locations/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, lat, lng } = req.body;
    try {
        const result = await pool.query(
            'UPDATE locations SET name = $1, description = $2, lat = $3, lng = $4 WHERE id = $5 RETURNING *',
            [name, description, lat, lng, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== POCs =====
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

// ===== Projects (updated for P0) =====
app.get('/api/locations/:id/projects', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM projects WHERE location_id = $1 ORDER BY is_top_5 DESC, name', [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/locations/:id/projects', async (req, res) => {
    const { id } = req.params;
    const { name, description, is_top_5, status, phase, start_date, end_date, percent_complete, budget_planned, budget_actual } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO projects (location_id, name, description, is_top_5, status, phase, start_date, end_date, percent_complete, budget_planned, budget_actual)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
            [id, name, description, is_top_5, status || 'on-track', phase || 'planning', start_date || null, end_date || null, percent_complete || 0, budget_planned || 0, budget_actual || 0]
        );
        await logActivity('project', result.rows[0].id, 'created', `${name} created at location ${id}`, req.user?.name);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', optionalAuth, async (req, res) => {
    const { id } = req.params;
    const { name, description, is_top_5, status, phase, start_date, end_date, percent_complete, budget_planned, budget_actual } = req.body;
    try {
        // Get old status for activity log
        const old = await pool.query('SELECT status, percent_complete FROM projects WHERE id = $1', [id]);
        const result = await pool.query(
            `UPDATE projects SET name=$1, description=$2, is_top_5=$3, status=$4, phase=$5,
             start_date=$6, end_date=$7, percent_complete=$8, budget_planned=$9, budget_actual=$10
             WHERE id=$11 RETURNING *`,
            [name, description, is_top_5, status, phase, start_date, end_date, percent_complete, budget_planned, budget_actual, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        // Log status changes
        if (old.rows.length > 0 && old.rows[0].status !== status) {
            await logActivity('project', id, 'status_changed', `${name} changed from ${old.rows[0].status} to ${status}`, req.user?.name);
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
        if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        res.json({ message: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== People =====
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
            'INSERT INTO people (name, role, email, phone, organization, skills) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
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

// ===== Assignments (updated with allocation_pct) =====
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

app.post('/api/assignments', optionalAuth, async (req, res) => {
    const { person_id, location_id, role_at_location, start_date, end_date, status, allocation_pct } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO assignments (person_id, location_id, role_at_location, start_date, end_date, status, allocation_pct) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
            [person_id, location_id, role_at_location, start_date || null, end_date || null, status || 'active', allocation_pct || 100]
        );
        await logActivity('assignment', result.rows[0].id, 'created', `Assignment created for person ${person_id} at location ${location_id} (${allocation_pct || 100}%)`, req.user?.name);
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

// ===== Workload / Overcommit (P0) =====
app.get('/api/people/workload/summary', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.id, p.name, p.role, p.organization,
                   COALESCE(SUM(a.allocation_pct) FILTER (WHERE a.status = 'active'), 0) as total_allocation,
                   json_agg(json_build_object(
                       'location_name', l.name, 'role_at_location', a.role_at_location,
                       'allocation_pct', a.allocation_pct, 'location_id', l.id
                   ) ORDER BY a.allocation_pct DESC) FILTER (WHERE a.id IS NOT NULL) as assignments
            FROM people p
            LEFT JOIN assignments a ON p.id = a.person_id AND a.status = 'active'
            LEFT JOIN locations l ON a.location_id = l.id
            GROUP BY p.id, p.name, p.role, p.organization
            ORDER BY COALESCE(SUM(a.allocation_pct) FILTER (WHERE a.status = 'active'), 0) DESC, p.name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Reports =====
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
            FROM reports r LEFT JOIN locations l ON r.location_id = l.id LEFT JOIN people p ON r.author_id = p.id
            WHERE r.id = $1`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reports', optionalAuth, async (req, res) => {
    const { location_id, author_id, title, body, report_type, report_date } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO reports (location_id, author_id, title, body, report_type, report_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [location_id, author_id || null, title, body, report_type || 'general', report_date || null]
        );
        await logActivity('report', result.rows[0].id, 'created', `Report "${title}" filed`, req.user?.name);
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

// ===== Activity Log (P1) =====
app.get('/api/activity', async (req, res) => {
    const { limit = 50, entity_type } = req.query;
    try {
        let query = 'SELECT * FROM activity_log';
        const params = [];
        if (entity_type) {
            query += ' WHERE entity_type = $1';
            params.push(entity_type);
        }
        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(parseInt(limit));
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Notifications (P3) =====
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
            [req.user.id]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        res.json({ message: 'Marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
        res.json({ message: 'All marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/notification-preferences', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notification_preferences WHERE user_id = $1', [req.user.id]);
        res.json(result.rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notification-preferences', authenticateToken, async (req, res) => {
    const { digest_frequency, alert_overcommit, alert_status_change, alert_budget_threshold, budget_threshold_pct } = req.body;
    try {
        const result = await pool.query(`
            INSERT INTO notification_preferences (user_id, digest_frequency, alert_overcommit, alert_status_change, alert_budget_threshold, budget_threshold_pct)
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (user_id) DO UPDATE SET digest_frequency=$2, alert_overcommit=$3, alert_status_change=$4, alert_budget_threshold=$5, budget_threshold_pct=$6
            RETURNING *
        `, [req.user.id, digest_frequency, alert_overcommit, alert_status_change, alert_budget_threshold, budget_threshold_pct]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Dashboard Aggregates (P0 updated) =====
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const [locations, people, projects, reports, atRisk, behind, overcommitted] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM locations'),
            pool.query('SELECT COUNT(*) as count FROM people'),
            pool.query('SELECT COUNT(*) as count FROM projects'),
            pool.query('SELECT COUNT(*) as count FROM reports'),
            pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'at-risk'"),
            pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'behind'"),
            pool.query(`SELECT COUNT(*) as count FROM (
                SELECT p.id FROM people p
                JOIN assignments a ON p.id = a.person_id AND a.status = 'active'
                GROUP BY p.id HAVING SUM(a.allocation_pct) > 100
            ) sub`)
        ]);
        const totalBudget = await pool.query('SELECT COALESCE(SUM(budget_planned),0) as planned, COALESCE(SUM(budget_actual),0) as actual FROM projects');
        res.json({
            total_locations: parseInt(locations.rows[0].count),
            total_people: parseInt(people.rows[0].count),
            total_projects: parseInt(projects.rows[0].count),
            total_reports: parseInt(reports.rows[0].count),
            at_risk_count: parseInt(atRisk.rows[0].count),
            behind_count: parseInt(behind.rows[0].count),
            overcommitted_count: parseInt(overcommitted.rows[0].count),
            total_budget_planned: parseFloat(totalBudget.rows[0].planned),
            total_budget_actual: parseFloat(totalBudget.rows[0].actual)
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
                       'id', p.id, 'name', p.name, 'description', p.description, 'is_top_5', p.is_top_5,
                       'status', p.status, 'phase', p.phase, 'start_date', p.start_date, 'end_date', p.end_date,
                       'percent_complete', p.percent_complete, 'budget_planned', p.budget_planned, 'budget_actual', p.budget_actual
                   ) ORDER BY p.is_top_5 DESC, p.name) as projects,
                   COUNT(p.id) as project_count,
                   COUNT(p.id) FILTER (WHERE p.is_top_5) as top_5_count,
                   COUNT(p.id) FILTER (WHERE p.status = 'at-risk') as at_risk_count,
                   COUNT(p.id) FILTER (WHERE p.status = 'behind') as behind_count,
                   COALESCE(SUM(p.budget_planned),0) as total_budget_planned,
                   COALESCE(SUM(p.budget_actual),0) as total_budget_actual
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
                       'status', a.status, 'email', pe.email, 'allocation_pct', a.allocation_pct
                   ) ORDER BY pe.name) FILTER (WHERE pe.id IS NOT NULL) as people,
                   COUNT(DISTINCT pe.id) as people_count,
                   COALESCE(SUM(a.allocation_pct),0) as total_allocation
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

// ===== Portfolio Heatmap (P1) =====
app.get('/api/dashboard/heatmap', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.id as location_id, l.name as location_name,
                -- Budget health: ratio of actual/planned (lower is better if under, > 1 is over budget)
                CASE WHEN COALESCE(SUM(p.budget_planned),0) = 0 THEN 1
                     ELSE ROUND(COALESCE(SUM(p.budget_actual),0) / NULLIF(SUM(p.budget_planned),1), 2)
                END as budget_ratio,
                COALESCE(SUM(p.budget_planned),0) as budget_planned,
                COALESCE(SUM(p.budget_actual),0) as budget_actual,
                -- Schedule health: avg percent_complete vs expected
                ROUND(AVG(p.percent_complete)) as avg_completion,
                -- Status counts
                COUNT(p.id) FILTER (WHERE p.status = 'on-track') as on_track,
                COUNT(p.id) FILTER (WHERE p.status = 'at-risk') as at_risk,
                COUNT(p.id) FILTER (WHERE p.status = 'behind') as behind,
                COUNT(p.id) FILTER (WHERE p.status = 'complete') as complete,
                COUNT(p.id) as total_projects,
                -- Staffing
                COALESCE((SELECT SUM(a.allocation_pct) FROM assignments a WHERE a.location_id = l.id AND a.status = 'active'), 0) as total_staff_allocation,
                COALESCE((SELECT COUNT(DISTINCT a.person_id) FROM assignments a WHERE a.location_id = l.id AND a.status = 'active'), 0) as staff_count
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

// ===== Chart Data (P3) =====
app.get('/api/dashboard/chart/budget-by-location', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.name, COALESCE(SUM(p.budget_planned),0) as planned, COALESCE(SUM(p.budget_actual),0) as actual
            FROM locations l LEFT JOIN projects p ON l.id = p.location_id
            GROUP BY l.id, l.name ORDER BY l.name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/chart/status-distribution', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT status, COUNT(*) as count FROM projects GROUP BY status ORDER BY status
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/chart/phase-distribution', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT phase, COUNT(*) as count FROM projects GROUP BY phase
            ORDER BY CASE phase WHEN 'planning' THEN 1 WHEN 'design' THEN 2 WHEN 'procurement' THEN 3 WHEN 'construction' THEN 4 WHEN 'closeout' THEN 5 END
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/chart/staffing-by-location', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.name, COUNT(DISTINCT a.person_id) as headcount, COALESCE(SUM(a.allocation_pct),0) as total_allocation
            FROM locations l
            LEFT JOIN assignments a ON l.id = a.location_id AND a.status = 'active'
            GROUP BY l.id, l.name ORDER BY l.name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Export (P3) =====
app.get('/api/export/projects-csv', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.name as location, p.name as project, p.description, p.status, p.phase,
                   p.start_date, p.end_date, p.percent_complete, p.budget_planned, p.budget_actual,
                   CASE WHEN p.is_top_5 THEN 'Yes' ELSE 'No' END as top_5
            FROM projects p JOIN locations l ON p.location_id = l.id
            ORDER BY l.name, p.name
        `);
        const headers = ['Location', 'Project', 'Description', 'Status', 'Phase', 'Start Date', 'End Date', '% Complete', 'Budget Planned', 'Budget Actual', 'Top 5'];
        const csv = [headers.join(',')];
        for (const row of result.rows) {
            csv.push([
                `"${row.location}"`, `"${row.project}"`, `"${(row.description || '').replace(/"/g, '""')}"`,
                row.status, row.phase, row.start_date || '', row.end_date || '',
                row.percent_complete, row.budget_planned, row.budget_actual, row.top_5
            ].join(','));
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=projects-export.csv');
        res.send(csv.join('\n'));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/export/people-csv', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.name, p.role, p.organization, p.email, p.phone,
                   COALESCE(SUM(a.allocation_pct) FILTER (WHERE a.status = 'active'), 0) as total_allocation,
                   string_agg(DISTINCT l.name || ' (' || a.allocation_pct || '%)', ', ') as assignments
            FROM people p
            LEFT JOIN assignments a ON p.id = a.person_id
            LEFT JOIN locations l ON a.location_id = l.id
            GROUP BY p.id, p.name, p.role, p.organization, p.email, p.phone
            ORDER BY p.name
        `);
        const headers = ['Name', 'Role', 'Organization', 'Email', 'Phone', 'Total Allocation %', 'Assignments'];
        const csv = [headers.join(',')];
        for (const row of result.rows) {
            csv.push([
                `"${row.name}"`, `"${row.role || ''}"`, `"${row.organization || ''}"`,
                `"${row.email || ''}"`, `"${row.phone || ''}"`, row.total_allocation,
                `"${(row.assignments || '').replace(/"/g, '""')}"`
            ].join(','));
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=people-export.csv');
        res.send(csv.join('\n'));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== AI Service API (Mock/Placeholder) =====
app.get('/api/ai/program-overview', (req, res) => {
    res.json({ overview: "This program focuses on sustainable architecture and renewable energy integration across all locations." });
});

app.get('/api/ai/metrics', (req, res) => {
    res.json({
        metrics: [
            { name: "SOW Duplication Check", status: "Pass", details: "No significant duplications found across 5 projects." },
            { name: "Resource Utilization", value: "85%", trend: "up" }
        ]
    });
});

app.get('/api/locations/:id/ai-analysis', (req, res) => {
    const { id } = req.params;
    const analysis = {
        1: { summary: "Headquarters operating at optimal efficiency. Energy consumption down 12% YOY.", risks: ["Lobby remodel slightly behind schedule"], opportunities: ["Solar integration on South Wing"] },
        2: { summary: "R&D Center showing high resource utilization. New lab expansion recommended.", risks: ["Power grid stability during peak testing"], opportunities: ["AI-driven climate control implementation"] },
        3: { summary: "Manufacturing Plant output steady. Maintenance requests have increased by 5%.", risks: ["Assembly Line B requires overhaul", "Safety certification renewal due"], opportunities: ["Automation of packaging line"] }
    };
    res.json(analysis[id] || { summary: "No specific analysis available.", risks: [], opportunities: [] });
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
