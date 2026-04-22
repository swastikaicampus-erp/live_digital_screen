const admin = require('firebase-admin');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');
const KEYS_FILE = path.join(__dirname, 'keys.json');

// Firebase Admin Initialization
try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT.startsWith('{')
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin Initialized Successfully");
} catch (error) {
    console.error("❌ Firebase Init Error:", error.message);
}

// Routes Import 
const adRoutes = require('./routes/adRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const planRoutes = require('./routes/planRoutes');

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Middleware - Image upload ke liye limit badhayi gayi hai
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- USER SCHEMA ---
const UserSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    fullName: String,
    email: String,
    shopName: String,
    phone: String,
    selectedPlan: String,
    planPrice: String,
    screens: { type: Number, default: 1 },
    transactionId: { type: String, required: true },
    paymentScreenshot: { type: String }, // Base64 String
    isActive: { type: Boolean, default: false }, // Default False (Admin approval needed)
    expiryDate: { type: Date },
    history: [{
        plan: String,
        price: Number,
        screens: Number,
        date: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});
// --- MASTER CONFIG SCHEMA ---
const ConfigSchema = new mongoose.Schema({
    key: { type: String, default: 'master_settings' },
    password: { type: String, default: 'ADMIN@SIGNAGE#2025' }
});
const Config = mongoose.models.Config || mongoose.model('Config', ConfigSchema);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected successfully!'))
    .catch(err => console.error('❌ DB Connection Error:', err));

// --- HELPER: Calculate Expiry ---
const calculateExpiry = (planString) => {
    const months = parseInt(planString) || 3;
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
};

// --- 1. USER REGISTRATION API ---
app.post('/api/users/register', async (req, res) => {
    try {
        const {
            uid,
            fullName,
            email,
            shopName,
            phone,
            selectedPlan,
            planPrice,
            screens,
            transactionId,
            paymentScreenshot
        } = req.body;

        const newUser = new User({
            uid,
            fullName,
            email,
            shopName,
            phone,
            selectedPlan,
            planPrice,
            screens: parseInt(screens) || 1,
            transactionId,
            paymentScreenshot,
            isActive: false,
            expiryDate: calculateExpiry(selectedPlan),
            history: [{
                plan: selectedPlan,
                price: Number(planPrice),
                screens: Number(screens) || 1,
                date: new Date()
            }]
        });

        await newUser.save();
        res.status(201).json({ success: true, message: "Registered! Waiting for admin approval." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// --- Get All Users with Screen Stats ---
app.get('/api/master/users', async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });

        // Fix: user.screenCount ki jagah user.screens use karein
        const totalScreensDeployed = users.reduce((sum, user) => sum + (user.screens || 0), 0);

        res.json({
            success: true,
            count: users.length,
            totalScreens: totalScreensDeployed,
            users
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Is route ko "USER REGISTRATION API" ke neeche add karein
app.get('/api/users/me', async (req, res) => {
    try {
        // Frontend se authorization header mein UID ya Token aayega
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "No token provided" });

        // Note: Ideal case mein yahan Firebase Admin SDK se token verify hona chahiye
        // Par abhi ke liye hum UID se check kar rahe hain (agar aap token bhej rahe hain)
        const token = authHeader.split(' ')[1];

        // Firebase token se UID nikalne ka logic (Recommended)
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;

        const user = await User.findOne({ uid: uid });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Hum status field dynamically bhejenge
        res.json({
            uid: user.uid,
            status: user.isActive ? 'active' : 'pending', // isActive false hai toh pending
            expiryDate: user.expiryDate
        });
    } catch (err) {
        res.status(401).json({ message: "Invalid Token" });
    }
});
// Apne existing toggle-status route ko update karein
app.put('/api/master/toggle-status/:uid', async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.uid });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.isActive = !user.isActive;
        await user.save();

        // --- NAYA LOGIC: Logout command bhejna agar deactivate kiya hai ---
        if (!user.isActive) {
            io.to(req.params.uid).emit('force_logout', { message: "Your account has been suspended." });
        } else {
            io.to(req.params.uid).emit('status_changed', { isActive: user.isActive });
        }

        res.json({
            success: true,
            message: `User ${user.isActive ? 'Activated' : 'Suspended'} successfully`,
            isActive: user.isActive
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// --- 2. MASTER APIs (For Admin Panel) ---
app.use('/api/plans', planRoutes);

// --- MASTER PASSWORD APIs ---
app.get('/api/master/config', async (req, res) => {
    try {
        let config = await Config.findOne({ key: 'master_settings' });
        if (!config) {
            config = new Config();
            await config.save();
        }
        res.json({ success: true, password: config.password });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/master/config', async (req, res) => {
    try {
        const { password } = req.body;
        const config = await Config.findOneAndUpdate(
            { key: 'master_settings' },
            { password: password },
            { new: true, upsert: true }
        );
        res.json({ success: true, message: "Master Password Updated!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});




// Plan Renew with History
app.put('/api/master/renew-plan/:uid', async (req, res) => {
    try {
        const { selectedPlan, planPrice, screens } = req.body;

        // 1. Naya History Object banayein
        const newHistoryRecord = {
            plan: selectedPlan,
            price: Number(planPrice),
            screens: Number(screens) || 1,
            date: new Date()
        };

        // 2. Database update karein ($push ka use karke)
        const updatedUser = await User.findOneAndUpdate(
            { uid: req.params.uid },
            {
                $set: {
                    selectedPlan,
                    planPrice,
                    isActive: true,
                    expiryDate: calculateExpiry(selectedPlan),
                    screens: parseInt(screens) || 1
                },
                $push: { history: newHistoryRecord } // 🟢 History mein record add karein
            },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

        io.to(req.params.uid).emit('plan_updated', updatedUser);

        res.json({
            success: true,
            message: "Plan Renewed & History Updated!",
            data: updatedUser
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// User Delete
app.delete('/api/master/delete-user/:uid', async (req, res) => {
    try {
        await User.findOneAndDelete({ uid: req.params.uid });
        res.json({ success: true, message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// --- PAIRING KEY LOGIC USING FS ---

const readKeys = () => {
    try {
        if (!fs.existsSync(KEYS_FILE)) return [];
        const data = fs.readFileSync(KEYS_FILE, 'utf8').trim();
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.error("Error reading keys file:", err);
        return [];
    }
};

// server.js update
app.get('/api/master/generate-screen-key', (req, res) => {
    try {
        const { uid } = req.query; // Dashboard se aayi User ID
        if (!uid) return res.status(400).json({ success: false, message: "User ID required" });

        const newKey = "GB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        let keys = readKeys();

        // Key ko specific UID ke saath bind kar diya
        keys.push({
            key: newKey,
            uid: uid,
            createdAt: new Date()
        });

        fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
        res.json({ success: true, key: newKey });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error" });
    }
});

app.post('/api/screens/verify', async (req, res) => {
    const { key } = req.body;
    let keys = readKeys();

    const keyData = keys.find(k => k.key === key);

    if (keyData) {
        // Sahi key milte hi wahi UID wapas bhejo jo master ne set ki thi
        const responseUid = keyData.uid;

        // Key delete karein (Single use)
        const updatedKeys = keys.filter(k => k.key !== key);
        fs.writeFileSync(KEYS_FILE, JSON.stringify(updatedKeys, null, 2));

        res.json({
            success: true,
            userId: responseUid,
            message: "Device Linked Successfully!"
        });
    } else {
        res.status(400).json({ success: false, message: "Invalid Key" });
    }
});

// Keys file se specific UID ki keys return karo
app.get('/api/screens/my-keys', async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ success: false, message: "UID required" });

        const keys = readKeys();
        const userKeys = keys.filter(k => k.uid === uid);

        res.json({ success: true, keys: userKeys });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- 🚀 REAL-TIME SOCKET LOGIC ---
const activeDevices = new Set();

io.on('connection', (socket) => {
    console.log(`[SOCKET] Connected: ${socket.id}`);

    socket.on('register_device', (deviceId) => {
        socket.join(deviceId);
        activeDevices.add(deviceId);
        io.emit('online_devices_count', activeDevices.size);
        console.log(`[SOCKET] Device Online: ${deviceId}`);
    });

    socket.on('admin_command', (data) => {
        const { targetId, command } = data;
        io.to(targetId).emit('admin_command', data);
    });

    socket.on('disconnect', () => {
        // Socket mapping logic should be added here for precise device tracking
        activeDevices.delete(socket.id);
        io.emit('online_devices_count', activeDevices.size);
        console.log(`[SOCKET] Disconnected: ${socket.id}`);
    });
});

// Routes usage
app.use('/api/ads', adRoutes(io));
app.use('/api/playlists', playlistRoutes(io));
app.use('/api/plans', planRoutes);
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));