// Google Sheets API Functions
// ใช้เมื่อ CONFIG.storageType === 'google-sheets'

/**
 * เรียกใช้ Google Sheets API
 * ใช้ URL parameters + GET method เพื่อหลีกเลี่ยงปัญหา CORS
 * Google Apps Script Web App รองรับ GET requests ได้ดีกว่า POST
 */
function callGoogleSheetsAPI(action, data = {}) {
    return new Promise((resolve, reject) => {
        try {
            const url = CONFIG.googleSheetsApiUrl;
            
            if (!url || url === 'YOUR_GOOGLE_SHEETS_API_URL_HERE') {
                reject(new Error('กรุณาตั้งค่า Google Sheets API URL ในไฟล์ config.js'));
                return;
            }
            
            // สร้าง URL parameters - URLSearchParams จะ encode อัตโนมัติ
            const params = new URLSearchParams();
            params.append('action', action);
            Object.keys(data).forEach(key => {
                params.append(key, data[key]);
            });
            
            console.log('Calling API:', action, 'with data:', { username: data.username, passwordLength: data.password ? data.password.length : 0 });
            
            // ใช้ JSONP approach ผ่าน script tag
            const callbackName = 'googleSheetsCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // สร้าง callback function
            window[callbackName] = function(result) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(result);
            };
            
            // สร้าง script tag
            const script = document.createElement('script');
            script.src = url + '?' + params.toString() + '&callback=' + callbackName;
            script.onerror = function() {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('Failed to load script'));
            };
            
            // Timeout
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    if (document.body.contains(script)) {
                        document.body.removeChild(script);
                    }
                    reject(new Error('Request timeout'));
                }
            }, 10000);
            
            document.body.appendChild(script);
            
        } catch (error) {
            console.error('Google Sheets API Error:', error);
            reject(error);
        }
    }).catch(error => {
        console.error('Google Sheets API Error:', error);
        return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message
        };
    });
}

/**
 * ตรวจสอบว่ามี username นี้อยู่แล้วหรือไม่ (Google Sheets)
 */
async function userExistsGoogleSheets(username) {
    const result = await callGoogleSheetsAPI('getUsers');
    if (result && result.success && result.users) {
        return result.users.some(user => user.username === username);
    }
    return false;
}

/**
 * สมัครสมาชิกใหม่ (Google Sheets)
 */
async function registerUserGoogleSheets(username, password) {
    // ตรวจสอบว่ามี username อยู่แล้วหรือไม่
    const exists = await userExistsGoogleSheets(username);
    if (exists) {
        return { success: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' };
    }
    
    return await callGoogleSheetsAPI('register', { username, password });
}

/**
 * เข้าสู่ระบบ (Google Sheets)
 */
async function loginUserGoogleSheets(username, password) {
    // Trim username และ password
    const trimmedUsername = username.trim();
    const trimmedPassword = password;
    
    const result = await callGoogleSheetsAPI('login', { 
        username: trimmedUsername, 
        password: trimmedPassword 
    });
    
    console.log('Login result:', result); // Debug
    
    if (result && result.success) {
        // Set current session
        sessionStorage.setItem('currentUser', JSON.stringify({ username: trimmedUsername }));
    }
    
    return result;
}

