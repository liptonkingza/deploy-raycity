// Configuration for RayCity
// ตั้งค่าให้ใช้ Google Sheets หรือ localStorage

window.CONFIG = {
    // ตั้งค่าเป็น 'google-sheets', 'localstorage' หรือ 'mongodb'
    // เลือก 'mongodb' หากต้องการใช้ Netlify Functions + MongoDB Atlas
    storageType: 'mongodb',

    // Google Sheets API URL (ยังคงอยู่หากต้องการ fallback)
    googleSheetsApiUrl: 'https://script.google.com/macros/s/AKfycbyqcJyGHkbSysGrM75mH-eUTQ4uc5dDW-2gSP7XclUdLKny9Pssz_NvwUyncHueq7IL6A/exec',

    // Base path สำหรับ serverless functions (Netlify)
    // Netlify: '/.netlify/functions'
    apiBase: '/.netlify/functions'
};

