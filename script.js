// Food items by category
const menuItems = {
    local: [
        { id: 'jollof', name: 'Jollof Rice', price: 500, image: 'images/jollof.jpg' },
        { id: 'fufu', name: 'Fufu & Egusi', price: 800, image: 'images/fufu.jpg' },
        { id: 'amala', name: 'Amala & Ewedu', price: 700, image: 'images/amala.jpg' },
        { id: 'pounded', name: 'Pounded Yam & Egusi', price: 900, image: 'images/pounded.jpg' }
    ],
    continental: [
        { id: 'pasta', name: 'Spaghetti Bolognese', price: 1200, image: 'images/pasta.jpg' },
        { id: 'pizza', name: 'Margherita Pizza', price: 1500, image: 'images/pizza.jpg' },
        { id: 'burger', name: 'Cheeseburger', price: 800, image: 'images/burger.jpg' },
        { id: 'salad', name: 'Caesar Salad', price: 1000, image: 'images/salad.jpg' }
    ],
    fastFood: [
        { id: 'chicken', name: 'Fried Chicken', price: 600, image: 'images/chicken.jpg' },
        { id: 'chips', name: 'French Fries', price: 400, image: 'images/fries.jpg' },
        { id: 'shawarma', name: 'Chicken Shawarma', price: 500, image: 'images/shawarma.jpg' },
        { id: 'sandwich', name: 'Club Sandwich', price: 450, image: 'images/sandwich.jpg' }
    ],
    drinks: [
        { id: 'coke', name: 'Coca-Cola', price: 150, image: 'images/coke.jpg' },
        { id: 'fanta', name: 'Fanta', price: 150, image: 'images/fanta.jpg' },
        { id: 'sprite', name: 'Sprite', price: 150, image: 'images/sprite.jpg' },
        { id: 'water', name: 'Bottled Water', price: 100, image: 'images/water.jpg' }
    ]
};

// Initialize cart and orders
let cart = [];
let total = 0;
let orders = [];

// Admin credentials (in a real app, these would be stored securely on a server)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '5000' // In production, use a strong password
};

// M-Pesa Daraja API Configuration
const DARAJA_CONFIG = {
    consumerKey: 'mfhfs1yq3JwoYPm6JYsAWRz9Agwi2ZAQ5C7qblV8vxvZ4me4',
    consumerSecret: 'GI3qovr0p4lSZa6myLpOyOM8bCWjHS4nWwhxo3CRL1FFUtkoWtrGZYCgy2MaipJH',
    businessShortCode: '174379',
    passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    callbackUrl: 'https://your-domain.com/callback', // Replace with your actual callback URL
    environment: 'sandbox'
};

// Simple encryption function (for demonstration purposes)
function encryptData(data) {
    return btoa(JSON.stringify(data));
}

function decryptData(encryptedData) {
    try {
        return JSON.parse(atob(encryptedData));
    } catch (e) {
        return null;
    }
}

// Admin authentication
function checkAdminAuth() {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    const loginSection = document.getElementById('login-section');
    const adminDashboard = document.getElementById('admin-dashboard');
    
    if (isAuthenticated) {
        loginSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        refreshOrders();
    } else {
        loginSection.style.display = 'block';
        adminDashboard.style.display = 'none';
    }
}

function loginAdmin(username, password) {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem('adminAuthenticated', 'true');
        checkAdminAuth();
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem('adminAuthenticated');
    checkAdminAuth();
}

// Handle admin login form
document.getElementById('adminLoginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    if (loginAdmin(username, password)) {
        alert('Login successful!');
    } else {
        alert('Invalid credentials!');
    }
});

