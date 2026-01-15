// ============================================
// GOOGLE APPS SCRIPT INTEGRATION - CONFIG
// ============================================
// This file contains all helper functions to communicate with Google Apps Script backend
// It handles data synchronization between the website and Google Sheets

// Configuration object containing the Google Apps Script Web App URL
// Replace this URL with your actual deployment URL from Google Apps Script
const GOOGLE_APPS_SCRIPT_CONFIG = {
  // Web App URL from Google Apps Script deployment
  // Format: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
  webAppUrl: 'https://script.google.com/macros/s/AKfycbzKPj98h99ZaePNZYGFaHrv6IYxHWLVOy_WnaAzgiTaD50ELrabszb23DUHmJcNXqDH/exec'
};

// Check if Google Apps Script is properly configured
// Returns true if webAppUrl has been set to an actual deployment URL
function isConfigured() {
  return GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl !== 'YOUR_WEB_APP_URL_HERE';
}

// Global loading helpers (inject overlay into any page that includes config.js)
function _injectGlobalLoadingStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('globalLoadingStyle')) return;
  const style = document.createElement('style');
  style.id = 'globalLoadingStyle';
  style.textContent = `#globalLoading{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}#globalLoading .panel{background:white;padding:12px 16px;border-radius:8px;display:flex;gap:12px;align-items:center;box-shadow:0 8px 30px rgba(0,0,0,0.2);min-width:220px;max-width:90%}#globalLoading .spinner{width:24px;height:24px;border:4px solid #eee;border-top-color:#1976d2;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}#globalLoadingToast{position:fixed;top:20px;right:20px;z-index:10000;display:none;align-items:center;gap:12px;padding:8px 12px;background:white;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,0.12)}#globalLoadingToast .spinner{width:18px;height:18px;border:3px solid #eee;border-top-color:#1976d2;border-radius:50%;animation:spin 1s linear infinite}`;
  document.head.appendChild(style);
}

// Fetch helper with timeout (AbortController)
async function fetchWithTimeout(resource, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(resource, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error('Request timeout');
    throw err;
  } finally {
    clearTimeout(id);
  }
}

// --- Small global toast helper ---
function showToast(message, timeout = 4000) {
  try {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('globalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalToast';
      toast.style.position = 'fixed';
      toast.style.bottom = '20px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.zIndex = '11000';
      toast.style.background = 'white';
      toast.style.padding = '8px 12px';
      toast.style.borderRadius = '8px';
      toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
      toast.style.display = 'none';
      toast.style.fontWeight = '600';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, timeout);
  } catch (e) {
    console.warn('showToast failed', e);
  }
}

// --- Sync queue helpers (background retry queue) ---
function addToSyncQueue(item) {
  try {
    const q = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    q.push(Object.assign({ attempts: 0, ts: Date.now() }, item));
    localStorage.setItem('syncQueue', JSON.stringify(q));
    // kick off processor
    processSyncQueue();
    showToast('Perubahan akan disimpan di latar belakang');
  } catch (e) {
    console.warn('addToSyncQueue failed', e);
  }
}

async function processSyncQueue() {
  if (window._processingSyncQueue) return;
  window._processingSyncQueue = true;
  try {
    let q = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    if (!q.length) return;

    // Iterate backwards so we can splice safely
    for (let i = q.length - 1; i >= 0; i--) {
      const item = q[i];
      try {
        if (item.action === 'resetPassword') {
          const url = GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl + '?action=resetPassword&email=' + encodeURIComponent(item.email) + '&newPassword=' + encodeURIComponent(item.newPassword);
          await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, 10000);
          q.splice(i, 1);
          showToast('Sync berjaya');
        } else if (item.action === 'register') {
          // Example: support other queued operations if needed
          await fetchWithTimeout(GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.payload) }, 10000);
          q.splice(i, 1);
          showToast('Sync berjaya');
        } else {
          // Unknown action - drop it
          console.warn('Unknown sync action, dropping', item);
          q.splice(i, 1);
        }
      } catch (e) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts > 3) {
          console.warn('Dropping sync item after too many attempts', item);
          q.splice(i, 1);
          showToast('Gagal sync: dibuang selepas beberapa percubaan');
        } else {
          q[i] = item; // update attempts
        }
      }
    }

    localStorage.setItem('syncQueue', JSON.stringify(q));
  } catch (e) {
    console.warn('processSyncQueue failed', e);
  } finally {
    window._processingSyncQueue = false;
  }
}

// Try to process queue shortly after load
setTimeout(() => { try { processSyncQueue(); } catch(e){} }, 1000);

// ============================================
// LOADING STATE MANAGEMENT
// ============================================
// These functions handle showing/hiding loading spinners and overlays

