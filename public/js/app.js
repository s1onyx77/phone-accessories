const API_URL = '/api';
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let userToken = localStorage.getItem('token') || null;

// PAGE ROUTING
function showSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(`${sectionId}-section`).classList.remove('hidden');
    if (sectionId === 'store') loadProducts();
    if (sectionId === 'dashboard') loadDashboard('buyer');
}

// UI AUTH STATE SYNC
function updateAuthUI() {
    const userDisplay = document.getElementById('user-display');
    const authBtn = document.getElementById('auth-btn');
    const navDashboard = document.getElementById('nav-dashboard');

    if (currentUser) {
        userDisplay.textContent = `Hi, ${currentUser.name}`;
        userDisplay.classList.remove('hidden');
        navDashboard.classList.remove('hidden');
        authBtn.textContent = 'Logout';
        authBtn.onclick = handleLogout;
    } else {
        userDisplay.classList.add('hidden');
        navDashboard.classList.add('hidden');
        authBtn.textContent = 'Login / Register';
        authBtn.onclick = openAuthModal;
    }
}

// AUTH MODAL HANDLERS
function openAuthModal() { document.getElementById('auth-modal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
function openSellModal() { 
    if (!currentUser) return openAuthModal();
    document.getElementById('sell-modal').classList.remove('hidden'); 
}
function closeSellModal() { document.getElementById('sell-modal').classList.add('hidden'); }

function toggleAuthForm(type) {
    if (type === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    } else {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
        currentUser = data.user;
        userToken = data.token;
        localStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem('token', userToken);
        updateAuthUI();
        closeAuthModal();
    } else {
        alert(data.error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const full_name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const gcash_number = document.getElementById('reg-gcash').value;
    const password = document.getElementById('reg-password').value;

    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, gcash_number, password })
    });
    if (res.ok) {
        alert('Registration successful! Please login.');
        toggleAuthForm('login');
    } else {
        const data = await res.json();
        alert(data.error);
    }
}

function handleLogout() {
    localStorage.clear();
    currentUser = null;
    userToken = null;
    updateAuthUI();
    showSection('home');
}

// STORE & PRODUCTS
async function loadProducts() {
    const res = await fetch(`${API_URL}/products`);
    const products = await res.json();
    const container = document.getElementById('product-grid');
    container.innerHTML = '';

    products.forEach(p => {
        container.innerHTML += `
            <div class="product-card">
                <img src="${p.image_url}" alt="${p.title}">
                <div class="product-info">
                    <h3>${p.title}</h3>
                    <p class="product-price">₱${p.price.toFixed(2)}</p>
                    <p>${p.description}</p>
                    <button class="btn btn-accent" style="margin-top:1rem;" onclick="buyProduct('${p.id}')">Buy Now</button>
                    <div style="margin-top:10px;">
                        <button class="btn btn-outline" onclick="loadReviews('${p.id}')">Reviews</button>
                    </div>
                </div>
            </div>
        `;
    });
}

async function handleCreateProduct(e) {
    e.preventDefault();
    const payload = {
        title: document.getElementById('prod-title').value,
        price: document.getElementById('prod-price').value,
        category: document.getElementById('prod-category').value,
        image_url: document.getElementById('prod-image').value,
        description: document.getElementById('prod-desc').value,
    };

    const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        closeSellModal();
        showSection('store');
    } else {
        alert('Failed to list product');
    }
}

// CHECKOUT INTEGRATION
async function buyProduct(productId) {
    if (!currentUser) return openAuthModal();

    const res = await fetch(`${API_URL}/payments/checkout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ items: [{ product_id: productId, quantity: 1 }] })
    });

    const data = await res.json();
    if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
    } else {
        alert('Checkout error');
    }
}

// REVIEWS SYSTEM
async function loadReviews(productId) {
    const res = await fetch(`${API_URL}/reviews/${productId}`);
    const reviews = await res.json();
    let text = reviews.map(r => `⭐ ${r.rating}/5 - ${r.comment}`).join('\n') || 'No reviews yet.';
    
    let newRating = prompt(`${text}\n\nEnter Rating (1-5) to submit yours:`);
    if (newRating) {
        let newComment = prompt('Enter Review Comment:');
        await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ product_id: productId, rating: newRating, comment: newComment })
        });
        alert('Review Added!');
    }
}

// DASHBOARD
async function loadDashboard(type) {
    if (type === 'buyer') {
        const res = await fetch(`${API_URL}/dashboard/buyer`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const orders = await res.json();
        document.getElementById('buyer-orders-list').innerHTML = orders.map(o => `
            <div style="border-bottom:1px solid #ccc; padding:10px 0;">
                <p><strong>Order ID:</strong> ${o.id}</p>
                <p>Status: <strong>${o.status}</strong> | Total: ₱${o.total_amount}</p>
            </div>
        `).join('');
    } else {
        const res = await fetch(`${API_URL}/dashboard/seller`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const sales = await res.json();
        document.getElementById('seller-sales-list').innerHTML = sales.map(s => `
            <div style="border-bottom:1px solid #ccc; padding:10px 0;">
                <p><strong>Product:</strong> ${s.products.title}</p>
                <p>Amount: ₱${s.price} | Status: ${s.orders.status}</p>
            </div>
        `).join('');
    }
}

function switchDashTab(tab) {
    if (tab === 'buyer') {
        document.getElementById('buyer-history').classList.remove('hidden');
        document.getElementById('seller-history').classList.add('hidden');
        loadDashboard('buyer');
    } else {
        document.getElementById('buyer-history').classList.add('hidden');
        document.getElementById('seller-history').classList.remove('hidden');
        loadDashboard('seller');
    }
}

// INIT
updateAuthUI();