// Load menu items based on category
function loadMenuItems() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    
    if (category && menuItems[category]) {
        document.getElementById('category-title').textContent = category.charAt(0).toUpperCase() + category.slice(1);
        const foodItemsContainer = document.getElementById('food-items');
        foodItemsContainer.innerHTML = '';
        
        menuItems[category].forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'food-item';
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p>KES ${item.price}</p>
                <button onclick="addToCart('${item.name}', ${item.price})">Add to Cart</button>
            `;
            foodItemsContainer.appendChild(itemElement);
        });
    }
}

// Cart functions
function addToCart(itemName, price) {
    cart.push({ name: itemName, price: price });
    updateCart();
}

// Function to remove item from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
    saveCart();
    // Clear all cart-related data from localStorage when empty
    if (cart.length === 0) {
        localStorage.removeItem('cart');
        localStorage.removeItem('currentCart');
        localStorage.removeItem('currentTotal');
        // Reset cart and total variables
        cart = [];
        total = 0;
    }
}

// Function to display cart items
function displayCart() {
    const cartItems = document.getElementById('cart-items');
    const totalAmount = document.getElementById('total-amount');
    
    if (!cartItems) return; // Exit if cart items element doesn't exist
    
    cartItems.innerHTML = '';
    total = 0;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p>No items in cart</p>';
        totalAmount.textContent = 'KES 0';
        return;
    }
    
    cart.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-details">
                <span class="item-name">${item.name}</span>
                <span class="item-price">KES ${item.price.toFixed(2)}</span>
                <span class="item-quantity">x${item.quantity || 1}</span>
            </div>
            <button class="remove-btn" onclick="removeFromCart(${index})">❌ Remove</button>
        `;
        cartItems.appendChild(itemElement);
        total += item.price * (item.quantity || 1);
    });
    
    totalAmount.textContent = `KES ${total.toFixed(2)}`;
}

// Function to save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Function to load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            if (!Array.isArray(cart)) {
                cart = [];
            }
        } catch (e) {
            cart = [];
        }
    } else {
        cart = [];
    }
    updateCart();
}

// Function to update cart count in navigation
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cart.length;
    }
}

// Function to update cart display
function updateCart() {
    displayCart();
    updateCartCount();
    saveCart();
}

// Checkout and payment
function proceedToCheckout() {
    if (cart.length === 0) {
        alert('Please add items to your cart first!');
        return;
    }
    
    // Save cart to localStorage for payment page
    localStorage.setItem('currentCart', JSON.stringify(cart));
    localStorage.setItem('currentTotal', total);
    
    window.location.href = 'payment.html';
}

// Function to get Daraja API access token
async function getAccessToken() {
    try {
        const auth = btoa(`${DARAJA_CONFIG.consumerKey}:${DARAJA_CONFIG.consumerSecret}`);
        const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errorMessage || 'Failed to get access token');
        }
        
        const data = await response.json();
        if (!data.access_token) {
            throw new Error('No access token received');
        }
        return data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}

