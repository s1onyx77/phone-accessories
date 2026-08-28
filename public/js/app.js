const API_URL = '/api';
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let userToken = localStorage.getItem('token') || null;

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  showSection('home');
});

// PAGE ROUTING
function showSection(sectionId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
  
  const targetSection = document.getElementById(`view-${sectionId}`);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }

  if (sectionId === 'store') loadProducts();
  if (sectionId === 'dashboard') loadDashboard('buyer');
}

// UI AUTH STATE SYNC
function updateAuthUI() {
  const userDisplay = document.getElementById('user-display');
  const authBtn = document.getElementById('auth-btn');
  const navDashboard = document.getElementById('nav-dashboard');

  if (currentUser) {
    if (userDisplay) {
      userDisplay.textContent = `Hi, ${currentUser.email}`;
      userDisplay.classList.remove('hidden');
    }
    if (navDashboard) navDashboard.classList.remove('hidden');
    if (authBtn) {
      authBtn.textContent = 'Logout';
      authBtn.onclick = handleLogout;
    }
  } else {
    if (userDisplay) userDisplay.classList.add('hidden');
    if (navDashboard) navDashboard.classList.add('hidden');
    if (authBtn) {
      authBtn.textContent = 'Sign In';
      authBtn.onclick = () => showSection('login');
    }
  }
}

// AUTHENTICATION HANDLERS
async function handleRegister(event) {
  event.preventDefault();
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const gcash = document.getElementById('reg-gcash').value;
  const accountType = document.getElementById('reg-account-type').value;

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, gcash_number: gcash, role: accountType }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    alert('Registration successful! Please sign in.');
    showSection('login');
  } catch (err) {
    alert(err.message);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid login credentials');

    currentUser = data.user;
    userToken = data.token;
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);

    updateAuthUI();
    showSection('store');
  } catch (err) {
    alert(err.message);
  }
}

function handleLogout() {
  currentUser = null;
  userToken = null;
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  updateAuthUI();
  showSection('home');
}

// PRODUCT LOADING
async function loadProducts() {
  const container = document.getElementById('product-list');
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/products`);
    const products = await res.json();

    container.innerHTML = products.map(prod => `
      <div class="product-card">
        <h3>${prod.name}</h3>
        <p>₱${prod.price.toFixed(2)}</p>
        <button onclick="buyProduct('${prod.id}', ${prod.price}, '${prod.name}')">
          Pay via GCash / Card
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

// CHECKOUT / PAYMENT HANDLER
async function buyProduct(productId, price, productName) {
  if (!currentUser) {
    alert('Please sign in to make a purchase.');
    showSection('login');
    return;
  }

  try {
    const response = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        productId: productId,
        buyerId: currentUser.id,
        amount: price * 100, // Converts PHP to centavos for PayMongo
        lineItems: [
          {
            currency: 'PHP',
            amount: Math.round(price * 100),
            name: productName,
            quantity: 1,
          },
        ],
      }),
    });

    const data = await response.json();

    if (response.ok && data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      console.error('API Error:', data);
      alert(data.error || 'Could not generate checkout session.');
    }
  } catch (error) {
    console.error('Checkout Error:', error);
    alert('Failed to initiate checkout. Please try again.');
  }
}
