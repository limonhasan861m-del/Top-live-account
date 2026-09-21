const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

let userData = {
    name: "Soniya_Live",
    isVip: true,
    isActive: true,
    accountNo: "321054258TR", // ১২ ডিজিট
    profilePic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
    balance: 345.50,
    transactions: [
        { id: 1, note: "Received $5.00", status: "Success", amount: 5.00, date: "20 Sep 2026 • 11:30 PM", type: "add" },
        { id: 2, note: "Received $10.00", status: "Success", amount: 10.00, date: "20 Sep 2026 • 11:15 PM", type: "add" },
        { id: 3, note: "Received $3.50", status: "Success", amount: 3.50, date: "20 Sep 2026 • 10:45 PM", type: "add" }
    ]
};

app.get('/api/user', (req, res) => {
    res.json(userData);
});

// প্রোফাইল আপডেট
app.post('/api/user/update', (req, res) => {
    const { name, profilePic, accountNo } = req.body;
    if (name) userData.name = name;
    if (profilePic) userData.profilePic = profilePic;
    if (accountNo) userData.accountNo = accountNo;
    res.json({ success: true, userData });
});

// উইথড্র/পেমেন্ট রিকোয়েস্ট (পেন্ডিং দেখাবে)
app.post('/api/user/withdraw', (req, res) => {
    const { method, accountNo, amount } = req.body;
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount" });
    }

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
    res.json({ success: true, userData });
});

// এডমিন ব্যালেন্স ও হিস্ট্রি কন্ট্রোল (যোগ করা / কেটে নেওয়া)
app.post('/api/admin/balance', (req, res) => {
    const { amount, action, note } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount" });
    }

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
    res.json({ success: true, userData });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
