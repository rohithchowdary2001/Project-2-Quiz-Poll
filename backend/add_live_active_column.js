const database = require('./src/config/database');

async function addLiveActiveColumn() {
    try {
        console.log('🔄 Checking if is_live_active column exists...');
        
        // Check if column already exists
        const columns = await database.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'quiz_management' 
            AND TABLE_NAME = 'quizzes' 
            AND COLUMN_NAME = 'is_live_active'
        `);

        if (columns.length > 0) {
            console.log('✅ Column is_live_active already exists');
        } else {
            console.log('🔄 Adding is_live_active column to quizzes table...');
            await database.query(`
                ALTER TABLE quizzes 
                ADD COLUMN is_live_active BOOLEAN DEFAULT FALSE
            `);
            console.log('✅ Column is_live_active added successfully');
        }

        // Verify the column was added by checking table structure
        console.log('🔄 Verifying column exists...');
        const tableInfo = await database.query(`DESCRIBE quizzes`);
        const hasColumn = tableInfo.some(col => col.Field === 'is_live_active');
        
        if (hasColumn) {
            console.log('✅ Verification successful - is_live_active column exists');
        } else {
            console.log('❌ Verification failed - column not found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Error details:', error);
    } finally {
        process.exit(0);
    }
}

addLiveActiveColumn();