// Display a loading message with optional styling
// This shows a loading overlay to prevent user interactions while processing
function showLoading(message, options = {}) {
  const { delay = 300, blocking = true } = options;
  try {
    if (typeof document === 'undefined') return;

    // Check if page already has its own loading overlay (like admin dashboard)
    // If it does, use that instead to avoid showing two loading spinners
    const pageOverlay = document.getElementById('loadingOverlay');
    if (pageOverlay && pageOverlay.style.display !== 'none') {
      console.log('Global loading suppressed - page has local overlay');
      return;
    }

    _injectGlobalLoadingStyle();

    // clear previous timer if any
    if (window._globalLoadingTimer) clearTimeout(window._globalLoadingTimer);

    window._globalLoadingTimer = setTimeout(() => {
      if (blocking) {
        let el = document.getElementById('globalLoading');
        if (!el) {
          el = document.createElement('div');
          el.id = 'globalLoading';
          el.innerHTML = '<div class="panel"><div class="spinner" aria-hidden="true"></div><div id="globalLoadingText" style="font-weight:600;color:#333"></div></div>';
          document.body.appendChild(el);
        }
        const txt = document.getElementById('globalLoadingText');
        if (txt && message) txt.textContent = message || 'Sila tunggu...';
        el.style.display = 'flex';
        document.querySelectorAll('button').forEach(b => b.disabled = true);

        // Safety: auto-hide after a timeout in case a request hangs
        if (window._globalLoadingAutoHideTimer) clearTimeout(window._globalLoadingAutoHideTimer);
        window._globalLoadingAutoHideTimer = setTimeout(() => {
          console.warn('Global loading auto-hide triggered');
          hideLoading();
        }, 15000); // 15s
      } else {
        // non-blocking toast
        let toast = document.getElementById('globalLoadingToast');
        if (!toast) {
          toast = document.createElement('div');
          toast.id = 'globalLoadingToast';
          toast.innerHTML = '<div class="spinner" aria-hidden="true"></div><div id="globalLoadingToastText" style="font-weight:600;color:#333; margin-left:6px"></div>';
          document.body.appendChild(toast);
        }
        const ttxt = document.getElementById('globalLoadingToastText');
        if (ttxt && message) ttxt.textContent = message || 'Sila tunggu...';
        toast.style.display = 'flex';
      }
    }, delay);
  } catch (e) {
    console.warn('showLoading failed', e);
  }
}

function hideLoading() {
  try {
    if (typeof document === 'undefined') return;
    if (window._globalLoadingTimer) { clearTimeout(window._globalLoadingTimer); window._globalLoadingTimer = null; }
    if (window._globalLoadingAutoHideTimer) { clearTimeout(window._globalLoadingAutoHideTimer); window._globalLoadingAutoHideTimer = null; }
    const el = document.getElementById('globalLoading');
    if (el) el.style.display = 'none';
    const toast = document.getElementById('globalLoadingToast');
    if (toast) toast.style.display = 'none';
    document.querySelectorAll('button').forEach(b => b.disabled = false);
  } catch (e) {
    console.warn('hideLoading failed', e);
  }
}

// Helper function untuk register user baru
async function registerUser(name, email, password, securityQuestion, securityAnswer, hint) {
  // Save user to localStorage first
  let users = JSON.parse(localStorage.getItem('users')||'[]');
  
  // Check if email already exists
  if(users.some(u=>u.email.toLowerCase()===email.toLowerCase())){
    return { success: false, message: 'Email sudah digunakan' };
  }
  
  // Add new user to list and save locally
  users.push({name, email, password, hint});
  localStorage.setItem('users', JSON.stringify(users));
  console.log('User saved to localStorage:', email);
  
  // Also sync to Google Sheet if configured
  if (isConfigured()) {
    try {
      const url = GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl + 
                  '?action=register' +
                  '&name=' + encodeURIComponent(name) +
                  '&email=' + encodeURIComponent(email) +
                  '&password=' + encodeURIComponent(password) +
                  '&securityQuestion=' + encodeURIComponent(securityQuestion || '') +
                  '&securityAnswer=' + encodeURIComponent(securityAnswer || '') +
                  '&hint=' + encodeURIComponent(hint || '') +
                  '&timestamp=' + Date.now();
      
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-cache'
      }, 8000);
      
      const text = await response.text();
      console.log('Register response:', text);
      
      if (response.ok) {
        console.log('✓ User synced to Google Sheet');
      } else {
        console.warn('Register response not OK:', response.status);
      }
    } catch (error) {
      console.warn('✗ Google Sheet sync failed (OK, using localStorage):', error);
    }
  }
  
  return { success: true, message: 'Pendaftaran berjaya' };
}

