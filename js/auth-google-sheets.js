// Google Sheets API Functions
// ใช้เมื่อ CONFIG.storageType === 'google-sheets'

/**
 * เรียกใช้ Google Sheets API
 * ใช้ hidden iframe + form submission เพื่อหลีกเลี่ยงปัญหา CORS และไม่แสดงข้อมูลใน URL
 */
function callGoogleSheetsAPI(action, data = {}) {
    return new Promise((resolve, reject) => {
        try {
            const url = CONFIG.googleSheetsApiUrl;
            
            if (!url || url === 'YOUR_GOOGLE_SHEETS_API_URL_HERE') {
                reject(new Error('กรุณาตั้งค่า Google Sheets API URL ในไฟล์ config.js'));
                return;
            }
            
            console.log('Calling API:', action, 'with data:', { username: data.username, passwordLength: data.password ? data.password.length : 0 });
            
            // สร้าง unique ID สำหรับ callback
            const callbackId = 'callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // สร้าง hidden iframe
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.name = 'googleSheetsAPI_' + callbackId;
            iframe.id = 'iframe_' + callbackId;
            document.body.appendChild(iframe);
            
            // สร้าง form สำหรับส่งข้อมูล
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = url;
            form.target = iframe.name;
            form.style.display = 'none';
            
            // เพิ่ม action
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = action;
            form.appendChild(actionInput);
            
            // เพิ่มข้อมูลทั้งหมด
            Object.keys(data).forEach(key => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = data[key];
                form.appendChild(input);
            });
            
            document.body.appendChild(form);
            
            // ฟัง response จาก iframe
            let responseReceived = false;
            const timeout = setTimeout(() => {
                if (!responseReceived) {
                    responseReceived = true;
                    cleanup();
                    reject(new Error('Request timeout'));
                }
            }, 15000);
            
            // Function สำหรับ cleanup
            function cleanup() {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
                if (document.body.contains(form)) {
                    document.body.removeChild(form);
                }
            }
            
            // ฟัง postMessage จาก iframe (Google Apps Script จะส่งกลับมา)
            const messageHandler = function(event) {
                // รับ message จาก Google Apps Script
                if (event.data && (event.data.success !== undefined || event.data.message)) {
                    responseReceived = true;
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    cleanup();
                    resolve(event.data);
                }
            };
            window.addEventListener('message', messageHandler);
            
            // ตรวจสอบ iframe content (fallback)
            iframe.onload = function() {
                setTimeout(() => {
                    if (!responseReceived) {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            const responseText = iframeDoc.body ? (iframeDoc.body.textContent || iframeDoc.body.innerText) : '';
                            
                            if (responseText) {
                                try {
                                    const result = JSON.parse(responseText);
                                    responseReceived = true;
                                    clearTimeout(timeout);
                                    window.removeEventListener('message', messageHandler);
                                    cleanup();
                                    resolve(result);
                                    return;
                                } catch (e) {
                                    // ไม่ใช่ JSON
                                }
                            }
                        } catch (e) {
                            // Cross-origin error - ใช้ postMessage แทน
                        }
                    }
                }, 1000);
            };
            
            // ส่ง form
            form.submit();
            
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

