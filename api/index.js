const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Enhanced CORS configuration
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'OPTIONS'], // Allow these methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
    credentials: true // Allow credentials
}));

app.use(express.json());

// Add OPTIONS handler for preflight requests
app.options('*', cors());

// Add headers middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    next();
});

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

// Enhanced STK Push endpoint with mobile support
app.post('/api/stk-push', async (req, res) => {
    try {
        console.log('Received STK Push request:', {
            body: req.body,
            userAgent: req.headers['user-agent'],
            platform: req.headers['sec-ch-ua-platform']
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

        // Validate M-Pesa credentials first
        if (!CONSUMER_KEY || !CONSUMER_SECRET || !PASSKEY || !SHORTCODE) {
            console.error('M-Pesa credentials missing:', {
                consumer_key: !CONSUMER_KEY,
                consumer_secret: !CONSUMER_SECRET,
                passkey: !PASSKEY,
                shortcode: !SHORTCODE
            });
            return res.status(500).json({
                error: 'Payment configuration error',
                message: 'M-Pesa is not properly configured',
                details: {
                    consumer_key: !CONSUMER_KEY ? 'Missing' : 'Present',
                    consumer_secret: !CONSUMER_SECRET ? 'Missing' : 'Present',
                    passkey: !PASSKEY ? 'Missing' : 'Present',
                    shortcode: !SHORTCODE ? 'Missing' : 'Present'
                }
            });
        }

        // Enhanced phone number formatting
        let formattedPhone = phoneNumber.toString().trim();
        // Remove any spaces or special characters
        formattedPhone = formattedPhone.replace(/[^0-9+]/g, '');
        
        // Handle different phone formats
        if (formattedPhone.startsWith('+254')) {
            formattedPhone = formattedPhone.slice(1); // Remove the +
        } else if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
            formattedPhone = '254' + formattedPhone;
        }
        
        // Validate the final phone number format
        if (!/^254[0-9]{9}$/.test(formattedPhone)) {
            return res.status(400).json({
                error: 'Invalid phone number format',
                details: 'Phone number must be a valid Kenyan phone number',
                received: phoneNumber,
                formatted: formattedPhone,
                expected_format: '254XXXXXXXXX, 07XXXXXXXX, or +254XXXXXXXXX'
            });
        }

        console.log('Getting access token for phone:', formattedPhone);

        // Get access token
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return res.status(500).json({
                error: 'Authentication failed',
                message: 'Could not get access token from M-Pesa'
            });
        }

        console.log('Access token received successfully');

        // Generate timestamp and password
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

        // Ensure amount is a positive integer
        const processedAmount = Math.max(1, Math.round(Number(amount)));

        // Update STK Push data with mobile-specific configurations
        const stkPushData = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: processedAmount,
            PartyA: formattedPhone,
            PartyB: SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: CALLBACK_URL || `https://${process.env.VERCEL_URL}/api/callback`,
            AccountReference: 'FoodDelivery',
            TransactionDesc: 'Food Delivery Payment'
        };

        console.log('Sending STK Push request to M-Pesa...');

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

        console.log('M-Pesa response received:', response.data);

        // Enhanced success response
        res.json({
            success: true,
            message: 'Payment request sent successfully',
            data: {
                ...response.data,
                phoneNumber: formattedPhone,
                amount: processedAmount
            }
        });
    } catch (error) {
        console.error('Payment processing error:', {
            message: error.message,
            response: error.response?.data,
            stack: error.stack,
            userAgent: req.headers['user-agent']
        });

        // Enhanced error response with more specific error messages
        const errorResponse = {
            error: 'Payment processing failed',
            message: error.message,
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString(),
            requestInfo: {
                userAgent: req.headers['user-agent'],
                platform: req.headers['sec-ch-ua-platform']
            }
        };

        // Add specific error handling for common M-Pesa errors
        if (error.response?.data?.errorCode) {
            errorResponse.mpesa_error = {
                code: error.response.data.errorCode,
                message: error.response.data.errorMessage
            };
        }

        res.status(500).json(errorResponse);
    }
});

// Callback endpoint for M-Pesa
app.post('/api/callback', (req, res) => {
    console.log('Payment callback received:', req.body);
    res.status(200).send('OK');
});

// Export the Express API
module.exports = app; 