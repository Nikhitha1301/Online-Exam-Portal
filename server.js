const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'iky_portal',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database successfully');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

// Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await pool.execute('SELECT * FROM admins WHERE id = ?', [decoded.adminId]);
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        
        req.admin = rows[0];
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }
};

const authenticateStudent = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await pool.execute('SELECT * FROM students WHERE id = ?', [decoded.studentId]);
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        
        req.student = rows[0];
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }
};

// ==================== AUTHENTICATION ROUTES ====================

// Admin Authentication
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        const [rows] = await pool.execute('SELECT * FROM admins WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const admin = rows[0];
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ 
            token, 
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Student Authentication
app.post('/api/student/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        
        const [rows] = await pool.execute('SELECT * FROM students WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const student = rows[0];
        const isValidPassword = await bcrypt.compare(password, student.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ studentId: student.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ 
            token, 
            student: {
                id: student.id,
                name: student.name,
                email: student.email,
                course: student.course
            }
        });
    } catch (error) {
        console.error('Student login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== ADMIN ROUTES (PROTECTED) ====================

// ==================== STUDENT MANAGEMENT ====================

// Get all students with pagination and search
app.get('/api/admin/students', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', course = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT id, name, email, course, created_at,
                   (SELECT COUNT(*) FROM exam_results WHERE student_id = students.id) as exams_taken,
                   (SELECT AVG(score) FROM exam_results WHERE student_id = students.id) as avg_score
            FROM students
            WHERE 1=1
        `;
        const params = [];
        
        if (search) {
            query += ` AND (name LIKE ? OR email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (course) {
            query += ` AND course = ?`;
            params.push(course);
        }
        
        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        
        const [rows] = await pool.execute(query, params);
        
        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) as total FROM students WHERE 1=1`;
        const countParams = [];
        
        if (search) {
            countQuery += ` AND (name LIKE ? OR email LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`);
        }
        
        if (course) {
            countQuery += ` AND course = ?`;
            countParams.push(course);
        }
        
        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;
        
        res.json({
            students: rows,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                totalRecords: total,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get student by ID with detailed information
app.get('/api/admin/students/:id', authenticateAdmin, async (req, res) => {
    try {
        const studentId = req.params.id;
        
        const [studentRows] = await pool.execute('SELECT * FROM students WHERE id = ?', [studentId]);
        if (studentRows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        const [examResults] = await pool.execute(`
            SELECT er.*, c.title as course_title 
            FROM exam_results er 
            JOIN courses c ON er.course_id = c.id 
            WHERE er.student_id = ? 
            ORDER BY er.completed_at DESC
        `, [studentId]);
        
        const student = studentRows[0];
        delete student.password; // Don't send password
        
        res.json({
            student,
            examResults,
            totalExams: examResults.length,
            averageScore: examResults.length > 0 ? 
                examResults.reduce((sum, exam) => sum + exam.score, 0) / examResults.length : 0
        });
    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add new student
app.post('/api/admin/students', authenticateAdmin, async (req, res) => {
    try {
        const { name, email, password, course } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }
        
        // Check if student already exists
        const [existing] = await pool.execute('SELECT id FROM students WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Student with this email already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO students (name, email, password, course) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, course || 'Computer Science']
        );
        
        res.status(201).json({ 
            message: 'Student added successfully', 
            student: { id: result.insertId, name, email, course } 
        });
    } catch (error) {
        console.error('Add student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update student
app.put('/api/admin/students/:id', authenticateAdmin, async (req, res) => {
    try {
        const { name, email, course, password } = req.body;
        const studentId = req.params.id;
        
        let query = 'UPDATE students SET name = ?, email = ?, course = ?';
        let params = [name, email, course];
        
        // Update password if provided
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }
        
        query += ' WHERE id = ?';
        params.push(studentId);
        
        const [result] = await pool.execute(query, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.json({ message: 'Student updated successfully' });
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete student
app.delete('/api/admin/students/:id', authenticateAdmin, async (req, res) => {
    try {
        const studentId = req.params.id;
        
        const [result] = await pool.execute('DELETE FROM students WHERE id = ?', [studentId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Bulk delete students
app.delete('/api/admin/students', authenticateAdmin, async (req, res) => {
    try {
        const { studentIds } = req.body;
        
        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: 'Student IDs array is required' });
        }
        
        const placeholders = studentIds.map(() => '?').join(',');
        const [result] = await pool.execute(`DELETE FROM students WHERE id IN (${placeholders})`, studentIds);
        
        res.json({ 
            message: `${result.affectedRows} students deleted successfully`,
            deletedCount: result.affectedRows
        });
    } catch (error) {
        console.error('Bulk delete students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== COURSE MANAGEMENT ====================

// Get all courses with topics
app.get('/api/admin/courses', authenticateAdmin, async (req, res) => {
    try {
        const [courses] = await pool.execute('SELECT * FROM courses ORDER BY created_at DESC');
        
        // Get topics for each course
        for (let course of courses) {
            const [topics] = await pool.execute('SELECT * FROM course_topics WHERE course_id = ?', [course.id]);
            course.topics = topics;
        }
        
        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get course by ID with detailed information
app.get('/api/admin/courses/:id', authenticateAdmin, async (req, res) => {
    try {
        const courseId = req.params.id;
        
        const [courseRows] = await pool.execute('SELECT * FROM courses WHERE id = ?', [courseId]);
        if (courseRows.length === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        const [topics] = await pool.execute('SELECT * FROM course_topics WHERE course_id = ?', [courseId]);
        const [mcqs] = await pool.execute('SELECT * FROM mcqs WHERE course_id = ?', [courseId]);
        const [codingQuestions] = await pool.execute('SELECT * FROM coding_questions WHERE course_id = ?', [courseId]);
        
        const course = courseRows[0];
        course.topics = topics;
        course.mcqs = mcqs;
        course.codingQuestions = codingQuestions;
        
        res.json(course);
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add new course
app.post('/api/admin/courses', authenticateAdmin, async (req, res) => {
    try {
        const { title, description, icon, duration, difficulty, students_count, topics } = req.body;
        
        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO courses (title, description, icon, duration, difficulty, students_count) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, icon, duration, difficulty, students_count || '0']
        );
        
        const courseId = result.insertId;
        
        // Add topics if provided
        if (topics && Array.isArray(topics)) {
            for (let topic of topics) {
                await pool.execute(
                    'INSERT INTO course_topics (course_id, name, duration) VALUES (?, ?, ?)',
                    [courseId, topic.name, topic.duration]
                );
            }
        }
        
        res.status(201).json({ 
            message: 'Course added successfully', 
            course: { id: courseId, title, description } 
        });
    } catch (error) {
        console.error('Add course error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update course
app.put('/api/admin/courses/:id', authenticateAdmin, async (req, res) => {
    try {
        const { title, description, icon, duration, difficulty, students_count, topics } = req.body;
        const courseId = req.params.id;
        
        const [result] = await pool.execute(
            'UPDATE courses SET title = ?, description = ?, icon = ?, duration = ?, difficulty = ?, students_count = ? WHERE id = ?',
            [title, description, icon, duration, difficulty, students_count, courseId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Update topics if provided
        if (topics && Array.isArray(topics)) {
            // Delete existing topics
            await pool.execute('DELETE FROM course_topics WHERE course_id = ?', [courseId]);
            
            // Add new topics
            for (let topic of topics) {
                await pool.execute(
                    'INSERT INTO course_topics (course_id, name, duration) VALUES (?, ?, ?)',
                    [courseId, topic.name, topic.duration]
                );
            }
        }
        
        res.json({ message: 'Course updated successfully' });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete course
app.delete('/api/admin/courses/:id', authenticateAdmin, async (req, res) => {
    try {
        const courseId = req.params.id;
        
        const [result] = await pool.execute('DELETE FROM courses WHERE id = ?', [courseId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== QUESTION MANAGEMENT ====================

// Add MCQ to course
app.post('/api/admin/courses/:courseId/mcqs', authenticateAdmin, async (req, res) => {
    try {
        const { question, option_1, option_2, option_3, option_4, correct_answer } = req.body;
        const courseId = req.params.courseId;
        
        if (!question || !option_1 || !option_2 || !option_3 || !option_4 || correct_answer === undefined) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO mcqs (course_id, question, option_1, option_2, option_3, option_4, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [courseId, question, option_1, option_2, option_3, option_4, correct_answer]
        );
        
        res.status(201).json({ 
            message: 'MCQ added successfully', 
            mcq: { id: result.insertId, question } 
        });
    } catch (error) {
        console.error('Add MCQ error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add coding question to course
app.post('/api/admin/courses/:courseId/coding-questions', authenticateAdmin, async (req, res) => {
    try {
        const { prompt, question_id } = req.body;
        const courseId = req.params.courseId;
        
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt is required' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO coding_questions (course_id, prompt, question_id) VALUES (?, ?, ?)',
            [courseId, prompt, question_id]
        );
        
        res.status(201).json({ 
            message: 'Coding question added successfully', 
            question: { id: result.insertId, prompt } 
        });
    } catch (error) {
        console.error('Add coding question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== PERFORMANCE ANALYTICS ====================

// Get overall performance statistics
app.get('/api/admin/analytics', authenticateAdmin, async (req, res) => {
    try {
        // Total students
        const [studentCount] = await pool.execute('SELECT COUNT(*) as total FROM students');
        
        // Total courses
        const [courseCount] = await pool.execute('SELECT COUNT(*) as total FROM courses');
        
        // Total exams taken
        const [examCount] = await pool.execute('SELECT COUNT(*) as total FROM exam_results');
        
        // Average score
        const [avgScore] = await pool.execute('SELECT AVG(score) as average FROM exam_results');
        
        // Recent exam results
        const [recentExams] = await pool.execute(`
            SELECT er.*, s.name as student_name, c.title as course_title 
            FROM exam_results er 
            JOIN students s ON er.student_id = s.id 
            JOIN courses c ON er.course_id = c.id 
            ORDER BY er.completed_at DESC 
            LIMIT 10
        `);
        
        // Course-wise performance
        const [coursePerformance] = await pool.execute(`
            SELECT c.title, 
                   COUNT(er.id) as exams_taken,
                   AVG(er.score) as avg_score,
                   COUNT(DISTINCT er.student_id) as unique_students
            FROM courses c 
            LEFT JOIN exam_results er ON c.id = er.course_id 
            GROUP BY c.id, c.title
            ORDER BY avg_score DESC
        `);
        
        res.json({
            overview: {
                totalStudents: studentCount[0].total,
                totalCourses: courseCount[0].total,
                totalExams: examCount[0].total,
                averageScore: avgScore[0].average || 0
            },
            recentExams,
            coursePerformance
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get student performance analytics
app.get('/api/admin/analytics/students', authenticateAdmin, async (req, res) => {
    try {
        const { course_id, date_from, date_to } = req.query;
        
        let query = `
            SELECT s.id, s.name, s.email, s.course,
                   COUNT(er.id) as exams_taken,
                   AVG(er.score) as avg_score,
                   MAX(er.score) as best_score,
                   MIN(er.score) as worst_score,
                   SUM(er.time_taken) as total_time
            FROM students s
            LEFT JOIN exam_results er ON s.id = er.student_id
        `;
        
        const params = [];
        const conditions = [];
        
        if (course_id) {
            conditions.push('er.course_id = ?');
            params.push(course_id);
        }
        
        if (date_from) {
            conditions.push('er.completed_at >= ?');
            params.push(date_from);
        }
        
        if (date_to) {
            conditions.push('er.completed_at <= ?');
            params.push(date_to);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' GROUP BY s.id, s.name, s.email, s.course ORDER BY avg_score DESC';
        
        const [results] = await pool.execute(query, params);
        
        res.json(results);
    } catch (error) {
        console.error('Student analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== STUDENT ROUTES ====================

// Get student profile
app.get('/api/student/profile', authenticateStudent, async (req, res) => {
    try {
        const student = req.student;
        delete student.password;
        
        const [examResults] = await pool.execute(`
            SELECT er.*, c.title as course_title 
            FROM exam_results er 
            JOIN courses c ON er.course_id = c.id 
            WHERE er.student_id = ? 
            ORDER BY er.completed_at DESC
        `, [student.id]);
        
        res.json({
            student,
            examResults,
            totalExams: examResults.length,
            averageScore: examResults.length > 0 ? 
                examResults.reduce((sum, exam) => sum + exam.score, 0) / examResults.length : 0
        });
    } catch (error) {
        console.error('Get student profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Submit exam result
app.post('/api/student/exam-results', authenticateStudent, async (req, res) => {
    try {
        const { course_id, score, total_questions, time_taken } = req.body;
        const studentId = req.student.id;
        
        if (!course_id || score === undefined || !total_questions) {
            return res.status(400).json({ message: 'Course ID, score, and total questions are required' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO exam_results (student_id, course_id, score, total_questions, time_taken) VALUES (?, ?, ?, ?, ?)',
            [studentId, course_id, score, total_questions, time_taken || 0]
        );
        
        res.status(201).json({ 
            message: 'Exam result submitted successfully',
            resultId: result.insertId
        });
    } catch (error) {
        console.error('Submit exam result error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get available courses for student
app.get('/api/student/courses', authenticateStudent, async (req, res) => {
    try {
        const [courses] = await pool.execute('SELECT * FROM courses ORDER BY title');
        
        // Get topics for each course
        for (let course of courses) {
            const [topics] = await pool.execute('SELECT * FROM course_topics WHERE course_id = ?', [course.id]);
            course.topics = topics;
        }
        
        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== UTILITY ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize admin account
async function initializeAdmin() {
    try {
        const [rows] = await pool.execute('SELECT COUNT(*) as count FROM admins');
        if (rows[0].count === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.execute(
                'INSERT INTO admins (username, password, email) VALUES (?, ?, ?)',
                ['admin', hashedPassword, 'admin@ikyportal.com']
            );
            console.log('✅ Default admin account created (username: admin, password: admin123)');
        }
    } catch (error) {
        console.error('❌ Error initializing admin:', error);
    }
}

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await testConnection();
    await initializeAdmin();
    console.log('🎉 IKY Portal Backend is ready!');
}); 