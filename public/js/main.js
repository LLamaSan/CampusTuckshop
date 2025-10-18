// Global variables
let currentUser = null;
let cart = [];
let isLoggedIn = false;
let productMap = {};
let pendingOrder = null;

// Initialize the application
window.onload = function() {
    loadProducts();
    checkAuthStatus();
    setupModalHandlers();
};

// Check if user is authenticated
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch('/api/auth/verify-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                currentUser = data.user;
                isLoggedIn = true;
                updateAuthState();
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            localStorage.removeItem('token');
        }
    }
}
function toggleMenu() {
    const authButtons = document.getElementById('authButtons');
    authButtons.classList.toggle('hidden');
    
    // Close the menu when clicking outside
    if (!authButtons.classList.contains('hidden')) {
        document.addEventListener('click', function closeMenu(e) {
            if (!authButtons.contains(e.target) && !e.target.classList.contains('hamburger-menu')) {
                authButtons.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
            }
        });
    }
}
// Load products from server
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();

        if (data.success && Array.isArray(data.products)) {
            productMap = {};
            
            const categories = {
                Snacks: [],
                Stationery: [],
                Drinks: []
            };

            data.products.forEach(product => {
                productMap[product.name] = product;
                
                let category = product.category || 'Snacks';
                if (!categories[category]) {
                    category = 'Snacks'; 
                }
                
                categories[category].push(product);
            });

            renderCategories(categories);
        } else {
            console.error('Failed to load products:', data.message);
            showAlert('loginAlert', 'Failed to load products. Please refresh the page.', 'alert-error');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('loginAlert', 'Error loading products. Please refresh the page.', 'alert-error');
    }
}

// Render product categories
function renderCategories(categories) {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = '';

    Object.entries(categories).forEach(([categoryName, products]) => {
        if (products.length === 0) return;

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        
        const heading = document.createElement('h2');
        heading.textContent = categoryName;
        
        const productsDiv = document.createElement('div');
        productsDiv.className = 'products';
        
        products.forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.className = 'product';
            
            const stockStatus = getStockStatus(product.quantity);
            const isOutOfStock = product.quantity <= 0;
            
            productDiv.innerHTML = `
                <img src="${product.imageUrl}" alt="${product.name}" class="product-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDI1MCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTAiIGhlaWdodD0iMjUwIiBmaWxsPSIjNDA0MDgwIi8+Cjx0ZXh0IHg9IjEyNSIgeT0iMTI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZTBlMGUwIiBmb250LXNpemU9IjE2cHgiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4='" />
                <div class="product-name">${product.name}</div>
                <div class="product-price">₹${product.price}</div>
                <div class="product-stock ${stockStatus.class}">${stockStatus.text}</div>
                <button class="add-to-cart" ${isOutOfStock ? 'disabled' : ''} onclick="addToCart('${product.name.replace(/'/g, "\\'")}', ${product.price})">
                    ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
            `;
            
            productsDiv.appendChild(productDiv);
        });
        
        categoryDiv.appendChild(heading);
        categoryDiv.appendChild(productsDiv);
        container.appendChild(categoryDiv);
    });
}

window.addEventListener('resize', () => {
    const authButtons = document.getElementById('authButtons');
    authButtons.classList.add('hidden');
});


// Get stock status display
function getStockStatus(quantity) {
    if (quantity <= 0) {
        return { text: 'Out of Stock', class: 'stock-out' };
    } else if (quantity <= 5) {
        return { text: `Only ${quantity} left`, class: 'stock-low' };
    } else {
        return { text: `${quantity} in stock`, class: '' };
    }
}


function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    const alertElements = document.querySelectorAll(`#${modalId} .alert`);
    alertElements.forEach(alert => {
        alert.style.display = 'none';
    });
}

function setupModalHandlers() {
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };
}


function updateAuthState() {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const loginRequired = document.getElementById('loginRequired');
    const hamburgerMenu = document.querySelector('.hamburger-menu');

    if (isLoggedIn) {
        authButtons.classList.add('hidden');
        userInfo.style.display = 'flex';
        userName.textContent = `Welcome, ${currentUser.name}`;
        loginRequired.style.display = 'none';
        hamburgerMenu.style.display = 'none'; 
    } else {
        authButtons.classList.add('hidden'); 
        userInfo.style.display = 'none';
        loginRequired.style.display = 'block';
        hamburgerMenu.style.display = 'block';
    }
}

// Show alert messages
function showAlert(elementId, message, type) {
    const alert = document.getElementById(elementId);
    if (alert) {
        alert.textContent = message;
        alert.className = `alert ${type}`;
        alert.style.display = 'block';
        
        setTimeout(() => {
            alert.style.display = 'none';
        }, 5000);
    }
}


