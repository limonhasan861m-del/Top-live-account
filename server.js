const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

// MongoDB Connection String
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://limon:Limon123456@cluster0.txpczai.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// MongoDB Schema Definition
const userSchema = new mongoose.Schema({
    userId: { type: String, default: "default_user", unique: true },
    name: { type: String, default: "Moss sathi_Live" },
    isVip: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
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
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ডাটাবেজ থেকে তথ্য আনা এবং ফোর্সেড আপডেট ফাংশন
async function getOrCreateUser() {
    let user = await User.findOne({ userId: "default_user" });
    if (!user) {
        user = await User.create({
            userId: "default_user",
            name: "Moss sathi_Live",
            isVip: true,
            isActive: true,
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

// ইউজার ডাটা পাওয়া
app.get('/api/user', async (req, res) => {
    try {
        const userData = await getOrCreateUser();
        res.json(userData);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// প্রোফাইল আপডেট (নাম, পিকচার, একাউন্ট নং রিয়েল-টাইম সেভ)
app.post('/api/user/update', async (req, res) => {
    try {
        const { name, profilePic, accountNo, isVip, isActive } = req.body;
        let userData = await User.findOne({ userId: "default_user" });

        if (!userData) userData = await getOrCreateUser();

        if (name !== undefined) userData.name = name;
        if (profilePic !== undefined) userData.profilePic = profilePic;
        if (accountNo !== undefined) userData.accountNo = accountNo;
        if (isVip !== undefined) userData.isVip = isVip;
        if (isActive !== undefined) userData.isActive = isActive;

        await userData.save();
        res.json({ success: true, userData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// উইথড্র/পেমেন্ট রিকোয়েস্ট (পেন্ডিং হিস্ট্রি রিয়েল-টাইম)
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
            note: `Withdraw via ${method || 'bKash'} (${accountNo || userData.accountNo})`,
            status: "Pending",
            amount: numAmount,
            date: dateStr,
            type: "deduct"
        };

        userData.transactions.unshift(newTx);
        await userData.save();
        res.json({ success: true, userData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// এডমিন ব্যালেন্স প্লাস/মাইনাস ও রিয়েল-টাইম হিস্ট্রি কন্ট্রোল
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
        res.status(500).json({ success: false, message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
