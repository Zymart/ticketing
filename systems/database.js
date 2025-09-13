// systems/database.js - Persistent database system using Railway PostgreSQL
const fs = require('fs');

// Database connection (Railway PostgreSQL when available, JSON fallback)
let db = null;
let usePostgres = false;

// Initialize database
async function initDatabase() {
    // Try to connect to Railway PostgreSQL first
    if (process.env.DATABASE_URL) {
        try {
            const { Pool } = require('pg');
            db = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            });
            
            // Test connection
            await db.query('SELECT NOW()');
            console.log('✅ Connected to PostgreSQL database');
            
            // Create tables if they don't exist
            await createTables();
            usePostgres = true;
            
        } catch (error) {
            console.log('❌ PostgreSQL not available, using JSON storage');
            usePostgres = false;
        }
    }
    
    if (!usePostgres) {
        console.log('📁 Using JSON file storage');
        ensureDataDirectory();
    }
}

// Create database tables
async function createTables() {
    try {
        // Users table for persistent user data
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR(20) PRIMARY KEY,
                username VARCHAR(100),
                display_name VARCHAR(100),
                total_orders INTEGER DEFAULT 0,
                total_spent DECIMAL(10,2) DEFAULT 0.00,
                reputation INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Orders table for order history
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                order_id VARCHAR(20) PRIMARY KEY,
                customer_id VARCHAR(20),
                service_type VARCHAR(200),
                order_details TEXT,
                quantity VARCHAR(100),
                budget VARCHAR(50),
                urgency VARCHAR(100),
                status VARCHAR(20) DEFAULT 'pending',
                claimed_by VARCHAR(20),
                completed_by VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                claimed_at TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES users(user_id)
            )
        `);

        // Shop items table
        await db.query(`
            CREATE TABLE IF NOT EXISTS shop_items (
                item_id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(100),
                stock INTEGER DEFAULT -1,
                image_url VARCHAR(500),
                created_by VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            )
        `);

        // User inventory table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_inventory (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(20),
                item_id INTEGER,
                quantity INTEGER DEFAULT 1,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (item_id) REFERENCES shop_items(item_id)
            )
        `);

        // Trade requests table
        await db.query(`
            CREATE TABLE IF NOT EXISTS trade_requests (
                trade_id SERIAL PRIMARY KEY,
                requester_id VARCHAR(20),
                target_id VARCHAR(20),
                game_platform VARCHAR(50),
                requester_offer TEXT,
                target_offer TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (requester_id) REFERENCES users(user_id),
                FOREIGN KEY (target_id) REFERENCES users(user_id)
            )
        `);

        // User balances table (for virtual currency)
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_balances (
                user_id VARCHAR(20) PRIMARY KEY,
                balance DECIMAL(10,2) DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `);

        console.log('✅ Database tables created successfully');
        
    } catch (error) {
        console.error('❌ Error creating database tables:', error);
    }
}

// Ensure data directory exists for JSON fallback
function ensureDataDirectory() {
    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data');
    }
}

// User data functions
async function getUser(userId) {
    if (usePostgres) {
        try {
            const result = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    } else {
        // JSON fallback
        try {
            if (fs.existsSync('./data/users.json')) {
                const users = JSON.parse(fs.readFileSync('./data/users.json', 'utf8'));
                return users[userId] || null;
            }
        } catch (error) {
            console.error('Error reading user data:', error);
        }
        return null;
    }
}

async function createOrUpdateUser(userId, userData) {
    if (usePostgres) {
        try {
            await db.query(`
                INSERT INTO users (user_id, username, display_name, total_orders, total_spent, reputation)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    username = $2,
                    display_name = $3,
                    total_orders = $4,
                    total_spent = $5,
                    reputation = $6,
                    updated_at = CURRENT_TIMESTAMP
            `, [userId, userData.username, userData.displayName, userData.totalOrders || 0, userData.totalSpent || 0, userData.reputation || 0]);
        } catch (error) {
            console.error('Error creating/updating user:', error);
        }
    } else {
        // JSON fallback
        try {
            let users = {};
            if (fs.existsSync('./data/users.json')) {
                users = JSON.parse(fs.readFileSync('./data/users.json', 'utf8'));
            }
            users[userId] = userData;
            fs.writeFileSync('./data/users.json', JSON.stringify(users, null, 2));
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }
}

// Order data functions
async function saveOrder(orderData) {
    if (usePostgres) {
        try {
            await db.query(`
                INSERT INTO orders (order_id, customer_id, service_type, order_details, quantity, budget, urgency, status, claimed_by, completed_by, created_at, claimed_at, completed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (order_id)
                DO UPDATE SET
                    status = $8,
                    claimed_by = $9,
                    completed_by = $10,
                    claimed_at = $12,
                    completed_at = $13
            `, [
                orderData.orderId,
                orderData.customer.id,
                orderData.serviceType,
                orderData.details,
                orderData.quantity,
                orderData.budget,
                orderData.urgency,
                orderData.status,
                orderData.claimedBy?.id,
                orderData.completedBy?.id,
                new Date(orderData.createdAt),
                orderData.claimedAt ? new Date(orderData.claimedAt) : null,
                orderData.completedAt ? new Date(orderData.completedAt) : null
            ]);
        } catch (error) {
            console.error('Error saving order:', error);
        }
    } else {
        // JSON fallback (existing system)
        try {
            let orders = [];
            if (fs.existsSync('./data/orders.json')) {
                orders = JSON.parse(fs.readFileSync('./data/orders.json', 'utf8'));
            }
            
            const existingIndex = orders.findIndex(o => o.orderId === orderData.orderId);
            if (existingIndex !== -1) {
                orders[existingIndex] = orderData;
            } else {
                orders.push(orderData);
            }
            
            fs.writeFileSync('./data/orders.json', JSON.stringify(orders, null, 2));
        } catch (error) {
            console.error('Error saving order to JSON:', error);
        }
    }
}

// Shop item functions
async function getShopItems() {
    if (usePostgres) {
        try {
            const result = await db.query('SELECT * FROM shop_items WHERE is_active = true ORDER BY created_at DESC');
            return result.rows;
        } catch (error) {
            console.error('Error getting shop items:', error);
            return [];
        }
    } else {
        // JSON fallback
        try {
            if (fs.existsSync('./data/shop_items.json')) {
                return JSON.parse(fs.readFileSync('./data/shop_items.json', 'utf8'));
            }
        } catch (error) {
            console.error('Error reading shop items:', error);
        }
        return [];
    }
}

async function createShopItem(itemData) {
    if (usePostgres) {
        try {
            const result = await db.query(`
                INSERT INTO shop_items (name, description, price, category, stock, image_url, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING item_id
            `, [itemData.name, itemData.description, itemData.price, itemData.category, itemData.stock, itemData.imageUrl, itemData.createdBy]);
            return result.rows[0].item_id;
        } catch (error) {
            console.error('Error creating shop item:', error);
            return null;
        }
    } else {
        // JSON fallback
        try {
            let items = [];
            if (fs.existsSync('./data/shop_items.json')) {
                items = JSON.parse(fs.readFileSync('./data/shop_items.json', 'utf8'));
            }
            
            const newItem = {
                ...itemData,
                item_id: Date.now(),
                created_at: new Date().toISOString(),
                is_active: true
            };
            
            items.push(newItem);
            fs.writeFileSync('./data/shop_items.json', JSON.stringify(items, null, 2));
            return newItem.item_id;
        } catch (error) {
            console.error('Error creating shop item:', error);
            return null;
        }
    }
}

// User balance functions
async function getUserBalance(userId) {
    if (usePostgres) {
        try {
            const result = await db.query('SELECT balance FROM user_balances WHERE user_id = $1', [userId]);
            return result.rows[0]?.balance || 0;
