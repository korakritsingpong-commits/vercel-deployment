/**
 * Parser Module — Thai Medical/Pharmacy License Entity & Field Extraction
 */

class LicenseParser {
  /**
   * Classify license document type from raw OCR text
   * @param {string} text Raw OCR text
   * @returns {string} License Type (ข.ย.1, ข.ย.2, ข.ย.3, ข.ย.4, ส.พ.7, ข.ย.บ., อื่นๆ)
   */
  classifyLicenseType(text) {
    if (!text) return 'อื่นๆ';

    const normalized = text.replace(/\s+/g, ' ');

    if (/ข\.?\s*ย\.?\s*1|ขายยาแผนปัจจุบัน/i.test(normalized)) {
      return 'ข.ย.1';
    }
    if (/ข\.?\s*ย\.?\s*2|บรรจุเสร็จ/i.test(normalized)) {
      return 'ข.ย.2';
    }
    if (/ข\.?\s*ย\.?\s*3|สำหรับสัตว์/i.test(normalized)) {
      return 'ข.ย.3';
    }
    if (/ข\.?\s*ย\.?\s*4|ขายส่งยา/i.test(normalized)) {
      return 'ข.ย.4';
    }
    if (/ส\.?\s*พ\.?\s*7|สถานพยาบาล/i.test(normalized)) {
      return 'ส.พ.7';
    }
    if (/ข\.?\s*ย\.?\s*บ|แผนโบราณ/i.test(normalized)) {
      return 'ข.ย.บ.';
    }

    return 'อื่นๆ';
  }

  /**
   * Extract key license fields from text
   * @param {string} text Raw text
   * @param {Array} words Word objects array with confidence scores from Tesseract
   * @returns {Object} Extracted fields object
   */
  parse(text, words = []) {
    const type = this.classifyLicenseType(text);
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const result = {
      licenseType: type,
      licenseNo: this.extractLicenseNo(text, lines),
      granteeName: this.extractGranteeName(text, lines),
      premisesName: this.extractPremisesName(text, lines),
      pharmacistName: this.extractPharmacistName(text, lines),
      pharmacistRegNo: this.extractPharmacistRegNo(text, lines),
      issueDate: this.extractIssueDate(text, lines),
      expiryDate: this.extractExpiryDate(text, lines),
      locationProvince: this.extractLocation(text, lines),
      confidences: {}
    };

    // Calculate confidence score per field
    const fieldKeys = [
      'licenseNo', 'granteeName', 'premisesName', 'pharmacistName',
      'pharmacistRegNo', 'issueDate', 'expiryDate', 'locationProvince'
    ];

    fieldKeys.forEach(key => {
      const val = result[key];
      result.confidences[key] = this.calculateConfidenceForValue(val, words);
    });

    return result;
  }

