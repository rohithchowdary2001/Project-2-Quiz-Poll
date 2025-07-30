const mysql = require('mysql2');
require('dotenv').config();

class Database {
    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'quiz_management',
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            charset: 'utf8mb4'
        });

        this.promisePool = this.pool.promise();
    }

    async query(sql, params = []) {
        try {
            const [results] = await this.promisePool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async transaction(callback) {
        const connection = await this.promisePool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const result = await callback(connection);
            
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async testConnection() {
        try {
            const result = await this.query('SELECT 1 as test');
            console.log('✅ Database connection successful');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
    }

    async close() {
        await this.pool.end();
    }

    // Helper methods for common operations
    async findById(table, id) {
        const sql = `SELECT * FROM ${table} WHERE id = ?`;
        const results = await this.query(sql, [id]);
        return results[0] || null;
    }

    async findOne(table, conditions = {}) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(conditions);
        
        const sql = `SELECT * FROM ${table} ${whereClause ? `WHERE ${whereClause}` : ''} LIMIT 1`;
        const results = await this.query(sql, values);
        return results[0] || null;
    }

    async findAll(table, conditions = {}, options = {}) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(conditions);
        
        let sql = `SELECT * FROM ${table}`;
        
        if (whereClause) {
            sql += ` WHERE ${whereClause}`;
        }
        
        if (options.orderBy) {
            sql += ` ORDER BY ${options.orderBy}`;
        }
        
        if (options.limit) {
            sql += ` LIMIT ${options.limit}`;
        }
        
        if (options.offset) {
            sql += ` OFFSET ${options.offset}`;
        }
        
        return await this.query(sql, values);
    }

    async insert(table, data) {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);
        
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        const result = await this.query(sql, values);
        
        return {
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    }

    async update(table, data, conditions) {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        
        const values = [...Object.values(data), ...Object.values(conditions)];
        
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        const result = await this.query(sql, values);
        
        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    }

    async delete(table, conditions) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(conditions);
        
        const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
        const result = await this.query(sql, values);
        
        return {
            affectedRows: result.affectedRows
        };
    }

    async count(table, conditions = {}) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(conditions);
        
        const sql = `SELECT COUNT(*) as count FROM ${table} ${whereClause ? `WHERE ${whereClause}` : ''}`;
        const results = await this.query(sql, values);
        return results[0].count;
    }

    async exists(table, conditions) {
        const count = await this.count(table, conditions);
        return count > 0;
    }

    // Pagination helper
    async paginate(table, conditions = {}, page = 1, limit = 10, orderBy = 'id DESC') {
        const offset = (page - 1) * limit;
        const totalCount = await this.count(table, conditions);
        const totalPages = Math.ceil(totalCount / limit);
        
        const data = await this.findAll(table, conditions, {
            orderBy,
            limit,
            offset
        });
        
        return {
            data,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                limit,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }
}

// Create and export database instance
const database = new Database();

module.exports = database; 