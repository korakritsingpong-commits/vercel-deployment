/**
 * App Orchestrator Module — License Scanner Web Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const configSection = document.getElementById('configSection');
  const configBody = document.getElementById('configBody');
  const toggleConfigBtn = document.getElementById('toggleConfigBtn');
  const scriptUrlInput = document.getElementById('scriptUrlInput');
  const saveConfigBtn = document.getElementById('saveConfigBtn');

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const cameraInput = document.getElementById('cameraInput');

  const progressContainer = document.getElementById('progressContainer');
  const progressStatus = document.getElementById('progressStatus');
  const progressPercent = document.getElementById('progressPercent');
  const progressBarFill = document.getElementById('progressBarFill');

  const workspaceGrid = document.getElementById('workspaceGrid');
  const batchCountBadge = document.getElementById('batchCountBadge');
  const batchThumbnails = document.getElementById('batchThumbnails');
  const previewCanvas = document.getElementById('previewCanvas');
  const rawTextBox = document.getElementById('rawTextBox');

  const overallConfidenceBadge = document.getElementById('overallConfidenceBadge');
  const licenseForm = document.getElementById('licenseForm');

  const saveSingleBtn = document.getElementById('saveSingleBtn');
  const saveAllBtn = document.getElementById('saveAllBtn');
  const batchPendingCount = document.getElementById('batchPendingCount');
  const clearBtn = document.getElementById('clearBtn');

  const historyTableBody = document.getElementById('historyTableBody');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  // Application State
  let batchQueue = []; // Array of { id, file, canvas, rawText, parsedData, confidence, status }
  let activeIndex = 0;
  let sessionHistory = [];

  // Initialize Web App
  initApp();

  function initApp() {
    // Load stored Script URL
    const storedUrl = window.sheetsAPI.getScriptUrl();
    if (storedUrl) {
      scriptUrlInput.value = storedUrl;
    } else {
      configBody.classList.remove('hidden');
    }

    // Event Listeners
    toggleConfigBtn.addEventListener('click', () => configBody.classList.toggle('hidden'));

    saveConfigBtn.addEventListener('click', () => {
      const url = scriptUrlInput.value.trim();
      window.sheetsAPI.setScriptUrl(url);
      alert(url ? 'บันทึก Web App URL เรียบร้อยแล้ว' : 'ลบการตั้งค่า URL เรียบร้อยแล้ว');
      if (url) configBody.classList.add('hidden');
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleIncomingFiles(Array.from(files));
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleIncomingFiles(Array.from(e.target.files));
      }
    });

    cameraInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleIncomingFiles(Array.from(e.target.files));
      }
    });

    saveSingleBtn.addEventListener('click', handleSaveSingle);
    saveAllBtn.addEventListener('click', handleSaveAll);
    clearBtn.addEventListener('click', handleClearWorkspace);
    clearHistoryBtn.addEventListener('click', handleClearHistory);

    // Form Change Auto-Update Item State
    licenseForm.addEventListener('input', updateActiveItemFromForm);
  }

  /**
   * Handle incoming image or PDF files
   * @param {Array<File>} files List of input files
   */
  async function handleIncomingFiles(files) {
    showProgress('จัดเตรียมไฟล์...', 0.05);

    try {
      const newItems = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (window.pdfHandler.isPDF(file)) {
          showProgress(`กำลังแปลงไฟล์ PDF: ${file.name}...`, 0.1);
          const pdfCanvases = await window.pdfHandler.pdfToCanvases(file);
          pdfCanvases.forEach((item, idx) => {
            newItems.push({
              id: Date.now() + '_' + idx,
              filename: `${file.name} (หน้า ${item.pageNum}/${item.totalPages})`,
              canvas: item.canvas,
              rawText: '',
              parsedData: null,
              confidence: 0,
              status: 'pending'
            });
          });
        } else {
          showProgress(`กำลังโหลดภาพ: ${file.name}...`, 0.1);
          const canvas = await imageFileToCanvas(file);
          newItems.push({
            id: Date.now() + '_' + i,
            filename: file.name,
            canvas: canvas,
            rawText: '',
            parsedData: null,
            confidence: 0,
            status: 'pending'
          });
        }
      }

      batchQueue = batchQueue.concat(newItems);
      workspaceGrid.classList.remove('hidden');
      updateBatchUI();

      // Process OCR for unprocessed items in queue
      await processOCRQueue();

    } catch (err) {
      alert('เกิดข้อผิดพลาดในการโหลดไฟล์: ' + err.message);
      hideProgress();
    }
  }

  /**
   * Run OCR for pending items in batchQueue
   */
  async function processOCRQueue() {
    for (let i = 0; i < batchQueue.length; i++) {
      const item = batchQueue[i];
      if (item.status === 'pending' || !item.parsedData) {
        showProgress(`กำลังสแกน OCR รายการที่ ${i + 1}/${batchQueue.length} (${item.filename})...`, 0.2);

        const ocrResult = await window.ocrEngine.recognize(item.canvas, (statusMsg, pct) => {
          showProgress(`รายการที่ ${i + 1}/${batchQueue.length}: ${statusMsg}`, pct);
        });

        const parsed = window.licenseParser.parse(ocrResult.text, ocrResult.words);

        item.rawText = ocrResult.text;
        item.parsedData = parsed;
        item.confidence = ocrResult.confidence;
        item.status = 'ready';

        if (i === activeIndex) {
          displayActiveItem();
        }
      }
    }

    hideProgress();
    updateBatchUI();
  }

  /**
   * Display current active item in workspace form & canvas preview
   */
  function displayActiveItem() {
    if (batchQueue.length === 0) return;

    const item = batchQueue[activeIndex];

    // Render Canvas Preview
    const ctx = previewCanvas.getContext('2d');
    previewCanvas.width = item.canvas.width;
    previewCanvas.height = item.canvas.height;
    ctx.drawImage(item.canvas, 0, 0);

    // Render Raw Text
    rawTextBox.textContent = item.rawText || 'ไม่อบพบข้อความ';

    // Populate Form
    const data = item.parsedData || {};
    document.getElementById('licenseType').value = data.licenseType || 'ข.ย.1';
    document.getElementById('licenseNo').value = data.licenseNo || '';
    document.getElementById('granteeName').value = data.granteeName || '';
    document.getElementById('premisesName').value = data.premisesName || '';
    document.getElementById('pharmacistName').value = data.pharmacistName || '';
    document.getElementById('pharmacistRegNo').value = data.pharmacistRegNo || '';
    document.getElementById('issueDate').value = data.issueDate || '';
    document.getElementById('expiryDate').value = data.expiryDate || '';
    document.getElementById('locationProvince').value = data.locationProvince || '';

    // Overall Confidence Badge
    setConfidenceBadge(overallConfidenceBadge, item.confidence);

    // Field-level Confidence Tags
    const confs = data.confidences || {};
    Object.keys(confs).forEach(key => {
      const tagEl = document.getElementById('conf_' + key);
      if (tagEl) {
        setConfidenceTag(tagEl, confs[key]);
      }
    });

    updateThumbnailActiveState();
  }

  /**
   * Update active item data when user edits form fields
   */
  function updateActiveItemFromForm() {
    if (batchQueue.length === 0) return;

    const item = batchQueue[activeIndex];
    if (!item.parsedData) item.parsedData = {};

    item.parsedData.licenseType = document.getElementById('licenseType').value;
    item.parsedData.licenseNo = document.getElementById('licenseNo').value;
    item.parsedData.granteeName = document.getElementById('granteeName').value;
    item.parsedData.premisesName = document.getElementById('premisesName').value;
    item.parsedData.pharmacistName = document.getElementById('pharmacistName').value;
    item.parsedData.pharmacistRegNo = document.getElementById('pharmacistRegNo').value;
    item.parsedData.issueDate = document.getElementById('issueDate').value;
    item.parsedData.expiryDate = document.getElementById('expiryDate').value;
    item.parsedData.locationProvince = document.getElementById('locationProvince').value;
  }

  /**
   * Update Batch Queue UI (Thumbnails & Badges)
   */
  function updateBatchUI() {
    batchCountBadge.textContent = `${batchQueue.length} รายการ`;
    batchPendingCount.textContent = batchQueue.filter(i => i.status !== 'saved').length;

    batchThumbnails.innerHTML = '';
    batchQueue.forEach((item, index) => {
      const img = document.createElement('img');
      img.src = item.canvas.toDataURL('image/jpeg', 0.5);
      img.className = `batch-thumb ${index === activeIndex ? 'active' : ''}`;
      img.title = `${item.filename} (${item.confidence}%)`;
      img.addEventListener('click', () => {
        activeIndex = index;
        displayActiveItem();
      });
      batchThumbnails.appendChild(img);
    });

    if (batchQueue.length > 0 && activeIndex < batchQueue.length) {
      displayActiveItem();
    }
  }

  function updateThumbnailActiveState() {
    const thumbs = batchThumbnails.querySelectorAll('.batch-thumb');
    thumbs.forEach((t, idx) => {
      t.classList.toggle('active', idx === activeIndex);
    });
  }

  /**
   * Save current active item to Google Sheets
   */
  async function handleSaveSingle() {
    if (batchQueue.length === 0) return;

    updateActiveItemFromForm();
    const item = batchQueue[activeIndex];

    saveSingleBtn.disabled = true;
    saveSingleBtn.textContent = '⏳ กำลังบันทึก...';

    try {
      const result = await window.sheetsAPI.submitSingle({
        filename: item.filename,
        confidence: item.confidence,
        ...item.parsedData
      });

      item.status = 'saved';
      addHistoryRecord(item, 'สำเร็จ (Single)');
      alert(result.message);
      updateBatchUI();

    } catch (err) {
      alert(err.message);
      addHistoryRecord(item, 'ล้มเหลว: ' + err.message);
    } finally {
      saveSingleBtn.disabled = false;
      saveSingleBtn.innerHTML = '<span>💾 บันทึกรายการนี้</span>';
    }
  }

  /**
   * Save all items in batch queue to Google Sheets
   */
  async function handleSaveAll() {
    if (batchQueue.length === 0) return;

    updateActiveItemFromForm();
    saveAllBtn.disabled = true;
    saveAllBtn.textContent = '⏳ กำลังบันทึกทั้งหมด...';

    try {
      const payloadItems = batchQueue.map(item => ({
        filename: item.filename,
        confidence: item.confidence,
        ...item.parsedData
      }));

      const result = await window.sheetsAPI.submitBatch(payloadItems);

      batchQueue.forEach(item => {
        item.status = 'saved';
        addHistoryRecord(item, 'สำเร็จ (Batch)');
      });

      alert(result.message);
      updateBatchUI();

    } catch (err) {
      alert(err.message);
    } finally {
      saveAllBtn.disabled = false;
      saveAllBtn.innerHTML = `<span>🚀 บันทึกทั้งหมด (<span id="batchPendingCount">${batchQueue.filter(i => i.status !== 'saved').length}</span>)</span>`;
    }
  }

  function handleClearWorkspace() {
    if (confirm('คุณต้องการล้างข้อมูลภาพและฟอร์มทั้งหมดในเซสชันนี้ใช่หรือไม่?')) {
      batchQueue = [];
      activeIndex = 0;
      workspaceGrid.classList.add('hidden');
      licenseForm.reset();
      rawTextBox.textContent = 'ยังไม่มีข้อมูล';
      updateBatchUI();
    }
  }

  function handleClearHistory() {
    sessionHistory = [];
    renderHistoryTable();
  }

  function addHistoryRecord(item, statusText) {
    sessionHistory.unshift({
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      licenseType: item.parsedData.licenseType,
      licenseNo: item.parsedData.licenseNo || '-',
      premisesName: item.parsedData.premisesName || '-',
      granteeName: item.parsedData.granteeName || '-',
      confidence: item.confidence,
      status: statusText
    });
    renderHistoryTable();
  }

  function renderHistoryTable() {
    if (sessionHistory.length === 0) {
      historyTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="7">ยังไม่มีรายการสแกนที่บันทึก</td>
        </tr>`;
      return;
    }

    historyTableBody.innerHTML = sessionHistory.map(row => `
      <tr>
        <td>${row.time}</td>
        <td><span class="badge badge-info">${row.licenseType}</span></td>
        <td><strong>${row.licenseNo}</strong></td>
        <td>${row.premisesName}</td>
        <td>${row.granteeName}</td>
        <td><span class="confidence-tag ${getConfClass(row.confidence)}">${row.confidence}%</span></td>
        <td>${row.status.includes('สำเร็จ') ? '✅ ' + row.status : '❌ ' + row.status}</td>
      </tr>
    `).join('');
  }

  // Helpers
  function imageFileToCanvas(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function showProgress(text, pct) {
    progressContainer.classList.remove('hidden');
    progressStatus.textContent = text;
    const percentInt = Math.round(pct * 100);
    progressPercent.textContent = `${percentInt}%`;
    progressBarFill.style.width = `${percentInt}%`;
  }

  function hideProgress() {
    progressContainer.classList.add('hidden');
  }

  function setConfidenceBadge(element, conf) {
    element.textContent = `${conf}%`;
    element.className = `badge ${getConfClass(conf)}`;
  }

  function setConfidenceTag(element, conf) {
    element.textContent = `${conf}%`;
    element.className = `confidence-tag ${getConfClass(conf)}`;
  }

  function getConfClass(conf) {
    if (conf >= 80) return 'conf-high';
    if (conf >= 50) return 'conf-medium';
    return 'conf-low';
  }
});