  extractLicenseNo(text, lines) {
    // Matches patterns like "เลขที่ นบ 1/2569", "ใบอนุญาตเลขที่ 12/2568", "ที่ นบ. 0033/123"
    const match = text.match(/(?:เลขที่|ที่|ใบอนุญาตเลขที่)\s*[:\s]*([ก-ฮa-zA-Z0-9\/\.\-]+(?:\s+\d+\/\d+)?)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    // Fallback: search lines containing slash numbers e.g. 12/2569
    for (const line of lines) {
      const slashMatch = line.match(/([ก-ฮA-Z]{1,3}\s*\d+\/\d{4}|\d+\/\d{4})/);
      if (slashMatch) return slashMatch[1].trim();
    }
    return '';
  }

  extractGranteeName(text, lines) {
    // Matches patterns after "ให้ไว้แก่", "อนุญาตให้", "ผู้รับอนุญาต"
    const match = text.match(/(?:ให้ไว้แก่|อนุญาตให้|ชื่อผู้รับอนุญาต|ผู้รับใบอนุญาต)\s*[:\s]*([ก-ฮa-zA-Z\s\.\(\)บริษัทจำกัดห้างหุ้นส่วน]+?)(?=\s*(?:สถานที่|เปิด|ขาย|ณ|ตั้งอยู่|บ้านเลขที่|$))/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return '';
  }

  extractPremisesName(text, lines) {
    // Matches patterns like "ชื่อสถานที่ขายยา", "ชื่อสถานพยาบาล", "ชื่อร้าน", "สถานที่ชื่อ"
    const match = text.match(/(?:ชื่อสถานที่|ชื่อสถานพยาบาล|ชื่อร้าน|สถานที่ใช้ชื่อว่า|ประกอบกิจการในชื่อ)\s*[:\s]*([ก-ฮa-zA-Z0-9\s\.\(\)]+?)(?=\s*(?:ตั้งอยู่|เลขที่|ถนน|ตำบล|แขวง|อำเภอ|เขต|จังหวัด|$))/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return '';
  }

  extractPharmacistName(text, lines) {
    // Matches patterns like "ผู้มีหน้าที่ปฏิบัติการ", "เภสัชกรประจำร้าน", "ภก.", "ภญ."
    const match = text.match(/(?:ผู้มีหน้าที่ปฏิบัติการ|เภสัชกรประจำ|ผู้ประกอบวิชาชีพ|ชื่อเภสัชกร)\s*[:\s]*((?:ภก\.|ภญ\.|นาย|นาง|นางสาว)?\s*[ก-ฮa-zA-Z\s]+?)(?=\s*(?:เลขทะเบียน|ใบอนุญาต|ตั้งแต่|$))/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    // Direct match for ภก./ภญ.
    const directMatch = text.match(/((?:ภก\.|ภญ\.)\s*[ก-ฮ\s]+)/);
    if (directMatch) return directMatch[1].trim();

    return '';
  }

  extractPharmacistRegNo(text, lines) {
    // Matches patterns like "เลขทะเบียนภ. 12345", "ใบอนุญาตประกอบวิชาชีพเลขที่ ภ.54321"
    const match = text.match(/(?:เลขทะเบียน|ใบอนุญาตประกอบวิชาชีพ|ภ\.\s*ส\.|ภ\.)\s*[:\s]*([ภ\.\s0-9]{3,10})/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return '';
  }

  extractIssueDate(text, lines) {
    // Matches Thai dates e.g. "1 มกราคม 2569", "ให้ไว้ ณ วันที่ 15 กุมภาพันธ์ พ.ศ. 2568"
    const match = text.match(/(?:ให้ไว้\s*ณ\s*วันที่|ตั้งแต่วันที่|เมื่อวันที่)\s*[:\s]*(\d{1,2}\s+[ก-ฮ]+(?:\s+พ\.ศ\.)?\s+\d{4})/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return '';
  }

  extractExpiryDate(text, lines) {
    // Matches "จนถึงวันที่ 31 ธันวาคม 2569", "สิ้นสุดวันที่"
    const match = text.match(/(?:จนถึงวันที่|สิ้นสุดวันที่|หมดอายุวันที่|ถึงวันที่)\s*[:\s]*(\d{1,2}\s+[ก-ฮ]+(?:\s+พ\.ศ\.)?\s+\d{4})/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    // Standard pharmacy license default: "31 ธันวาคม พ.ศ. ..."
    const defaultMatch = text.match(/(31\s+ธันวาคม\s+(?:พ\.ศ\.\s*)?\d{4})/i);
    if (defaultMatch) return defaultMatch[1].trim();

    return '';
  }

  extractLocation(text, lines) {
    // Matches "จังหวัด...", "อำเภอ..."
    const provMatch = text.match(/(?:จังหวัด)\s*([ก-ฮ]+)/);
    const distMatch = text.match(/(?:อำเภอ|เขต)\s*([ก-ฮ]+)/);

    if (provMatch && distMatch) {
      return `${provMatch[1]} / ${distMatch[1]}`;
    } else if (provMatch) {
      return provMatch[1];
    }
    return '';
  }

  calculateConfidenceForValue(valueStr, words) {
    if (!valueStr || words.length === 0) return 60; // default medium-low if extracted via regex without direct word match

    const tokens = valueStr.split(/\s+/).filter(t => t.length > 1);
    let totalConf = 0;
    let matchCount = 0;

    tokens.forEach(token => {
      const matchedWord = words.find(w => w.text && w.text.includes(token));
      if (matchedWord) {
        totalConf += matchedWord.confidence;
        matchCount++;
      }
    });

    if (matchCount > 0) {
      return Math.round(totalConf / matchCount);
    }
    return 75; // Baseline default for successful regex match
  }
}

window.licenseParser = new LicenseParser();
