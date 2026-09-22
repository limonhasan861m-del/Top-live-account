const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

// MongoDB Atlas Connection String
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://limon:Limon123456@cluster0.txpczai.mongodb.net/moss_wallet?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Database Schema Setup
const userSchema = new mongoose.Schema({
    userId: { type: String, default: "default_user", unique: true },
    name: { type: String, default: "Moss sathi_Live" },
    paymentMethod: { type: String, default: "bKash" },
    accountNo: { type: String, default: "321054258TR" },
    profilePic: { type: String, default: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" },
    balance: { type: Number, default: 0.50 },
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

// Helper function to get or setup default user
async function getOrCreateUser() {
    let user = await User.findOne({ userId: "default_user" });
    if (!user) {
        user = await User.create({
            userId: "default_user",
            name: "Moss sathi_Live",
            paymentMethod: "bKash",
            accountNo: "321054258TR",
            profilePic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
            balance: 0.50,
            transactions: [
                { id: 1, note: "Received $0.50", status: "Success", amount: 0.50, date: "22 Sep 2026 • 11:30 AM", type: "add" }
            ]
        });
    }
    return user;
}

// User Data API
app.get('/api/user', async (req, res) => {
    try {
        const userData = await getOrCreateUser();
        res.json(userData);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Profile Update API
app.post('/api/user/update', async (req, res) => {
    try {
        const { name, profilePic, accountNo, paymentMethod } = req.body;
        let userData = await User.findOne({ userId: "default_user" });
        if (!userData) userData = await getOrCreateUser();

        if (name) userData.name = name;
        if (profilePic) userData.profilePic = profilePic;
        if (accountNo) userData.accountNo = accountNo;
        if (paymentMethod) userData.paymentMethod = paymentMethod;

        await userData.save();
        res.json({ success: true, userData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin Balance & History Control
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
        await userData.save();
        res.json({ success: true, userData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
