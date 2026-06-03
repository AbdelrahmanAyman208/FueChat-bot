const db = require('./config/db');

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS student_recommendations (
        rec_id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student(student_id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES course(course_id) ON DELETE CASCADE,
        score INTEGER DEFAULT 0,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, course_id)
    );
  `;
  try {
    await db.query(query);
    console.log("Table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    process.exit();
  }
}

createTable();
