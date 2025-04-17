const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the root directory
app.use(express.static(path.join(__dirname, './')));

// M-Pesa credentials from environment variables
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const PASSKEY = process.env.PASSKEY;
const SHORTCODE = process.env.SHORTCODE;
const CALLBACK_URL = process.env.CALLBACK_URL;

// Verify credentials are loaded
if (!CONSUMER_KEY || !CONSUMER_SECRET || !PASSKEY || !SHORTCODE) {
    console.error('Error: M-Pesa credentials are missing. Please check your .env file.');
    process.exit(1);
}

// Get access token
async function getAccessToken() {
    try {
        console.log('Getting access token...');
        const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: {
                Authorization: `Basic ${Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')}`
            }
        });
        console.log('Access token received successfully');
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error.response?.data || error.message);
        throw error;
    }
}

// STK Push endpoint
app.post('/api/stk-push', async (req, res) => {
    try {
        console.log('Received STK Push request:', req.body);
        const { amount, phoneNumber } = req.body;
        
        if (!amount || !phoneNumber) {
            console.error('Missing required fields:', { amount, phoneNumber });
            return res.status(400).json({ error: 'Amount and phone number are required' });
        }

        // Format phone number to start with 254
        const formattedPhone = phoneNumber.startsWith('254') ? phoneNumber : `254${phoneNumber.slice(1)}`;
        console.log('Formatted phone number:', formattedPhone);

        const accessToken = await getAccessToken();
        console.log('Access token:', accessToken);

        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');
        console.log('Generated password:', password);

        const stkPushData = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount), // Ensure amount is a whole number for KES
            PartyA: formattedPhone,
            PartyB: SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: CALLBACK_URL,
            AccountReference: 'FoodDelivery',
            TransactionDesc: 'Payment for food delivery (KES)'
        };

        console.log('Sending STK Push request to M-Pesa with data:', stkPushData);

        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkPushData,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('STK Push response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error processing STK Push:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to process payment',
            details: error.response?.data || error.message
        });
    }
});

// Callback endpoint
app.post('/callback', (req, res) => {
    console.log('Payment callback received:', req.body);
    res.status(200).send('OK');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('M-Pesa credentials loaded successfully');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Callback URL:', CALLBACK_URL);
    console.log('Consumer Key:', CONSUMER_KEY);
    console.log('Shortcode:', SHORTCODE);
}); 