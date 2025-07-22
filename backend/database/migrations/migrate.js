const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class DatabaseMigrator {
    constructor() {
        this.connection = mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });
    }

    async migrate() {
        try {
            console.log('🔄 Starting database migration...');
            
            // Read the schema file
            const schemaPath = path.join(__dirname, '../../../database/schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Execute the schema
            await this.executeQuery(schema);
            
            console.log('✅ Database migration completed successfully!');
            console.log('📋 Created tables:');
            console.log('   - users (with roles: admin, professor, student)');
            console.log('   - classes (with professor relationships)');
            console.log('   - class_enrollments (student-class many-to-many)');
            console.log('   - quizzes (with time limits and deadlines)');
            console.log('   - questions (with different types)');
            console.log('   - answer_options (for quiz questions)');
            console.log('   - quiz_submissions (student submissions)');
            console.log('   - student_answers (individual question answers)');
            console.log('   - quiz_templates (for reusing quizzes)');
            console.log('   - system_settings (configuration)');
            console.log('   - audit_logs (activity tracking)');
            console.log('');
            console.log('📊 Created views:');
            console.log('   - class_statistics');
            console.log('   - quiz_results_summary');
            console.log('   - student_progress');
            console.log('');
            console.log('⚡ Performance indexes created');
            console.log('🔧 Default system settings inserted');
            
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            process.exit(1);
        } finally {
            this.connection.end();
        }
    }

    executeQuery(query) {
        return new Promise((resolve, reject) => {
            this.connection.query(query, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    }

    async checkConnection() {
        try {
            await this.executeQuery('SELECT 1');
            console.log('✅ Database connection successful');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
    }

    async showTables() {
        try {
            const results = await this.executeQuery('SHOW TABLES FROM quiz_management');
            console.log('📋 Tables in quiz_management database:');
            results.forEach((row, index) => {
                const tableName = Object.values(row)[0];
                console.log(`   ${index + 1}. ${tableName}`);
            });
        } catch (error) {
            console.error('❌ Error showing tables:', error.message);
        }
    }
}

// Command line interface
const args = process.argv.slice(2);
const migrator = new DatabaseMigrator();

async function main() {
    if (args.includes('--check')) {
        await migrator.checkConnection();
        return;
    }

    if (args.includes('--show-tables')) {
        await migrator.showTables();
        return;
    }

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
📚 Database Migration Tool

Usage: node migrate.js [options]

Options:
  --check        Check database connection
  --show-tables  Show all tables in the database
  --help, -h     Show this help message

Examples:
  node migrate.js              # Run migration
  node migrate.js --check      # Test connection
  node migrate.js --show-tables # List tables
        `);
        return;
    }

    // Default action: run migration
    const connected = await migrator.checkConnection();
    if (connected) {
        await migrator.migrate();
        await migrator.showTables();
    }
}

main().catch(console.error);

module.exports = DatabaseMigrator; 