// Function to generate timestamp
function generateTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second}`;
}

// Function to generate password
function generatePassword() {
    const timestamp = generateTimestamp();
    const password = btoa(`${DARAJA_CONFIG.businessShortCode}${DARAJA_CONFIG.passkey}${timestamp}`);
    return password;
}

// Function to format phone number
function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    phone = phone.replace(/\D/g, '');
    
    // If number starts with 0, replace with 254
    if (phone.startsWith('0')) {
        phone = '254' + phone.substring(1);
    }
    
    // If number starts with +, remove it
    if (phone.startsWith('+')) {
        phone = phone.substring(1);
    }
    
    // If number doesn't start with 254, add it
    if (!phone.startsWith('254')) {
        phone = '254' + phone;
    }
    
    return phone;
}

// Function to process STK Push
async function processSTKPush(phoneNumber, amount) {
    try {
        // Get access token
        const accessToken = await getAccessToken();
        
        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        // Generate timestamp and password
        const timestamp = generateTimestamp();
        const password = generatePassword();
        
        // Prepare STK Push request
        const stkPushRequest = {
            BusinessShortCode: DARAJA_CONFIG.businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: DARAJA_CONFIG.businessShortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: DARAJA_CONFIG.callbackUrl,
            AccountReference: "FoodDelivery",
            TransactionDesc: "Payment for food delivery"
        };
        
        console.log('STK Push Request:', stkPushRequest);
        
        // Make STK Push request
        const response = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(stkPushRequest),
            mode: 'cors'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('STK Push Error Response:', errorData);
            throw new Error(errorData.errorMessage || 'Failed to initiate STK Push');
        }
        
        const responseData = await response.json();
        console.log('STK Push Response:', responseData);
        
        if (responseData.ResponseCode === '0') {
            return {
                success: true,
                message: 'STK Push initiated successfully. Please check your phone to complete the payment.',
                checkoutRequestID: responseData.CheckoutRequestID,
                merchantRequestID: responseData.MerchantRequestID
            };
        } else {
            throw new Error(responseData.ResponseDescription || 'Failed to initiate STK Push');
        }
    } catch (error) {
        console.error('STK Push error:', error);
        return {
            success: false,
            message: error.message || 'Failed to initiate STK Push. Please try again.'
        };
    }
}

// Function to check payment status
async function checkPaymentStatus(checkoutRequestID) {
    try {
        const accessToken = await getAccessToken();
        const timestamp = generateTimestamp();
        const password = generatePassword();
        
        const response = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                BusinessShortCode: DARAJA_CONFIG.businessShortCode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestID
            })
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking payment status:', error);
        throw error;
    }
}

// Process payment
async function processPayment(amount, phoneNumber) {
    try {
        console.log('Starting payment process...');
        console.log('Amount:', amount);
        console.log('Phone Number:', phoneNumber);
        
        const response = await fetch('http://localhost:3001/api/stk-push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                phoneNumber: phoneNumber
            })
        });

        console.log('Server response status:', response.status);
        const data = await response.json();
        console.log('Server response data:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Payment failed');
        }

        return data;
    } catch (error) {
        console.error('Payment error:', error);
        throw error;
    }
}

// Admin functions
function refreshOrders() {
    orders = JSON.parse(localStorage.getItem('orders')) || [];
    displayOrdersTable();
}

function displayOrdersTable() {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return; // Exit if table body doesn't exist
    
    tableBody.innerHTML = '';
    
    // Get current orders from localStorage
    const currentOrders = JSON.parse(localStorage.getItem('orders')) || [];
    
    currentOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.customer.name}</td>
            <td>${order.customer.phone}</td>
            <td>${order.customer.location}</td>
            <td>${order.items.map(item => item.name).join(', ')}</td>
            <td>KES ${order.total}</td>
            <td>${order.date}</td>
            <td>${order.status}</td>
            <td>
                <button class="complete-btn" data-order-id="${order.id}" ${order.status === 'Completed' ? 'disabled' : ''}>
                    ${order.status === 'Completed' ? 'Done' : 'Mark as Completed'}
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners to all complete buttons
    document.querySelectorAll('.complete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            markOrderAsCompleted(orderId);
            // Update button text immediately
            this.textContent = 'Done';
            this.disabled = true;
        });
    });
}

function markOrderAsCompleted(orderId) {
    console.log('Marking order as completed:', orderId);
    
    // Get current orders from localStorage
    const currentOrders = JSON.parse(localStorage.getItem('orders')) || [];
    const orderIndex = currentOrders.findIndex(order => order.id === orderId);
    
    if (orderIndex !== -1) {
        // Update the order status
        currentOrders[orderIndex].status = 'Completed';
        
        // Save updated orders back to localStorage
        localStorage.setItem('orders', JSON.stringify(currentOrders));
        
        // Update the global orders variable
        orders = currentOrders;
        
        // Refresh the display
        displayOrdersTable();
        
        // Also update the user's orders view if it exists
        if (document.getElementById('orders-list')) {
            displayUserOrders();
        }
        
        console.log('Order marked as completed successfully');
    } else {
        console.error('Order not found:', orderId);
    }
}

function exportOrders() {
    const data = JSON.stringify(orders, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Function to display user orders
function displayUserOrders() {
    const ordersList = document.getElementById('orders-list');
    const noOrders = document.getElementById('no-orders');
    
    // Get orders from localStorage
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    
    if (orders.length === 0) {
        ordersList.style.display = 'none';
        noOrders.style.display = 'block';
        return;
    }
    
    ordersList.style.display = 'block';
    noOrders.style.display = 'none';
    ordersList.innerHTML = '';
    
    orders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-card';
        orderElement.innerHTML = `
            <div class="order-header">
                <h3>Order #${order.id}</h3>
                <span class="order-status ${order.status.toLowerCase()}">${order.status}</span>
            </div>
            <div class="order-details">
                <p><strong>Date:</strong> ${order.date}</p>
                <p><strong>Items:</strong> ${order.items.map(item => item.name).join(', ')}</p>
                <p><strong>Total:</strong> KES ${order.total}</p>
                <p><strong>Delivery Location:</strong> ${order.customer.location}</p>
                <p><strong>Status:</strong> <span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></p>
            </div>
        `;
        ordersList.appendChild(orderElement);
    });
}

// Update the checkout function to ensure KES is displayed
async function checkout() {
    try {
        console.log('Starting checkout process...');
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        console.log('Cart total:', total);
        
        const phoneNumber = prompt('Enter your phone number (e.g., 2547XXXXXXXX):');
        if (!phoneNumber) {
            alert('Phone number is required for payment');
            return;
        }
        console.log('Phone number entered:', phoneNumber);

        console.log('Initiating payment...');
        const result = await processPayment(total, phoneNumber);
        console.log('Payment result:', result);
        
        if (result.ResponseCode === '0') {
            alert('Payment initiated successfully! Please check your phone to complete the payment.');
            // Clear all cart-related data from localStorage
            localStorage.removeItem('cart');
            localStorage.removeItem('currentCart');
            localStorage.removeItem('currentTotal');
            // Reset cart and total variables
            cart = [];
            total = 0;
            updateCart();
            // Update payment display
            document.getElementById('payment-cart-items').innerHTML = '<p>No items in cart</p>';
            document.getElementById('payment-total').textContent = 'KES 0';
        } else {
            alert('Failed to initiate payment. Please try again.');
            console.error('Payment failed:', result);
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('An error occurred while processing your payment. Please try again.');
    }
}

// Initialize page based on current URL
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'order.html') {
        loadMenuItems();
        // Load cart from localStorage if exists
        const savedCart = localStorage.getItem('currentCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            total = parseInt(localStorage.getItem('currentTotal')) || 0;
            updateCart();
        }
    } else if (currentPage === 'payment.html') {
        // Load cart for payment page
        const savedCart = localStorage.getItem('currentCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            total = parseInt(localStorage.getItem('currentTotal')) || 0;
            document.getElementById('payment-cart-items').innerHTML = cart.map(item => 
                `<p>${item.name} - KES ${item.price}</p>`
            ).join('');
            document.getElementById('payment-total').textContent = `KES ${total}`;
        }
        
        // Handle payment form submission
        document.getElementById('paymentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            processPayment(total, document.getElementById('phone').value);
        });
    } else if (currentPage === 'admin.html') {
        checkAdminAuth();
    } else if (currentPage === 'orders.html') {
        displayUserOrders();
    }
});

// Update payment display
function showPaymentSection() {
    const savedCart = localStorage.getItem('currentCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        total = parseInt(localStorage.getItem('currentTotal')) || 0;
        document.getElementById('payment-cart-items').innerHTML = cart.map(item => 
            `<p>${item.name} - KES ${item.price}</p>`
        ).join('');
        document.getElementById('payment-total').textContent = `KES ${total}`;
        document.getElementById('payment-section').style.display = 'block';
    } else {
        document.getElementById('payment-cart-items').innerHTML = '<p>No items in cart</p>';
        document.getElementById('payment-total').textContent = 'KES 0';
        document.getElementById('payment-section').style.display = 'block';
    }
}

// Initialize the admin dashboard when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the admin page
    if (document.getElementById('admin-dashboard')) {
        console.log('Initializing admin dashboard...');
        // Load orders from localStorage
        orders = JSON.parse(localStorage.getItem('orders')) || [];
        // Display the orders table
        displayOrdersTable();
    }
});