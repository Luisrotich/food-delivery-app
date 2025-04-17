const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// Enhanced CORS configuration for mobile support
app.use(cors({
    origin: '*', // Allow all origins for testing
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, './')));

// M-Pesa credentials from environment variables
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const PASSKEY = process.env.PASSKEY;
const SHORTCODE = process.env.SHORTCODE;
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://your-domain.vercel.app/callback';

// Verify credentials are loaded
if (!CONSUMER_KEY || !CONSUMER_SECRET || !PASSKEY || !SHORTCODE) {
    console.error('Warning: Some M-Pesa credentials are missing. Payment features may not work properly.');
    console.error('Missing credentials:', {
        CONSUMER_KEY: !CONSUMER_KEY,
        CONSUMER_SECRET: !CONSUMER_SECRET,
        PASSKEY: !PASSKEY,
        SHORTCODE: !SHORTCODE,
        CALLBACK_URL: !CALLBACK_URL
    });
}

// Add a basic health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: process.env.NODE_ENV,
        mpesa: {
            configured: !!(CONSUMER_KEY && CONSUMER_SECRET && PASSKEY && SHORTCODE)
        }
    });
});

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Get access token with retry mechanism
async function getAccessToken(retries = 3) {
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
        if (retries > 0) {
            console.log(`Retrying... ${retries} attempts remaining`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return getAccessToken(retries - 1);
        }
        throw error;
    }
}

// STK Push endpoint with enhanced error handling
app.post('/api/stk-push', async (req, res) => {
    try {
        console.log('Received STK Push request:', req.body);
        const { amount, phoneNumber } = req.body;
        
        if (!amount || !phoneNumber) {
            console.error('Missing required fields:', { amount, phoneNumber });
            return res.status(400).json({ 
                error: 'Amount and phone number are required',
                details: { amount, phoneNumber }
            });
        }

        // Enhanced phone number formatting
        let formattedPhone = phoneNumber;
        if (phoneNumber.startsWith('0')) {
            formattedPhone = `254${phoneNumber.slice(1)}`;
        } else if (phoneNumber.startsWith('+')) {
            formattedPhone = phoneNumber.slice(1);
        } else if (!phoneNumber.startsWith('254')) {
            formattedPhone = `254${phoneNumber}`;
        }
        
        console.log('Formatted phone number:', formattedPhone);

        const accessToken = await getAccessToken();
        console.log('Access token obtained successfully');

        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

        const stkPushData = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: CALLBACK_URL,
            AccountReference: 'FoodDelivery',
            TransactionDesc: 'Payment for food delivery'
        };

        console.log('Sending STK Push request to M-Pesa...');

        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkPushData,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        console.log('STK Push response:', response.data);
        
        if (response.data.ResponseCode === '0') {
            res.json({
                success: true,
                message: 'STK Push initiated successfully',
                data: response.data
            });
        } else {
            throw new Error(response.data.ResponseDescription || 'Failed to initiate STK Push');
        }
    } catch (error) {
        console.error('Error processing STK Push:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to process payment',
            details: error.response?.data || error.message
        });
    }
});

// Enhanced callback endpoint
app.post('/callback', (req, res) => {
    console.log('Payment callback received:', req.body);
    // Process the callback data
    const callbackData = req.body;
    if (callbackData.Body && callbackData.Body.stkCallback) {
        const result = callbackData.Body.stkCallback.ResultDesc;
        console.log('Payment result:', result);
    }
    res.status(200).send('OK');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false,
        error: 'Something went wrong!',
        details: err.message
    });
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