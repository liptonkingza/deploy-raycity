/**
 * Google Apps Script สำหรับ RayCity Authentication API
 * 
 * วิธีใช้:
 * 1. วางโค้ดนี้ใน Google Apps Script
 * 2. Deploy เป็น Web App
 * 3. ใช้ Web App URL ในไฟล์ auth.js
 */

// ตั้งชื่อ Sheet ที่จะใช้เก็บข้อมูล
const SHEET_NAME = 'users';

/**
 * ฟังก์ชันหลักสำหรับจัดการ CORS และ routing
 * รองรับทั้ง FormData และ JSON
 */
function doPost(e) {
  try {
    let action, username, password;
    
    // ตรวจสอบว่ามี parameters (FormData) หรือไม่
    if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      username = e.parameter.username;
      password = e.parameter.password;
    } 
    // ถ้าไม่มี parameters ให้ลอง parse JSON
    else if (e.postData && e.postData.contents) {
      try {
        const jsonData = JSON.parse(e.postData.contents);
        action = jsonData.action;
        username = jsonData.username;
        password = jsonData.password;
      } catch (parseError) {
        // ถ้า parse ไม่ได้ อาจจะเป็น form data
        const params = e.parameter || {};
        action = params.action;
        username = params.username;
        password = params.password;
      }
    }
    
    if (!action) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: false, 
          message: 'Missing action parameter' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    let result;
    
    switch(action) {
      case 'register':
        if (!username || !password) {
          result = { success: false, message: 'Missing username or password' };
        } else {
          result = registerUser(username, password);
        }
        break;
      case 'login':
        if (!username || !password) {
          result = { success: false, message: 'Missing username or password' };
        } else {
          result = loginUser(username, password);
        }
        break;
      case 'getUsers':
        result = getAllUsers();
        break;
      default:
        result = { success: false, message: 'Invalid action' };
    }
    
    // ส่ง HTML ที่ส่ง postMessage กลับไปยัง parent window
    const htmlOutput = HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <base target="_top">
      </head>
      <body>
        <script>
          try {
            const result = ${JSON.stringify(result)};
            window.parent.postMessage(result, '*');
          } catch(e) {
            window.parent.postMessage({
              success: false,
              message: 'Error: ' + e.toString()
            }, '*');
          }
        </script>
      </body>
      </html>
    `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return htmlOutput;
      
  } catch (error) {
    const errorResult = { 
      success: false, 
      message: 'Error: ' + error.toString() 
    };
    
    const htmlOutput = HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <base target="_top">
      </head>
      <body>
        <script>
          window.parent.postMessage(${JSON.stringify(errorResult)}, '*');
        </script>
      </body>
      </html>
    `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return htmlOutput;
  }
}

/**
 * ฟังก์ชันสำหรับ GET requests
 * รองรับ JSONP callback สำหรับหลีกเลี่ยงปัญหา CORS
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback;
    // Google Apps Script จะ decode parameters อัตโนมัติ
    const username = e.parameter.username || '';
    const password = e.parameter.password || '';
    
    let result;
    
    switch(action) {
      case 'register':
        if (!username || !password) {
          result = { success: false, message: 'Missing username or password' };
        } else {
          result = registerUser(username, password);
        }
        break;
      case 'login':
        if (!username || !password) {
          result = { success: false, message: 'Missing username or password' };
        } else {
          result = loginUser(username, password);
        }
        break;
      case 'getUsers':
        result = getAllUsers();
        break;
      default:
        result = { success: false, message: 'Invalid action' };
    }
    
    // ถ้ามี callback (JSONP) ให้ส่งกลับเป็น JavaScript
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    // ถ้าไม่มี callback ส่งกลับเป็น JSON
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    const errorResult = { 
      success: false, 
      message: 'Error: ' + error.toString() 
    };
    
    if (e.parameter.callback) {
      return ContentService
        .createTextOutput(e.parameter.callback + '(' + JSON.stringify(errorResult) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ดึง Sheet ที่ใช้เก็บข้อมูล
 */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  // ถ้ายังไม่มี Sheet ให้สร้างใหม่
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // สร้าง header
    sheet.getRange(1, 1, 1, 3).setValues([['username', 'password', 'createdAt']]);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }
  
  return sheet;
}

/**
 * ตรวจสอบว่ามี username นี้อยู่แล้วหรือไม่
 */
function userExists(username) {
  const trimmedUsername = String(username || '').trim();
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  // ข้าม header row
  for (let i = 1; i < data.length; i++) {
    const sheetUsername = String(data[i][0] || '').trim();
    if (sheetUsername === trimmedUsername) {
      return true;
    }
  }
  
  return false;
}

/**
 * สมัครสมาชิกใหม่
 */
function registerUser(username, password) {
  try {
    // Trim username และ password
    const trimmedUsername = String(username || '').trim();
    const trimmedPassword = String(password || '');
    
    if (!trimmedUsername || !trimmedPassword) {
      return {
        success: false,
        message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
      };
    }
    
    // ตรวจสอบว่ามี username อยู่แล้วหรือไม่
    if (userExists(trimmedUsername)) {
      return {
        success: false,
        message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว'
      };
    }
    
    // เพิ่มข้อมูลใหม่
    const sheet = getSheet();
    const timestamp = new Date().toISOString();
    sheet.appendRow([trimmedUsername, trimmedPassword, timestamp]);
    
    return {
      success: true,
      message: 'สมัครสมาชิกสำเร็จ'
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'เกิดข้อผิดพลาด: ' + error.toString()
    };
  }
}

/**
 * เข้าสู่ระบบ
 */
function loginUser(username, password) {
  try {
    // Trim username และ password
    const trimmedUsername = String(username || '').trim();
    const trimmedPassword = String(password || '');
    
    if (!trimmedUsername || !trimmedPassword) {
      return {
        success: false,
        message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
      };
    }
    
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    
    // Debug: Log ข้อมูลที่ได้รับ
    Logger.log('Login attempt - Username: ' + trimmedUsername + ', Password length: ' + trimmedPassword.length);
    Logger.log('Total rows in sheet: ' + data.length);
    
    // ข้าม header row
    for (let i = 1; i < data.length; i++) {
      const sheetUsername = String(data[i][0] || '').trim();
      const sheetPassword = String(data[i][1] || '');
      
      // Debug: Log แต่ละ row
      Logger.log('Row ' + i + ' - Username: "' + sheetUsername + '", Password: "' + sheetPassword + '"');
      
      // เปรียบเทียบ username และ password
      if (sheetUsername === trimmedUsername && sheetPassword === trimmedPassword) {
        Logger.log('Login successful for: ' + trimmedUsername);
        return {
          success: true,
          message: 'เข้าสู่ระบบสำเร็จ',
          user: {
            username: trimmedUsername
          }
        };
      }
    }
    
    Logger.log('Login failed - No matching user found');
    return {
      success: false,
      message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
    };
    
  } catch (error) {
    Logger.log('Login error: ' + error.toString());
    return {
      success: false,
      message: 'เกิดข้อผิดพลาด: ' + error.toString()
    };
  }
}

/**
 * ดึงข้อมูลผู้ใช้ทั้งหมด (สำหรับทดสอบ)
 */
function getAllUsers() {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    
    // ข้าม header row
    const users = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // ถ้ามี username
        users.push({
          username: data[i][0],
          createdAt: data[i][2] || ''
        });
      }
    }
    
    return {
      success: true,
      users: users
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'เกิดข้อผิดพลาด: ' + error.toString()
    };
  }
}

