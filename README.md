# Food Delivery System with M-Pesa Integration

A food delivery system that allows customers to order food and pay using M-Pesa.

## Features

- Menu browsing with categories (Local, Continental, Fast Food, Drinks)
- Shopping cart functionality
- M-Pesa payment integration
- Admin dashboard for order management

## Prerequisites

- Node.js (v14 or higher)
- M-Pesa API credentials (Consumer Key, Consumer Secret, Passkey, Shortcode)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your M-Pesa credentials:
   ```
   CONSUMER_KEY=your_consumer_key
   CONSUMER_SECRET=your_consumer_secret
   PASSKEY=your_passkey
   SHORTCODE=your_shortcode
   CALLBACK_URL=your_callback_url
   ```
4. Start the server:
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Project Structure

- `index.html` - Main application interface
- `admin.html` - Admin dashboard interface
- `styles.css` - Application styles
- `script.js` - Frontend JavaScript
- `server.js` - Backend API server
- `package.json` - Project dependencies

## API Endpoints

- `POST /api/stk-push` - Initiate M-Pesa payment
- `POST /api/callback` - M-Pesa payment callback

## Security Notes

- Admin credentials are stored in the frontend for demonstration purposes. In a production environment, these should be properly secured.
- M-Pesa credentials should be kept secure and never exposed in client-side code.

## Technologies Used
- HTML5
- CSS3
- JavaScript
- LocalStorage for data persistence

## Deployment
This project is deployed using GitHub Pages.

## License
MIT License 