// Login user - check localStorage first, then Google Sheet
async function loginUser(email, password) {
  const checkEmail = email.trim().toLowerCase();
  const checkPassword = password.trim();
  
  // Check localStorage first (fastest)
  console.log('Checking localStorage for user:', checkEmail);
  let users = JSON.parse(localStorage.getItem('users')||'[]');
  let user = users.find(u => u.email.toLowerCase() === checkEmail && u.password === checkPassword);
  
  if (user) {
    console.log('Login success from localStorage');
    return {
      success: true,
      message: 'Login berjaya',
      user: {
        name: user.name,
        email: user.email
      }
    };
  }
  
  // Fallback: Try Google Sheet jika configured & localStorage tak jumpa
  if (isConfigured()) {
    try {
      showLoading('Mencari akaun...');
      console.log('Trying Google Sheet login...');
      const response = await fetch(`${GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
        method: 'GET',
        redirect: 'follow'
      });
      
      const result = await response.json();
      if (result.success) {
        // Save to localStorage for future logins
        if (!users.some(u => u.email.toLowerCase() === checkEmail)) {
          users.push({name: result.user.name, email: result.user.email, password: password});
          localStorage.setItem('users', JSON.stringify(users));
          console.log('User cached to localStorage from Google Sheet');
        }
      }
      return result;
    } catch (error) {
      console.warn('Google Sheet login failed:', error);
    } finally {
      hideLoading();
    }
  }
  
  return { success: false, message: 'Email atau kata laluan salah' };
}

// Helper function untuk get items
// Fetch list of items from Google Sheet
async function getItems() {
  if (!isConfigured()) {
    console.error('Google Apps Script not configured');
    return null;
  }
  
  try {
    showLoading('Loading items...');
    const response = await fetch(`${GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl}?action=getItems`, {
      method: 'GET',
      redirect: 'follow'
    });
    
    const result = await response.json();
    if (result.success) {
      return result.items || [];
    } else {
      console.error('Error getting items:', result.message);
      return null;
    }
  } catch (error) {
    console.error('Failed to get items:', error);
    return null;
  } finally {
    hideLoading();
  }
}

// Add a new item to Google Sheet
async function addItem(name, stock) {
  if (!isConfigured()) {
    console.error('Google Apps Script not configured');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    showLoading('Adding item to Google Sheet...');
    console.log('Adding item:', name, stock);
    const url = GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl + 
                '?action=addItem&name=' + encodeURIComponent(name) + 
                '&stock=' + encodeURIComponent(stock) + 
                '&timestamp=' + Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-cache'
    });
    
    const text = await response.text();
    console.log('Add item response:', text);
    
    // Parse response if possible
    try {
      const result = JSON.parse(text);
      console.log('Parsed result:', result);
      return result;
    } catch (e) {
      console.warn('Could not parse response, assuming success');
      return { success: true, message: 'Barang berjaya ditambah' };
    }
  } catch (error) {
    console.error('Ralat add item:', error);
    return { success: false, message: 'Failed to connect: ' + error.message };
  } finally {
    hideLoading();
  }
}

// Helper function untuk update item
async function updateItem(name, stock) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    showLoading('Mengemaskini stok...');
    console.log('Updating item in Google Sheet:', name, stock);
    const url = GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl + 
                '?action=updateItem&name=' + encodeURIComponent(name) + 
                '&stock=' + encodeURIComponent(stock) + 
                '&timestamp=' + Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-cache'
    });
    
    const text = await response.text();
    console.log('updateItem response:', text);
    
    try {
      const result = JSON.parse(text);
      console.log('Parsed result:', result);
      return result;
    } catch (e) {
      console.warn('Could not parse response, assuming success');
      return { success: true, message: 'Stok berjaya dikemaskini' };
    }
  } catch (error) {
    console.error('Ralat update item:', error);
    return { success: false, message: 'Failed to connect: ' + error.message };
  } finally {
    hideLoading();
  }
}

// Helper function untuk request stock dari teacher
async function requestStock(teacherEmail, teacherName, item, qty) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    showLoading('Menghantar permintaan...');
    // Use GET with query params to avoid CORS issues from "no-cors" POST.
    const url = GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl +
                '?action=requestStock' +
                '&teacherEmail=' + encodeURIComponent(teacherEmail) +
                '&teacherName=' + encodeURIComponent(teacherName) +
                '&item=' + encodeURIComponent(item) +
                '&qty=' + encodeURIComponent(qty) +
                '&timestamp=' + Date.now();

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-cache'
    });

    const text = await response.text();
    try {
      const result = JSON.parse(text);
      return result;
    } catch (e) {
      // If parse fails, assume success but warn
      console.warn('requestStock: could not parse response, text=', text);
      return { success: true, message: 'Request berjaya dihantar (no parse)' };
    }
  } catch (error) {
    console.error('Ralat request stock:', error);
    return { success: false, message: 'Failed to connect: ' + error.message };
  } finally {
    hideLoading();
  }
}

// Helper function untuk get teacher stock requests
async function getTeacherStockRequests() {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return null;
  }
  
  try {
    showLoading('Memuatkan permintaan...');
    const response = await fetch(`${GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl}?action=getTeacherStockRequests`, {
      method: 'GET',
      redirect: 'follow'
    });
    
    const result = await response.json();
    if (result.success) {
      return result.requests || [];
    } else {
      console.error('Error getting requests:', result.message);
      return null;
    }
  } catch (error) {
    console.error('Ralat get requests:', error);
    return null;
  } finally {
    hideLoading();
  }
}

// Helper function untuk update request status
async function updateRequestStatus(email, item, status, reason = '') {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    showLoading('Mengemaskini status...');
    console.log('Updating request status:', {email, item, status, reason});
    
    const url = GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl + 
                '?action=updateRequestStatus' +
                '&email=' + encodeURIComponent(email) +
                '&item=' + encodeURIComponent(item) +
                '&status=' + encodeURIComponent(status) +
                '&reason=' + encodeURIComponent(reason || '') +
                '&timestamp=' + Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-cache'
    });
    
    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('updateRequestStatus response:', text);
    
    try {
      const result = JSON.parse(text);
      return result;
    } catch (e) {
      console.warn('Could not parse response, assuming success');
      return { success: true, message: 'Status diupdate' };
    }
  } catch (error) {
    console.error('Ralat update status:', error);
    return { success: false, message: 'Failed to connect: ' + error.message };
  } finally {
    hideLoading();
  }
}

// Helper function untuk get all users
async function getUsers() {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return null;
  }
  
  try {
    showLoading('Memuatkan pengguna...');
    // Use GET instead of POST untuk getUsers
    const response = await fetch(`${GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl}?action=getUsers`, {
      method: 'GET',
      redirect: 'follow'
    });
    
    const result = await response.json();
    if (result.success) {
      return result.users || [];
    } else {
      console.error('Error getting users:', result.message);
      return null;
    }
  } catch (error) {
    console.error('Ralat get users:', error);
    return null;
  } finally {
    hideLoading();
  }
}

// Helper function to get a single user by email (fast lookup)
async function getUserByEmail(email, suppressLoading = false) {
  if (!isConfigured()) {
    console.error('Perkhidmatan backend belum dikonfigurasi. Sila setup config.js');
    return null;
  }

  try {
    if (!suppressLoading) showLoading('Memeriksa pengguna...');
    const response = await fetchWithTimeout(`${GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl}?action=findUser&email=${encodeURIComponent(email)}`, { method: 'GET', redirect: 'follow' }, 8000);

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Ralat get user:', error);
    return null;
  } finally {
    if (!suppressLoading) hideLoading();
  }
}

// Helper function untuk delete order
async function deleteOrder(email, item, date) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    showLoading('Memadam order...');
    const response = await fetch(GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteOrder',
        email: email,
        item: item,
        date: date
      })
    });
    
    return { success: true, message: 'Order berjaya dipadamkan' };
  } catch (error) {
    console.error('Ralat delete order:', error);
    return { success: false, message: 'Failed to connect: ' + error.message };
  } finally {
    hideLoading();
  }
}

// Helper function untuk delete item
async function deleteItem(name) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    showLoading('Memadam barang...');
    const response = await fetch(GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteItem',
        name: name
      })
    });
    
    return { success: true, message: 'Barang berjaya dipadamkan' };
  } catch (error) {
    console.error('Ralat delete item:', error);
    return { success: false, message: 'Failed to connect: ' + error.message };
  } finally {
    hideLoading();
  }
}

// Helper function untuk delete user
async function deleteUser(email) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    showLoading('Memadam pengguna...');
    console.log('Deleting user from Google Sheet:', email);
    const url = GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl + 
                '?action=deleteUser&email=' + encodeURIComponent(email) + 
                '&timestamp=' + Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-cache'
    });
    
    const text = await response.text();
    console.log('deleteUser response:', text);
    
    try {
      const result = JSON.parse(text);
      console.log('Parsed result:', result);
      return result;
    } catch (e) {
      console.warn('Could not parse response, assuming success');
      return { success: true, message: 'Pengguna berjaya dipadam' };
    }
  } catch (error) {
    console.error('Ralat delete user:', error);
    return { success: false, message: 'Failed to connect: ' + error.message };
  } finally {
    hideLoading();
  }
}

// Helper function untuk delete semua orders
async function deleteAllOrders() {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    showLoading('Memadam semua orders...');
    const response = await fetch(GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteAllOrders'
      })
    });
    
    return { success: true, message: 'Semua orders berjaya dipadamkan' };
  } catch (error) {
    console.error('Ralat delete all orders:', error);
    return { success: false, message: 'Failed to connect: ' + error.message };
  } finally {
    hideLoading();
  }

}