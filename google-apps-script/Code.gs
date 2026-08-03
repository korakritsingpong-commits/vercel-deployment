/**
 * Google Apps Script Web App Endpoint for License Scanner
 * 
 * Instructions:
 * 1. Open Google Sheets (create a new sheet titled "License Scanner — ข้อมูลใบอนุญาต")
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire code into Code.gs
 * 4. Click Deploy > New deployment
 * 5. Select type: Web app
 * 6. Execute as: Me (your email)
 * 7. Who has access: Anyone (แม้แต่ผู้ไม่มีบัญชี Google)
 * 8. Copy the Web App URL and paste it into the Web App settings in License Scanner UI
 */

const SHEET_DATA_NAME = "ข้อมูลใบอนุญาต";
const SHEET_LOG_NAME = "ประวัติการสแกน";

function doPost(e) {
  try {
    const contents = e.postData.contents;
    const payload = JSON.parse(contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (payload.action === 'saveSingle') {
      saveSingleRecord(ss, payload.data, payload.timestamp);
      return createJsonResponse({ status: 'success', message: 'บันทึกรายการลง Google Sheet เรียบร้อยแล้ว' });
    } else if (payload.action === 'saveBatch') {
      saveBatchRecords(ss, payload.items, payload.timestamp);
      return createJsonResponse({ status: 'success', message: `บันทึกรายการชุดทั้งหมด ${payload.items.length} รายการ เรียบร้อยแล้ว` });
    } else {
      return createJsonResponse({ status: 'error', message: 'Unknown action' });
    }
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function doGet(e) {
  return createJsonResponse({ status: 'online', service: 'License Scanner Google Apps Script Endpoint' });
}

function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1e3a8a").setFontColor("#ffffff");
  }
  return sheet;
}

function saveSingleRecord(ss, data, timestamp) {
  const headers = [
    "เวลาบันทึก", "ชื่อไฟล์", "ประเภทใบอนุญาต", "เลขที่ใบอนุญาต",
    "ชื่อผู้รับอนุญาต", "ชื่อสถานที่/ร้าน", "ผู้มีหน้าที่ปฏิบัติการ (เภสัชกร)",
    "เลขทะเบียนเภสัชกรรม", "วันที่อนุญาต", "วันหมดอายุ", "จังหวัด/อำเภอ", "Confidence (%)"
  ];
  
  const sheet = getOrCreateSheet(ss, SHEET_DATA_NAME, headers);

  const row = [
    timestamp || new Date().toLocaleString('th-TH'),
    data.filename || '',
    data.licenseType || '',
    data.licenseNo || '',
    data.granteeName || '',
    data.premisesName || '',
    data.pharmacistName || '',
    data.pharmacistRegNo || '',
    data.issueDate || '',
    data.expiryDate || '',
    data.locationProvince || '',
    data.confidence || 0
  ];

  sheet.appendRow(row);
  logScanActivity(ss, 1, data.confidence || 0, "Single Save");
}

function saveBatchRecords(ss, items, timestamp) {
  const headers = [
    "เวลาบันทึก", "ชื่อไฟล์", "ประเภทใบอนุญาต", "เลขที่ใบอนุญาต",
    "ชื่อผู้รับอนุญาต", "ชื่อสถานที่/ร้าน", "ผู้มีหน้าที่ปฏิบัติการ (เภสัชกร)",
    "เลขทะเบียนเภสัชกรรม", "วันที่อนุญาต", "วันหมดอายุ", "จังหวัด/อำเภอ", "Confidence (%)"
  ];
  
  const sheet = getOrCreateSheet(ss, SHEET_DATA_NAME, headers);
  let totalConf = 0;

  const rows = items.map(data => {
    totalConf += (data.confidence || 0);
    return [
      timestamp || new Date().toLocaleString('th-TH'),
      data.filename || '',
      data.licenseType || '',
      data.licenseNo || '',
      data.granteeName || '',
      data.premisesName || '',
      data.pharmacistName || '',
      data.pharmacistRegNo || '',
      data.issueDate || '',
      data.expiryDate || '',
      data.locationProvince || '',
      data.confidence || 0
    ];
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
    const avgConf = Math.round(totalConf / rows.length);
    logScanActivity(ss, rows.length, avgConf, "Batch Save");
  }
}

function logScanActivity(ss, itemCoung, avgConf, mode) {
  const logHeaders = ["เวลาบันทึก", "จำนวนรายการ", "ความแม่นยำเฉลี่ย (%)", "โหมดการบันทึก", "สถานะ"];
  const logSheet = getOrCreateSheet(ss, SHEET_LOG_NAME, logHeaders);
  logSheet.appendRow([
    new Date().toLocaleString('th-TH'),
    itemCoung,
    avgConf,
    mode,
    "สำเร็จ"
  ]);
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
