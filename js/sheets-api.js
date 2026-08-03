/**
 * Sheets API Module — Interacts with Google Apps Script Web App Endpoint
 */

class SheetsAPI {
  constructor() {
    this.storageKey = 'license_scanner_script_url';
  }

  /**
   * Get configured Apps Script Web App URL from localStorage
   * @returns {string} Configured URL or empty string
   */
  getScriptUrl() {
    return localStorage.getItem(this.storageKey) || '';
  }

  /**
   * Save Web App URL to localStorage
   * @param {string} url Apps Script Endpoint URL
   */
  setScriptUrl(url) {
    if (url) {
      localStorage.setItem(this.storageKey, url.trim());
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Submit single license data object to Google Sheets via Web App Endpoint
   * @param {Object} data License data object
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async submitSingle(data) {
    const url = this.getScriptUrl();
    if (!url) {
      throw new Error('ยังไม่ได้ตั้งค่า Google Apps Script Web App URL');
    }

    const payload = {
      action: 'saveSingle',
      timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      data: data
    };

    try {
      // Use no-cors mode fallback if needed, but standard POST first
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Apps Script handles text/plain JSON payload cleanly without CORS preflight
        },
        body: JSON.stringify(payload)
      });

      const resText = await response.text();
      let resJson;
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        resJson = { status: 'success', message: 'ส่งข้อมูลสำเร็จ' };
      }

      return {
        success: true,
        message: resJson.message || 'บันทึกลง Google Sheet สำเร็จ'
      };
    } catch (err) {
      console.error('Error submitting to Google Sheets:', err);
      throw new Error('การส่งข้อมูลไป Google Sheet ล้มเหลว: ' + err.message);
    }
  }

  /**
   * Submit batch array of license data objects to Google Sheets
   * @param {Array<Object>} batchArray Array of license objects
   * @returns {Promise<{success: boolean, message: string, count: number}>}
   */
  async submitBatch(batchArray) {
    const url = this.getScriptUrl();
    if (!url) {
      throw new Error('ยังไม่ได้ตั้งค่า Google Apps Script Web App URL');
    }

    if (!batchArray || batchArray.length === 0) {
      throw new Error('ไม่มีรายการสำหรับบันทึก');
    }

    const payload = {
      action: 'saveBatch',
      timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      items: batchArray
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      const resText = await response.text();
      let resJson;
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        resJson = { status: 'success', count: batchArray.length };
      }

      return {
        success: true,
        count: batchArray.length,
        message: `บันทึกรายการชุดสำเร็จ ทั้งหมด ${batchArray.length} รายการ`
      };
    } catch (err) {
      console.error('Error submitting batch to Google Sheets:', err);
      throw new Error('การส่งข้อมูลชุดล้มเหลว: ' + err.message);
    }
  }
}

window.sheetsAPI = new SheetsAPI();
