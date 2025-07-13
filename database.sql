-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS iky_portal;
USE iky_portal;

-- Admin table
CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    course VARCHAR(100) DEFAULT 'Computer Science',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    duration VARCHAR(50),
    difficulty VARCHAR(20),
    students_count VARCHAR(20) DEFAULT '0',
    last_updated VARCHAR(50) DEFAULT 'Recent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Course topics table
CREATE TABLE IF NOT EXISTS course_topics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    name VARCHAR(100) NOT NULL,
    duration VARCHAR(50),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- MCQs table
CREATE TABLE IF NOT EXISTS mcqs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    question TEXT NOT NULL,
    option_1 VARCHAR(255) NOT NULL,
    option_2 VARCHAR(255) NOT NULL,
    option_3 VARCHAR(255) NOT NULL,
    option_4 VARCHAR(255) NOT NULL,
    correct_answer INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Coding questions table
CREATE TABLE IF NOT EXISTS coding_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    prompt TEXT NOT NULL,
    question_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Student exam results table
CREATE TABLE IF NOT EXISTS exam_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    course_id INT,
    score INT,
    total_questions INT,
    time_taken INT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Insert default admin account
INSERT INTO admins (username, password, email) VALUES 
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@ikyportal.com')
ON DUPLICATE KEY UPDATE username=username;

-- Insert default courses
INSERT INTO courses (title, description, icon, duration, difficulty, students_count) VALUES 
('Aptitude', 'Master logical reasoning, numerical ability, and verbal skills.', 'fas fa-brain', '8-10 hours', 'Easy', '2,500+'),
('DSA', 'Data Structures and Algorithms fundamentals and advanced concepts.', 'fas fa-code', '12-15 hours', 'Medium', '1,800+'),
('Java', 'Learn Java programming from basics to advanced concepts.', 'fab fa-java', '10-12 hours', 'Medium', '2,200+'),
('C Programming', 'Master C programming language fundamentals.', 'fas fa-copyright', '8-10 hours', 'Easy', '1,900+'),
('Python', 'Learn Python programming for beginners and intermediates.', 'fab fa-python', '10-12 hours', 'Easy', '3,000+')
ON DUPLICATE KEY UPDATE title=title; 