const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// M-Pesa STK Push endpoint
app.post('/api/stk-push', async (req, res) => {
    try {
        const { amount, phoneNumber } = req.body;
        
        if (!amount || !phoneNumber) {
            return res.status(400).json({ error: 'Amount and phone number are required' });
        }

        // For testing, just return success
        res.json({ 
            success: true, 
            message: 'Payment request received',
            data: { amount, phoneNumber }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export the Express API
module.exports = app; 