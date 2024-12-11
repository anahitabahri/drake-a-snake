import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES module path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Database setup with default data
const adapter = new JSONFile(join(__dirname, 'db.json'));
const defaultData = { users: [] }  // This is the required default data
const db = new Low(adapter, defaultData);

// Initialize database
await db.read();
await db.write();  // Ensure the file exists with default data

// API Routes

// Create/Get User
app.post('/api/user', async (req, res) => {
    const { username } = req.body;
    
    // Check if user exists
    let user = db.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user) {
        // Create new user
        user = {
            username,
            memesDiscovered: [],
            totalWins: 0
        };
        db.data.users.push(user);
        await db.write();
    }
    
    res.json(user);
});

// Update user score when they discover a new meme
app.post('/api/score', async (req, res) => {
    const { username, memeId } = req.body;
    
    let user = db.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (user) {
        // Add meme to discovered list if not already there
        if (!user.memesDiscovered.includes(memeId)) {
            user.memesDiscovered.push(memeId);
        }
        user.totalWins++;
        await db.write();
        res.json(user);
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
    const leaderboard = db.data.users
        .sort((a, b) => {
            // Sort by unique memes discovered
            const memesDiff = b.memesDiscovered.length - a.memesDiscovered.length;
            // If tie, sort by total wins
            if (memesDiff === 0) {
                return b.totalWins - a.totalWins;
            }
            return memesDiff;
        })
        .slice(0, 10) // Get top 10
        .map(user => ({
            username: user.username,
            uniqueMemes: user.memesDiscovered.length,
            totalWins: user.totalWins
        }));
    
    res.json(leaderboard);
});

// Test route
app.get('/test', (req, res) => {
    console.log('Test route hit!');
    res.json({ message: 'Server is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the game`);
});