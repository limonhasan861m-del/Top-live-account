const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

// Direct MongoDB Atlas URI Backup
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://limon:Limon123456@cluster0.txpczai.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Mongoose Schema
const userSchema = new mongoose.Schema({
    userId: { type: String, default: "default_user", unique: true },
    name: { type: String, default: "Moss Sathi_Live" },
    isVip: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    accountNo: { type: String, default: "321054258TR" },
    profilePic: { type: String, default: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" },
    balance: { type: Number, default: 00.50 },
    transactions: [{
        id: Number,
        note: String,
        status: String,
        amount: Number,
        date: String,
        type: String
    }]
});

const User = mongoose.model('User', userSchema);

// Data Retrieval Helper
async function getOrCreateUser() {
    try {
        let user = await User.findOne({ userId: "default_user" });
        if (!user) {
            user = await User.create({
                userId: "default_user",
                name: "Moss Sathi_Live",
                isVip: true,
                isActive: true,
                accountNo: "321054258TR",
                profilePic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
                balance: 00.50,
                transactions: [
                    { id: 1, note: "Received $0.10", status: "Success", amount: 5.00, date: "20 Sep 2026 • 11:30 PM", type: "add" },
                    { id: 2, note: "Received $00.20", status: "Success", amount: 10.00, date: "20 Sep 2026 • 11:15 PM", type: "add" },
                    { id: 3, note: "Received $00.20", status: "Success", amount: 3.50, date: "20 Sep 2026 • 10:45 PM", type: "add" }
                ]
            });
        }
        return user;
    } catch (e) {
        // Fallback object to prevent undefined errors
        return {
            name: "Moss Sathi_Live",
            isVip: true,
            isActive: true,
            accountNo: "321054258TR",
            profilePic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
            balance: 00.50,
            transactions: []
        };
    }
}

app.get('/api/user', async (req, res) => {
    const userData = await getOrCreateUser();
    res.json(userData);
});

// Profile Update
app.post('/api/user/update', async (req, res) => {
    try {
        const { name, profilePic, accountNo } = req.body;
        let userData = await User.findOne({ userId: "default_user" });

        if (!userData) userData = await getOrCreateUser();

        if (name) userData.name = name;
        if (profilePic) userData.profilePic = profilePic;
        if (accountNo) userData.accountNo = accountNo;

        if (userData.save) await userData.save();
        res.json({ success: true, userData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Withdraw
app.post('/api/user/withdraw', async (req, res) => {
    try {
        const { method, accountNo, amount } = req.body;
        const numAmount = parseFloat(amount);
        
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        let userData = await User.findOne({ userId: "default_user" });
        if (!userData) userData = await getOrCreateUser();

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                        ' • ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newTx = {
            id: Date.now(),
            note: `Withdraw via ${method} (${accountNo})`,
            status: "Pending",
            amount: numAmount,
            date: dateStr,
            type: "deduct"
        };

        userData.transactions.unshift(newTx);
        if (userData.save) await userData.save();
        res.json({ success: true, userData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin Balance Control
app.post('/api/admin/balance', async (req, res) => {
    try {
        const { amount, action, note } = req.body;
        const numAmount = parseFloat(amount);

        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        let userData = await User.findOne({ userId: "default_user" });
        if (!userData) userData = await getOrCreateUser();

        if (action === 'add') {
            userData.balance += numAmount;
        } else if (action === 'deduct') {
            userData.balance = Math.max(0, userData.balance - numAmount);
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                        ' • ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newTx = {
            id: Date.now(),
            note: note || (action === 'add' ? `Payment Success` : `Deduction Success`),
            status: "Success",
            amount: numAmount,
            date: dateStr,
            type: action
        };

        userData.transactions.unshift(newTx);
        if (userData.save) await userData.save();
        res.json({ success: true, userData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
