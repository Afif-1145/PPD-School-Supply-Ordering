// Google Apps Script Configuration
// PENTING: Gantikan URL ini dengan Web App URL dari Google Apps Script anda

const GOOGLE_APPS_SCRIPT_CONFIG = {
  // Web App URL dari Google Apps Script
  // Contoh: https://script.google.com/macros/s/AKfycbz.../exec
  webAppUrl: 'https://script.google.com/macros/s/AKfycbxCSFakUTMxik_B-DfozIDnq3Do_700QaoW72iLTQkC4CKA_raSCyfv3I8YMuF_in7YqA/exec'
};

// Fungsi untuk check jika config sudah disetup
function isConfigured() {
  return GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl !== 'YOUR_WEB_APP_URL_HERE';
}

// Helper function untuk register user baru
async function registerUser(name, email, password, securityQuestion, securityAnswer) {
  // ALWAYS save to localStorage first (primary storage for Netlify)
  let users = JSON.parse(localStorage.getItem('users')||'[]');
  
  // Check duplicate
  if(users.some(u=>u.email.toLowerCase()===email.toLowerCase())){
    return { success: false, message: 'Email sudah digunakan' };
  }
  
  // Save to localStorage
  users.push({name, email, password, securityQuestion, securityAnswer});
  localStorage.setItem('users', JSON.stringify(users));
  console.log('User saved to localStorage:', email);
  
  // Try sync to Google Sheet jika configured (background sync, fail OK)
  if (isConfigured()) {
    try {
      await fetch(GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          name: name,
          email: email,
          password: password,
          securityQuestion: securityQuestion,
          securityAnswer: securityAnswer
        })
      });
      console.log('User synced to Google Sheet (background)');
    } catch (error) {
      console.warn('Google Sheet sync failed (OK, using localStorage):', error);
    }
  }
  
  return { success: true, message: 'Pendaftaran berjaya' };
}

// Helper function untuk login user
async function loginUser(email, password) {
  const checkEmail = email.trim().toLowerCase();
  const checkPassword = password.trim();
  
  // Try localStorage FIRST (faster & works cross-platform on Netlify)
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
    }
  }
  
  return { success: false, message: 'Email atau kata laluan salah' };
}

// Helper function untuk get items
async function getItems() {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return null;
  }
  
  try {
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
    console.error('Ralat get items:', error);
    return null;
  }
}

// Helper function untuk add item baru
async function addItem(name, stock) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    console.log('Adding item to Google Sheet:', name, stock);
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
    console.log('addItem response:', text);
    
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
  }
}

// Helper function untuk update item
async function updateItem(name, stock) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
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
  }
}

// Helper function untuk request stock dari teacher
async function requestStock(teacherEmail, teacherName, item, qty) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'requestStock',
        teacherEmail: teacherEmail,
        teacherName: teacherName,
        item: item,
        qty: qty
      })
    });
    
    return { success: true, message: 'Request berjaya dihantar' };
  } catch (error) {
    console.error('Ralat request stock:', error);
    return { success: false, message: 'Failed to connect: ' + error.message };
  }
}

// Helper function untuk get teacher stock requests
async function getTeacherStockRequests() {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return null;
  }
  
  try {
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
  }
}

// Helper function untuk update request status
async function updateRequestStatus(email, item, status) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_CONFIG.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateRequestStatus',
        email: email,
        item: item,
        status: status
      })
    });
    
    // Dengan mode no-cors, fetch succeed tetapi tidak boleh read response
    // Assume success dan refresh tables
    return { success: true, message: 'Status diupdate' };
  } catch (error) {
    console.error('Ralat update status:', error);
    return { success: false, message: error.message };
  }
}

// Helper function untuk get all users
async function getUsers() {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return null;
  }
  
  try {
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
  }
}

// Helper function untuk delete order
async function deleteOrder(email, item, date) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
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
  }
}

// Helper function untuk delete item
async function deleteItem(name) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
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
  }
}

// Helper function untuk delete user
async function deleteUser(email) {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
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
  }
}

// Helper function untuk delete semua orders
async function deleteAllOrders() {
  if (!isConfigured()) {
    console.error('Google Apps Script belum dikonfigurasi. Sila setup config.js');
    return { success: false, message: 'Configuration not set' };
  }
  
  try {
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
  }
}