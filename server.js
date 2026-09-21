const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

// MongoDB Connection String
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://limonhasan861m_db_user:F89kzc4wV4pPz8e@cluster0.txpczai.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// MongoDB Schema Definition
const userSchema = new mongoose.Schema({
    userId: { type: String, default: "default_user", unique: true },
    name: { type: String, default: "Soniya_Live" },
    isVip: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    accountNo: { type: String, default: "321054258TR" },
    profilePic: { type: String, default: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" },
    balance: { type: Number, default: 345.50 },
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

// ইনিশিয়াল ডাটা নিশ্চিত করার ফাংশন
async function getOrCreateUser() {
    let user = await User.findOne({ userId: "default_user" });
    if (!user) {
        user = await User.create({
            userId: "default_user",
            name: "Soniya_Live",
            isVip: true,
            isActive: true,
            accountNo: "321054258TR",
            profilePic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
            balance: 345.50,
            transactions: [
                { id: 1, note: "Received $5.00", status: "Success", amount: 5.00, date: "20 Sep 2026 • 11:30 PM", type: "add" },
                { id: 2, note: "Received $10.00", status: "Success", amount: 10.00, date: "20 Sep 2026 • 11:15 PM", type: "add" },
                { id: 3, note: "Received $3.50", status: "Success", amount: 3.50, date: "20 Sep 2026 • 10:45 PM", type: "add" }
            ]
        });
    }
    return user;
}

app.get('/api/user', async (req, res) => {
    try {
        const userData = await getOrCreateUser();
        res.json(userData);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// প্রোফাইল আপডেট
app.post('/api/user/update', async (req, res) => {
    try {
        const { name, profilePic, accountNo } = req.body;
        const userData = await getOrCreateUser();

        if (name) userData.name = name;
        if (profilePic) userData.profilePic = profilePic;
        if (accountNo) userData.accountNo = accountNo;

        await userData.save();
        res.json({ success: true, userData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// উইথড্র/পেমেন্ট রিকোয়েস্ট (পেন্ডিং দেখাবে)
app.post('/api/user/withdraw', async (req, res) => {
    try {
        const { method, accountNo, amount } = req.body;
        const numAmount = parseFloat(amount);
        
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const userData = await getOrCreateUser();
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
        await userData.save();
        res.json({ success: true, userData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// এডমিন ব্যালেন্স ও হিস্ট্রি কন্ট্রোল (যোগ করা / কেটে নেওয়া)
app.post('/api/admin/balance', async (req, res) => {
    try {
        const { amount, action, note } = req.body;
        const numAmount = parseFloat(amount);

        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const userData = await getOrCreateUser();

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