document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showAlert('loginAlert', 'Please fill in all fields', 'alert-error');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            isLoggedIn = true;
            updateAuthState();
            closeModal('loginModal');
            document.getElementById('loginForm').reset();
            showAlert('loginAlert', 'Login successful!', 'alert-success');
        } else {
            showAlert('loginAlert', data.message || 'Login failed', 'alert-error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('loginAlert', 'Network error. Please try again.', 'alert-error');
    }
});


document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    if (!name || !email || !password) {
        showAlert('signupAlert', 'Please fill in all fields', 'alert-error');
        return;
    }

    if (password.length < 6) {
        showAlert('signupAlert', 'Password must be at least 6 characters long', 'alert-error');
        return;
    }

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('signupAlert', 'Signup successful! Please login.', 'alert-success');
            document.getElementById('signupForm').reset();
            setTimeout(() => {
                closeModal('signupModal');
                openModal('loginModal');
            }, 2000);
        } else {
            showAlert('signupAlert', data.message || 'Signup failed', 'alert-error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAlert('signupAlert', 'Network error. Please try again.', 'alert-error');
    }
});


function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    isLoggedIn = false;
    cart = [];
    updateAuthState();
    updateCartDisplay();
    loadProducts();
}

// Add item to cart
function addToCart(productName, price) {
    if (!isLoggedIn) {
        showAlert('loginAlert', 'Please sign in to add items to cart', 'alert-warning');
        openModal('loginModal');
        return;
    }

    const product = productMap[productName];
    if (!product || product.quantity <= 0) {
        alert(`${productName} is out of stock or not found.`);
        return;
    }

    const existingItem = cart.find(item => item.name === productName);
    const alreadyInCart = existingItem ? existingItem.quantity : 0;

    if (alreadyInCart >= product.quantity) {
        alert(`Only ${product.quantity} items of ${productName} available in stock.`);
        return;
    }

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name: productName, price: price, quantity: 1 });
    }

    updateCartDisplay();
    
    const remainingStock = product.quantity - (alreadyInCart + 1);
    if (remainingStock <= 2 && remainingStock > 0) {
        alert(`${productName} added to cart! Only ${remainingStock} left in stock.`);
    }
}

// Update cart display
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    const cartBadge = document.getElementById('cartBadge');

    cartItems.innerHTML = '';
    let total = 0;
    let itemCount = 0;

    cart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        
        itemDiv.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₹${item.price} each</div>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="changeQuantity(${index}, -1)">-</button>
                <span style="margin: 0 8px; color: #4facfe; font-weight: bold;">${item.quantity}</span>
                <button class="quantity-btn" onclick="changeQuantity(${index}, 1)">+</button>
                <button class="remove-btn" onclick="removeFromCart(${index})">Remove</button>
            </div>
        `;
        
        cartItems.appendChild(itemDiv);
        total += item.price * item.quantity;
        itemCount += item.quantity;
    });

    cartCount.textContent = itemCount;
    cartTotal.textContent = total;
    cartBadge.textContent = itemCount;
    
    document.getElementById('cartToggleBtn').style.display = itemCount > 0 ? 'flex' : 'none';
}

function toggleCart() {
    const cartEl = document.getElementById('cart');
    cartEl.classList.toggle('show');
    
    if (cartEl.classList.contains('show')) {
        document.addEventListener('click', function closeCart(e) {
            if (!cartEl.contains(e.target) && !e.target.closest('.cart-toggle-btn')) {
                cartEl.classList.remove('show');
                document.removeEventListener('click', closeCart);
            }
        });
    }
}

// Change quantity in cart
function changeQuantity(index, change) {
    const item = cart[index];
    if (!item) return;

    const product = productMap[item.name];
    if (!product) {
        alert('Product not found. Please refresh the page.');
        return;
    }
    
    if (change > 0 && item.quantity >= product.quantity) {
        alert(`Only ${product.quantity} items of ${item.name} available in stock.`);
        return;
    }
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        cart.splice(index, 1);
    }
    
    updateCartDisplay();
}

// Remove item from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function checkout() {
    if (!isLoggedIn) {
        showAlert('loginAlert', 'Please sign in to place an order', 'alert-warning');
        openModal('loginModal');
        return;
    }
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    const stockIssues = cart.map(item => {
        const product = productMap[item.name];
        if (!product) return `${item.name} not found`;
        if (product.quantity < item.quantity) return `${item.name}: Only ${product.quantity} available, you have ${item.quantity} in cart`;
        return null;
    }).filter(Boolean);

    if (stockIssues.length > 0) {
        alert('Stock issues found:\n' + stockIssues.join('\n') + '\n\nPlease update your cart.');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    pendingOrder = { items: cart.map(item => ({...item})), total: total };

    showAddressForm();
    openModal('orderModal');
}

function showAddressForm() {
    document.getElementById('addressSection').style.display = 'block';
    document.getElementById('summarySection').style.display = 'none';
    document.getElementById('addressForm').reset();
    document.getElementById('orderAlert').style.display = 'none';
}

function proceedToOrderSummary() {
    const form = document.getElementById('addressForm');
    if (!form.checkValidity()) {
        showAlert('orderAlert', 'Please fill in all required fields correctly.', 'alert-error');
        // This will trigger the browser's native validation UI
        form.reportValidity();
        return;
    }

    const addressData = {
        fullName: document.getElementById('fullName').value.trim(),
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        addressLine1: document.getElementById('addressLine1').value.trim(),
        addressLine2: document.getElementById('addressLine2').value.trim(),
        city: document.getElementById('city').value.trim(),
        pincode: document.getElementById('pincode').value.trim(),
        state: document.getElementById('state').value.trim()
    };
    
    pendingOrder.address = addressData;
    showOrderSummaryWithAddress();
}

function showOrderSummaryWithAddress() {
    document.getElementById('addressSection').style.display = 'none';
    document.getElementById('summarySection').style.display = 'block';
    document.getElementById('orderAlert').style.display = 'none';
    
    const deliveryAddressDiv = document.getElementById('deliveryAddress');
    const addr = pendingOrder.address;
    if (!pendingOrder || !pendingOrder.items || !pendingOrder.total || !addr) {
        showAlert('orderAlert', 'Order data is incomplete.', 'alert-error');
        backToAddress();
        return;
    }

    deliveryAddressDiv.innerHTML = `
        <h4>Delivery Address:</h4>
        <div style="background: rgba(40, 40, 80, 0.5); padding: 15px; border-radius: 10px; margin: 10px 0;">
            <strong>${addr.fullName}</strong><br>
            ${addr.phoneNumber}<br>
            ${addr.addressLine1}<br>
            ${addr.addressLine2 ? addr.addressLine2 + '<br>' : ''}
            ${addr.city}, ${addr.state} - ${addr.pincode}
        </div>
    `;
    
    const orderSummaryDiv = document.getElementById('orderSummary');
    let summaryHTML = '<h4>Order Items:</h4>' +
        pendingOrder.items.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px; background: rgba(79, 172, 254, 0.1); border-radius: 5px;">
                <span>${item.name} x ${item.quantity}</span>
                <span>₹${item.price * item.quantity}</span>
            </div>
        `).join('') + `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #4facfe; font-size: 1.2em; font-weight: bold; color: #4facfe;">
            Total: ₹${pendingOrder.total}
        </div>
    `;
    orderSummaryDiv.innerHTML = summaryHTML;
}

