const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// M-Pesa credentials from environment variables
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const PASSKEY = process.env.PASSKEY;
const SHORTCODE = process.env.SHORTCODE;
const CALLBACK_URL = process.env.CALLBACK_URL;

// Get access token
async function getAccessToken() {
    try {
        console.log('Getting access token...');
        const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
        const response = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            }
        );
        console.log('Access token received successfully');
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error.response?.data || error.message);
        throw error;
    }
}

// Enhanced health check that provides more debugging information
app.get('/api/health', async (req, res) => {
    try {
        // Test M-Pesa credentials
        let mpesaStatus = {
            consumer_key_present: !!CONSUMER_KEY,
            consumer_secret_present: !!CONSUMER_SECRET,
            passkey_present: !!PASSKEY,
            shortcode_present: !!SHORTCODE,
            callback_url_present: !!CALLBACK_URL,
            callback_url: CALLBACK_URL || 'Not set',
            vercel_url: process.env.VERCEL_URL || 'Not set'
        };

        // Try to get access token if credentials are present
        let tokenStatus = 'Not tested';
        if (CONSUMER_KEY && CONSUMER_SECRET) {
            try {
                const token = await getAccessToken();
                tokenStatus = token ? 'Success' : 'Failed';
            } catch (error) {
                tokenStatus = `Error: ${error.message}`;
            }
        }

        res.json({
            status: 'ok',
            environment: process.env.NODE_ENV || 'Not set',
            mpesa_configuration: mpesaStatus,
            access_token_test: tokenStatus,
            server_time: new Date().toISOString(),
            api_endpoints: {
                health: '/api/health',
                stk_push: '/api/stk-push',
                callback: '/api/callback'
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Enhanced STK Push endpoint with better error handling
app.post('/api/stk-push', async (req, res) => {
    try {
        console.log('Received STK Push request:', {
            ...req.body,
            headers: req.headers
        });
        
        const { amount, phoneNumber } = req.body;
        
        // Validate input
        if (!amount || !phoneNumber) {
            return res.status(400).json({
                error: 'Validation failed',
                details: {
                    amount: !amount ? 'Amount is required' : null,
                    phoneNumber: !phoneNumber ? 'Phone number is required' : null
                }
            });
        }

        // Validate M-Pesa configuration
        if (!CONSUMER_KEY || !CONSUMER_SECRET || !PASSKEY || !SHORTCODE) {
            return res.status(500).json({
                error: 'M-Pesa configuration incomplete',
                details: {
                    consumer_key: !CONSUMER_KEY ? 'Missing' : 'Present',
                    consumer_secret: !CONSUMER_SECRET ? 'Missing' : 'Present',
                    passkey: !PASSKEY ? 'Missing' : 'Present',
                    shortcode: !SHORTCODE ? 'Missing' : 'Present'
                }
            });
        }

        // Format and validate phone number
        let formattedPhone = phoneNumber;
        if (phoneNumber.startsWith('0')) {
            formattedPhone = '254' + phoneNumber.slice(1);
        } else if (phoneNumber.startsWith('+254')) {
            formattedPhone = phoneNumber.slice(1);
        }
        
        if (!/^254[0-9]{9}$/.test(formattedPhone)) {
            return res.status(400).json({
                error: 'Invalid phone number format',
                details: 'Phone number must be in the format 254XXXXXXXXX',
                received: phoneNumber,
                formatted: formattedPhone
            });
        }

        console.log('Formatted phone number:', formattedPhone);

        // Get access token
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return res.status(500).json({
                error: 'Failed to get access token',
                details: 'Could not authenticate with M-Pesa'
            });
        }

        // Generate timestamp and password
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

        // Prepare STK Push request
        const stkPushData = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: CALLBACK_URL || `https://${process.env.VERCEL_URL}/api/callback`,
            AccountReference: 'FoodDelivery',
            TransactionDesc: 'Payment for food delivery'
        };

        console.log('Sending STK Push request with data:', {
            ...stkPushData,
            Password: '[HIDDEN]'
        });

        // Make the STK Push request
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
        
        // Send success response
        res.json({
            success: true,
            message: 'STK Push sent successfully',
            data: response.data
        });
    } catch (error) {
        console.error('Error processing STK Push:', {
            message: error.message,
            response: error.response?.data,
            stack: error.stack
        });

        // Send detailed error response
        res.status(500).json({
            error: 'Payment processing failed',
            message: error.message,
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Callback endpoint for M-Pesa
app.post('/api/callback', (req, res) => {
    console.log('Payment callback received:', req.body);
    res.status(200).send('OK');
});

// Export the Express API
module.exports = app; 