function backToAddress() {
    document.getElementById('addressSection').style.display = 'block';
    document.getElementById('summarySection').style.display = 'none';
    document.getElementById('orderAlert').style.display = 'none';
}

async function confirmOrder() {
    if (!pendingOrder || !pendingOrder.address) {
        alert('Address information is missing. Please go back.');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login again');
            closeModal('orderModal');
            return;
        }

        const confirmBtn = document.querySelector('#summarySection .btn-primary');
        const originalText = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="loading"></span> Processing...';

        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(pendingOrder)
        });

        const data = await response.json();

        if (data.success) {
            showAlert('orderAlert', `Order placed successfully! Order ID: ${data.orderId}`, 'alert-success');
            cart = [];
            updateCartDisplay();
            setTimeout(() => {
                closeModal('orderModal');
                loadProducts();
            }, 3000);
            pendingOrder = null;
        } else {
            showAlert('orderAlert', data.message || 'Order failed', 'alert-error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalText;
        }

    } catch (error) {
        console.error('Order confirmation error:', error);
        showAlert('orderAlert', 'Network error. Please try again.', 'alert-error');
        const confirmBtn = document.querySelector('#summarySection .btn-primary');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Order';
        }
    }
}

// Forgot Password functionality
function openForgotPassword() {
    closeModal('loginModal');
    openModal('forgotPasswordModal');
}

function backToLogin() {
    closeModal('forgotPasswordModal');
    openModal('loginModal');
}

document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('forgotPasswordEmail').value;
    if (!email) {
        showAlert('forgotPasswordAlert', 'Please enter your email address', 'alert-error');
        return;
    }

    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Sending...';

        const response = await fetch('/api/password/forgot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('forgotPasswordAlert', 'Password reset link sent! Please check your email.', 'alert-success');
            document.getElementById('forgotPasswordForm').reset();
            setTimeout(() => closeModal('forgotPasswordModal'), 5000);
        } else {
            showAlert('forgotPasswordAlert', data.message || 'Failed to send reset link', 'alert-error');
        }

        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

    } catch (error) {
        console.error('Forgot password error:', error);
        showAlert('forgotPasswordAlert', 'Network error. Please try again.', 'alert-error');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
    }
});

function refreshProducts() {
    loadProducts();
}

function debugCart() {
    console.log({ cart, productMap, isLoggedIn, currentUser });
}
