/**
 * =========================================================================
 * DompetKu - Google Apps Script Backend (Full CRUD, Multi-Tab)
 * =========================================================================
 * 
 * Mendukung 6 Tab Spreadsheet:
 *   Transactions, Accounts, Assets, BudgetCategories, Debts, Settings
 *
 * CARA DEPLOY / UPDATE:
 * 1. Buka Google Spreadsheet Database Anda.
 * 2. Klik Extensions > Apps Script.
 * 3. Hapus SEMUA kode lama, lalu paste kode ini.
 * 4. Klik Deploy > Manage deployments > Edit (ikon pensil).
 * 5. Ubah Version ke "New version", klik Deploy.
 * 6. Jika deploy baru: Deploy > New deployment > Web app > Execute as: Me, Access: Anyone.
 */

// ===================== KONFIGURASI =====================
const VALID_SHEETS = ['Transactions', 'Accounts', 'Fixed Income Investment', 'BudgetCategories', 'Debts', 'Settings', 'AssetsNonLiquid', 'Saham', 'Crypto', 'Reksadana', 'Goals', 'Recurring', 'Insurance'];

// Tab baru (Fase 2) yang dibuat OTOMATIS saat pertama diakses — user lama TIDAK perlu
// menyentuh spreadsheet. Jangan masukkan tab lama ke sini (perilaku tab lama tak berubah).
const AUTO_CREATE_SHEETS = ['Goals', 'Recurring', 'Insurance'];

// Header kolom untuk setiap tab (urutan HARUS sama dengan di Spreadsheet)
const HEADERS = {
  Transactions: ['id', 'date', 'desc', 'location', 'amount', 'category', 'icon', 'status', 'account', 'type'],
  Accounts: ['id', 'name', 'type', 'balance', 'currency', 'icon', 'startDate', 'valuationReminder', 'lastValuationUpdate'],
  'Fixed Income Investment': ['id', 'title', 'category', 'purchasePrice', 'currentValue', 'purchaseDate', 'location', 'icon', 'equity', 'notes', 'ticker', 'shares', 'avgCost', 'interestRate', 'maturityDate', 'subType'],
  BudgetCategories: ['id', 'name', 'icon', 'color', 'type', 'allocated', 'includeInTotal', 'alertAt'],
  Debts: ['id', 'name', 'type', 'balance', 'interestRate', 'minPayment', 'icon', 'originalAmount', 'interestType', 'startDate', 'endDate', 'dueDate', 'lender', 'status'],
  Settings: ['key', 'value'],
  AssetsNonLiquid: ['id', 'title', 'category', 'subType', 'purchasePrice', 'currentValue', 'purchaseDate', 'location', 'icon', 'notes', 'specification', 'landArea', 'buildingArea', 'mfgYear', 'usefulLife', 'depreciationMethod', 'valuationReminder', 'lastValuationUpdate'],
  Saham: ['ID', 'Title', 'Ticker', 'Shares', 'Avg. Cost', 'Current Price', 'Purchase Date', 'Location', 'Icon', 'Notes'],
  Crypto: ['ID', 'Title', 'Ticker', 'Coins', 'Avg. Cost', 'Current Price', 'Purchase Date', 'Location', 'Icon', 'Notes'],
  Reksadana: ['ID', 'Title', 'Ticker', 'Units', 'Avg. Cost', 'Current Price', 'Purchase Date', 'Location', 'Icon', 'Notes'],
  // ── Fase 2 (v2.0) — tab baru, dibuat otomatis oleh ensureSheetExists() ──
  Goals: ['id', 'name', 'icon', 'color', 'goalType', 'targetAmount', 'targetDate', 'startDate', 'initialAmount', 'expectedReturn', 'monthlyContribution', 'priority', 'status', 'notes'],
  Recurring: ['id', 'name', 'type', 'amount', 'category', 'account', 'frequency', 'dayOfMonth', 'startDate', 'endDate', 'lastPostedDate', 'autoPost', 'notes'],
  Insurance: ['id', 'name', 'insType', 'provider', 'policyNumber', 'premium', 'premiumFrequency', 'coverageAmount', 'startDate', 'renewalDate', 'insured', 'beneficiary', 'status', 'notes']
};

// ===================== HELPER =====================

/**
 * Fase 2: buat tab baru + header otomatis bila belum ada (hanya untuk AUTO_CREATE_SHEETS).
 * Membuat user lama TIDAK perlu mengedit spreadsheet — cukup update Apps Script.
 */
function ensureSheetExists(sheetName) {
  if (AUTO_CREATE_SHEETS.indexOf(sheetName) === -1) return null; // jangan sentuh tab lama
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = HEADERS[sheetName];
    if (headers && headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/** Membaca semua data dari sebuah tab dan mengembalikannya sebagai array of objects */
function readSheet(sheetName) {
  if (sheetName === 'Fixed Income Investment') {
    return readFixedIncomeSheet();
  }
  ensureSheetExists(sheetName);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Skip baris kosong (yang id/key-nya kosong)
    if (!row[0] && row[0] !== 0) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}

/** Helper untuk mengambil nilai secara case-insensitive dan alias kecocokan kolom */
function getValueCaseInsensitive(data, header) {
  if (!data) return undefined;
  
  // 1. Direct match
  if (data[header] !== undefined) return data[header];
  
  // 2. Normalisasikan header ke lowercase dan tanpa spasi/titik
  var cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Daftar alias khusus untuk kolom tertentu
  var aliases = {
    'id': ['id', 'ID', 'key', 'Key'],
    'title': ['title', 'Title', 'name', 'Name'],
    'ticker': ['ticker', 'Ticker', 'symbol', 'Symbol'],
    'shares': ['shares', 'Shares', 'qty', 'Qty', 'quantity', 'Quantity', 'units', 'Units', 'coins', 'Coins'],
    'coins': ['shares', 'Shares', 'qty', 'Qty', 'quantity', 'Quantity', 'units', 'Units', 'coins', 'Coins'],
    'units': ['shares', 'Shares', 'qty', 'Qty', 'quantity', 'Quantity', 'units', 'Units', 'coins', 'Coins'],
    'avgcost': ['avgcost', 'avgCost', 'AvgCost', 'avg_cost', 'avg. cost', 'Avg. Cost', 'navperunit', 'navPerUnit', 'NavPerUnit'],
    'navperunit': ['avgcost', 'avgCost', 'AvgCost', 'avg_cost', 'avg. cost', 'Avg. Cost', 'navperunit', 'navPerUnit', 'NavPerUnit'],
    'currentprice': ['currentprice', 'currentPrice', 'CurrentPrice', 'current_price', 'current price', 'Current Price', 'currentnav', 'currentNav', 'CurrentNav', 'current_nav', 'nav'],
    'currentnav': ['currentprice', 'currentPrice', 'CurrentPrice', 'current_price', 'current price', 'Current Price', 'currentnav', 'currentNav', 'CurrentNav', 'current_nav', 'nav'],
    'purchasedate': ['purchasedate', 'purchaseDate', 'PurchaseDate', 'purchase_date', 'purchase date', 'Purchase Date', 'date', 'Date'],
    'location': ['location', 'Location', 'broker', 'Broker', 'platform', 'Platform'],
    'icon': ['icon', 'Icon'],
    'notes': ['notes', 'Notes', 'keterangan', 'Keterangan']
  };
  
  // Cari di keys dari data
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Cocokkan clean header langsung
    if (cleanKey === cleanHeader) return data[key];
    
    // Cocokkan menggunakan alias
    if (aliases[cleanHeader] && aliases[cleanHeader].indexOf(key) !== -1) {
      return data[key];
    }
  }
  
  return undefined;
}

/** Helper untuk membersihkan format ISO Date (dengan T dan Z) ke format YYYY-MM-DD standar */
function cleanDateString(dateStr) {
  if (!dateStr) return '';
  return String(dateStr).split('T')[0];
}

/** Menulis satu baris baru ke tab berdasarkan header yang sudah didefinisikan */
function appendToSheet(sheetName, data) {
  if (sheetName === 'Fixed Income Investment') {
    return appendFixedIncome(data);
  }
  ensureSheetExists(sheetName);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('Tab "' + sheetName + '" tidak ditemukan');

  var headers = HEADERS[sheetName];
  var row = headers.map(function(h) { 
    var val = getValueCaseInsensitive(data, h);
    return val !== undefined ? val : ''; 
  });
  sheet.appendRow(row);
}

/** Mengupdate baris berdasarkan id (kolom pertama) */
function updateInSheet(sheetName, id, data) {
  if (sheetName === 'Fixed Income Investment') {
    return updateFixedIncome(id, data);
  }
  ensureSheetExists(sheetName);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('Tab "' + sheetName + '" tidak ditemukan');

  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];

  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(id)) {
      var rowValues = headers.map(function(h) {
        var val = getValueCaseInsensitive(data, h);
        return val !== undefined ? val : allData[i][headers.indexOf(h)];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([rowValues]);
      return true;
    }
  }
  return false;
}

/** Menghapus baris berdasarkan id (kolom pertama) */
function deleteFromSheet(sheetName, id) {
  if (sheetName === 'Fixed Income Investment') {
    return deleteFixedIncome(id);
  }
  ensureSheetExists(sheetName);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('Tab "' + sheetName + '" tidak ditemukan');

  var allData = sheet.getDataRange().getValues();

  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// ===================== WEB APP ENDPOINTS =====================

/**
 * GET — Membaca data.
 * Param: ?sheet=Transactions (opsional, default semua)
 *        ?sheet=all (mengembalikan semua tab sekaligus)
 */
function doGet(e) {
  try {
    var sheetParam = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : 'all';

    var result = {};

    if (sheetParam === 'all') {
      // Kembalikan semua tab
      for (var i = 0; i < VALID_SHEETS.length; i++) {
        var name = VALID_SHEETS[i];
        result[name] = readSheet(name);
      }
    } else if (VALID_SHEETS.indexOf(sheetParam) !== -1) {
      result[sheetParam] = readSheet(sheetParam);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Tab tidak valid: ' + sheetParam }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var activeSS = SpreadsheetApp.getActiveSpreadsheet();
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      spreadsheetId: activeSS.getId(),
      spreadsheetUrl: activeSS.getUrl(),
      data: result 
    }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST — Menulis/Update/Hapus data.
 * Body JSON: { action: "add|update|delete", sheet: "NamaTab", data: { ... } }
 * 
 * Contoh:
 *   { action: "add", sheet: "Transactions", data: { id: "abc123", date: "2026-05-20", ... } }
 *   { action: "update", sheet: "Debts", data: { id: "xyz", balance: 5000000 } }
 *   { action: "delete", sheet: "Accounts", data: { id: "acc1" } }
 */
function doPost(e) {
  try {
    var payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No data received' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var action = payload.action;
    var sheetName = payload.sheet;
    var data = payload.data;

    // Backward compatibility: support old "addTransaction" action
    if (action === 'addTransaction') {
      sheetName = 'Transactions';
      action = 'add';
    }

    if (!sheetName || VALID_SHEETS.indexOf(sheetName) === -1) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Tab tidak valid: ' + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'add') {
      appendToSheet(sheetName, data);
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'add', sheet: sheetName }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'update') {
      var updated = updateInSheet(sheetName, data.id || data.key, data);
      return ContentService.createTextOutput(JSON.stringify({ success: updated, action: 'update', sheet: sheetName }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'delete') {
      var deleted = deleteFromSheet(sheetName, data.id || data.key);
      return ContentService.createTextOutput(JSON.stringify({ success: deleted, action: 'delete', sheet: sheetName }))
        .setMimeType(ContentService.MimeType.JSON);

    } else {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Action tidak dikenali: ' + action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===================== SATU KALI SETUP & MIGRASI =====================

/**
 * Menyiapkan tab baru 'AssetsNonLiquid' dan memindahkan data aset fisik dari 'Assets' secara otomatis.
 * Jalankan fungsi ini sekali saja melalui tombol "Run" di editor Google Apps Script.
 */
function setupAssetsNonLiquidSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Dapatkan atau buat tab AssetsNonLiquid
  var nonLiquidSheet = ss.getSheetByName('AssetsNonLiquid');
  var isNewSheet = false;
  if (!nonLiquidSheet) {
    nonLiquidSheet = ss.insertSheet('AssetsNonLiquid');
    isNewSheet = true;
  }
  
  // 2. Set Header
  var headers = HEADERS.AssetsNonLiquid;
  nonLiquidSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Berikan format premium pada header
  var headerRange = nonLiquidSheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#0f5132') // Hijau Premium
             .setFontColor('#ffffff')  // Tulisan Putih
             .setFontWeight('bold')     // Tebal
             .setHorizontalAlignment('center');
  
  nonLiquidSheet.setFrozenRows(1); // Bekukan baris pertama
  
  // Auto-resize kolom agar rapi
  for (var i = 1; i <= headers.length; i++) {
    nonLiquidSheet.autoResizeColumn(i);
  }
  
  // 3. Migrasi data dari tab Assets jika ada
  var assetsSheet = ss.getSheetByName('Assets');
  if (!assetsSheet) {
    Logger.log('Tab Assets tidak ditemukan. Setup selesai dengan tab baru kosong.');
    return 'Tab AssetsNonLiquid siap digunakan!';
  }
  
  var assetsData = assetsSheet.getDataRange().getValues();
  if (assetsData.length <= 1) {
    Logger.log('Tidak ada data di tab Assets. Setup selesai dengan tab baru kosong.');
    return 'Tab AssetsNonLiquid siap digunakan!';
  }
  
  var assetsHeaders = assetsData[0];
  var migratedCount = 0;
  
  // Cari index kolom penting di Assets
  var idxId = assetsHeaders.indexOf('id');
  var idxTitle = assetsHeaders.indexOf('title');
  var idxCategory = assetsHeaders.indexOf('category');
  var idxSubType = assetsHeaders.indexOf('subType');
  var idxPurchasePrice = assetsHeaders.indexOf('purchasePrice');
  var idxCurrentValue = assetsHeaders.indexOf('currentValue');
  var idxPurchaseDate = assetsHeaders.indexOf('purchaseDate');
  var idxLocation = assetsHeaders.indexOf('location');
  var idxIcon = assetsHeaders.indexOf('icon');
  var idxNotes = assetsHeaders.indexOf('notes');
  
  // Indeks baris yang akan dihapus dari tab Assets lama (mulai dari baris terbawah agar indeks tidak bergeser)
  var rowsToDelete = [];
  
  for (var r = 1; r < assetsData.length; r++) {
    var row = assetsData[r];
    var category = String(row[idxCategory]).toLowerCase();
    
    // Kategori fisik yang harus dipindahkan: real-estat, kendaraan, koleksi
    if (category === 'real-estat' || category === 'kendaraan' || category === 'koleksi') {
      var id = row[idxId] || '';
      var title = row[idxTitle] || '';
      var purchasePrice = row[idxPurchasePrice] || 0;
      var currentValue = row[idxCurrentValue] || 0;
      var purchaseDate = row[idxPurchaseDate] || '';
      var location = row[idxLocation] || '';
      var icon = row[idxIcon] || '';
      var notes = row[idxNotes] || '';
      
      // Deteksi subtype dan properti khusus
      var subType = '';
      var depreciationMethod = 'Tidak Menyusut';
      var usefulLife = 10;
      
      if (category === 'real-estat') {
        subType = 'rumah';
        depreciationMethod = 'Tidak Menyusut'; // Properti umumnya naik/apresiasi
        usefulLife = 20;
      } else if (category === 'kendaraan') {
        subType = 'mobil';
        depreciationMethod = 'Garis Lurus'; // Kendaraan menyusut
        usefulLife = 8;
      } else if (category === 'koleksi') {
        subType = 'elektronik';
        depreciationMethod = 'Garis Lurus';
        usefulLife = 4;
      }
      
      // Siapkan baris data baru untuk AssetsNonLiquid
      var newRow = headers.map(function(h) {
        if (h === 'id') return id;
        if (h === 'title') return title;
        if (h === 'category') return category;
        if (h === 'subType') return subType;
        if (h === 'purchasePrice') return purchasePrice;
        if (h === 'currentValue') return currentValue;
        if (h === 'purchaseDate') return purchaseDate;
        if (h === 'location') return location;
        if (h === 'icon') return icon;
        if (h === 'notes') return notes;
        if (h === 'depreciationMethod') return depreciationMethod;
        if (h === 'usefulLife') return usefulLife;
        return ''; // kolom spesifik area, mfgYear kosong dulu
      });
      
      nonLiquidSheet.appendRow(newRow);
      rowsToDelete.push(r + 1); // Simpan baris Google Sheet (1-indexed)
      migratedCount++;
    }
  }
  
  // Hapus dari sheet Assets lama dari bawah ke atas agar indeks tidak geser
  for (var d = rowsToDelete.length - 1; d >= 0; d--) {
    assetsSheet.deleteRow(rowsToDelete[d]);
  }
  
  Logger.log('Migrasi Berhasil! ' + migratedCount + ' aset fisik dipindahkan ke AssetsNonLiquid.');
  return 'Migrasi Berhasil! ' + migratedCount + ' aset fisik dipindahkan ke tab baru AssetsNonLiquid secara otomatis!';
}

// ===================== SATU KALI SETUP TAB BUDGETING =====================

/**
 * Membuat tab 'Budgeting' dengan visualisasi premium 12 Bulan (Jan-Des), formula otomatis,
 * dan pembagian 4 kelompok budget sesuai template Anda.
 * Jalankan fungsi ini dari tombol "Run" di editor Google Apps Script.
 */
function setupBudgetingSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // A. Pastikan kategori pemasukan default terisi di tab BudgetCategories jika belum ada
  var catSheet = ss.getSheetByName('BudgetCategories');
  if (catSheet) {
    var catValues = catSheet.getDataRange().getValues();
    var existingCatNames = [];
    if (catValues.length > 1) {
      existingCatNames = catValues.slice(1).map(function(row) { return String(row[1]).toLowerCase(); });
    }
    
    var defaultIncomes = [
      { name: 'Salary', allocated: 9200000, icon: 'payments', color: '#4caf50' },
      { name: 'Partner Salary', allocated: 0, icon: 'payments', color: '#81c784' },
      { name: 'Side Hustle / Freelance', allocated: 0, icon: 'work', color: '#388e3c' },
      { name: 'Business Income', allocated: 0, icon: 'storefront', color: '#2e7d32' },
      { name: 'Investments Income / Dividends / Capital Gain', allocated: 479000, icon: 'trending_up', color: '#1b5e20' },
      { name: 'Rental Income', allocated: 15600000, icon: 'real_estate_agent', color: '#66bb6a' },
      { name: 'Commissions', allocated: 0, icon: 'paid', color: '#4caf50' },
      { name: 'Bonuses', allocated: 0, icon: 'redeem', color: '#ffb300' },
      { name: 'Pension Income', allocated: 0, icon: 'savings', color: '#8d6e63' },
      { name: 'Scholarships / Grants', allocated: 0, icon: 'school', color: '#1e88e5' },
      { name: 'Inheritance', allocated: 0, icon: 'family_restroom', color: '#ab47bc' },
      { name: 'Lottery / Gambling Winnings', allocated: 0, icon: 'casino', color: '#e53935' },
      { name: 'Gifts', allocated: 0, icon: 'featured_play_list', color: '#f48fb1' },
      { name: 'Refunds / Reimbursements', allocated: 0, icon: 'replay', color: '#90a4ae' },
      { name: 'Others', allocated: 0, icon: 'more_horiz', color: '#78909c' }
    ];
    
    for (var d = 0; d < defaultIncomes.length; d++) {
      var inc = defaultIncomes[d];
      if (existingCatNames.indexOf(inc.name.toLowerCase()) === -1) {
        var id = 'bcat_' + inc.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        catSheet.appendRow([id, inc.name, inc.icon, inc.color, 'Pemasukan', inc.allocated, 'TRUE', 80]);
      }
    }
  }

  // 1. Buat atau dapatkan tab 'Budgeting'
  var budgetSheet = ss.getSheetByName('Budgeting');
  if (budgetSheet) {
    ss.deleteSheet(budgetSheet); // Hapus jika sudah ada untuk menulis ulang layout secara rapi
  }
  budgetSheet = ss.insertSheet('Budgeting');
  
  // 2. Baca data pendukung dari tab lain
  var catData = readSheet('BudgetCategories');
  var settingsData = readSheet('Settings');
  
  // Cari custom monthly budgets di settings jika ada
  var monthlyBudgets = {};
  for (var i = 0; i < settingsData.length; i++) {
    if (settingsData[i].key === 'monthlyBudgets') {
      try {
        monthlyBudgets = JSON.parse(settingsData[i].value);
      } catch (e) {}
    }
  }
  
  // 3. Setup Header & Kolom Bulan (E s/d P)
  // Merge B2:D3 untuk judul Annual Budget
  budgetSheet.getRange('B2:D3').merge()
             .setValue('Annual Budget')
             .setBackground('#1e293b')
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setFontSize(16)
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle');
             
  var months = [
    { name: 'January', key: '01' }, { name: 'February', key: '02' }, { name: 'March', key: '03' },
    { name: 'April', key: '04' }, { name: 'May', key: '05' }, { name: 'June', key: '06' },
    { name: 'July', key: '07' }, { name: 'August', key: '08' }, { name: 'September', key: '09' },
    { name: 'October', key: '10' }, { name: 'November', key: '11' }, { name: 'December', key: '12' }
  ];
  
  // Merge baris 2-3 untuk masing-masing bulan
  for (var m = 0; m < months.length; m++) {
    var colLetter = String.fromCharCode(69 + m); // E = 69, F = 70, dst.
    var cellRange = colLetter + '2:' + colLetter + '3';
    budgetSheet.getRange(cellRange).merge()
               .setValue(months[m].name)
               .setBackground('#1e293b')
               .setFontColor('#ffffff')
               .setFontWeight('bold')
               .setFontSize(10)
               .setHorizontalAlignment('center')
               .setVerticalAlignment('middle');
  }
  
  // 4. Klasifikasi Kategori
  var incomeCats = [];
  var expenseCats = [];
  var savingCats = [];
  var investCats = [];
  
  for (var c = 0; c < catData.length; c++) {
    var name = catData[c].name;
    var type = catData[c].type;
    var id = catData[c].id;
    var allocated = Number(catData[c].allocated) || 0;
    
    var group = getCategoryGroup(name, type);
    var item = { id: id, name: name, allocated: allocated };
    
    if (group === 'INCOME') incomeCats.push(item);
    else if (group === 'SAVINGS') savingCats.push(item);
    else if (group === 'INVESTMENT') investCats.push(item);
    else expenseCats.push(item);
  }
  
  // Helper fungsi pengelompokan kategori (sama dengan logika frontend)
  function getCategoryGroup(name, type) {
    if (type === 'Pemasukan') return 'INCOME';
    var norm = name.toLowerCase();
    if (norm.indexOf('saving') !== -1 || norm.indexOf('tabungan') !== -1 || norm.indexOf('darurat') !== -1 || norm.indexOf('emergency') !== -1 || norm.indexOf('sinking') !== -1) {
      return 'SAVINGS';
    }
    if (norm.indexOf('invest') !== -1 || norm.indexOf('saham') !== -1 || norm.indexOf('crypto') !== -1 || norm.indexOf('reksa') !== -1 || norm.indexOf('bond') !== -1 || norm.indexOf('emas') !== -1 || norm.indexOf('gold') !== -1 || norm.indexOf('kripto') !== -1) {
      return 'INVESTMENT';
    }
    return 'EXPENSES';
  }
  
  // 5. Tulis Baris KPI (Baris 4 & 5)
  budgetSheet.getRange('B4:D4').merge().setValue('Allocated:').setFontWeight('bold').setHorizontalAlignment('right');
  budgetSheet.getRange('B5:D5').merge().setValue('Left to allocate:').setFontWeight('bold').setHorizontalAlignment('right');
  
  // 6. Gambar Konten & Formula
  var currentRow = 6;
  
  // a. Section Expected Income
  var incomeStartRow = currentRow + 1;
  budgetSheet.getRange(currentRow, 2, 1, 3).merge()
             .setValue('💵 Expected Income (Pendapatan)')
             .setFontWeight('bold');
  budgetSheet.getRange(currentRow, 2, 1, 15)
             .setBackground('#e8f5e9')
             .setFontColor('#0f5132');
  currentRow++;
  
  for (var i = 0; i < incomeCats.length; i++) {
    budgetSheet.getRange(currentRow, 2, 1, 3).merge().setValue(incomeCats[i].name).setFontWeight('bold');
    // Tulis nilai bulan-bulanan
    for (var m = 0; m < months.length; m++) {
      var yearMonthKey = '2026-' + months[m].key;
      var val = incomeCats[i].allocated;
      if (monthlyBudgets[yearMonthKey] && monthlyBudgets[yearMonthKey][incomeCats[i].name] !== undefined) {
        val = monthlyBudgets[yearMonthKey][incomeCats[i].name];
      }
      budgetSheet.getRange(currentRow, 5 + m).setValue(val).setNumberFormat('[$Rp-421] #,##0');
    }
    currentRow++;
  }
  var incomeEndRow = currentRow - 1;
  
  // Baris Total Income
  var totalIncomeRow = currentRow;
  budgetSheet.getRange(currentRow, 2, 1, 3).merge().setValue('Total Income').setFontWeight('bold').setBackground('#f8f9fa');
  for (var m = 0; m < months.length; m++) {
    var colLetter = String.fromCharCode(69 + m);
    var formula = '=SUM(' + colLetter + incomeStartRow + ':' + colLetter + incomeEndRow + ')';
    budgetSheet.getRange(currentRow, 5 + m).setFormula(formula).setFontWeight('bold').setBackground('#f8f9fa').setNumberFormat('[$Rp-421] #,##0');
  }
  currentRow += 2; // Berikan jeda 1 baris
  
  // b. Section Expenses
  var expenseStartRow = currentRow + 1;
  budgetSheet.getRange(currentRow, 2, 1, 3).merge()
             .setValue('🛒 Expenses Budget (Belanja & Operasional)')
             .setFontWeight('bold');
  budgetSheet.getRange(currentRow, 2, 1, 15)
             .setBackground('#fde8e8')
             .setFontColor('#ba1a1a');
  currentRow++;
  
  for (var i = 0; i < expenseCats.length; i++) {
    budgetSheet.getRange(currentRow, 2, 1, 3).merge().setValue(expenseCats[i].name);
    for (var m = 0; m < months.length; m++) {
      var yearMonthKey = '2026-' + months[m].key;
      var val = expenseCats[i].allocated;
      if (monthlyBudgets[yearMonthKey] && monthlyBudgets[yearMonthKey][expenseCats[i].name] !== undefined) {
        val = monthlyBudgets[yearMonthKey][expenseCats[i].name];
      }
      budgetSheet.getRange(currentRow, 5 + m).setValue(val).setNumberFormat('[$Rp-421] #,##0');
    }
    currentRow++;
  }
  var expenseEndRow = currentRow - 1;
  
  // Baris Total Expenses
  var totalExpensesRow = currentRow;
  budgetSheet.getRange(currentRow, 2, 1, 3).merge().setValue('Total Expenses').setFontWeight('bold').setBackground('#f8f9fa');
  for (var m = 0; m < months.length; m++) {
    var colLetter = String.fromCharCode(69 + m);
    var formula = '=SUM(' + colLetter + expenseStartRow + ':' + colLetter + expenseEndRow + ')';
    budgetSheet.getRange(currentRow, 5 + m).setFormula(formula).setFontWeight('bold').setBackground('#f8f9fa').setNumberFormat('[$Rp-421] #,##0');
  }
  currentRow += 2;
  
  // c. Section Savings
  var savingStartRow = currentRow + 1;
  budgetSheet.getRange(currentRow, 2, 1, 3).merge()
             .setValue('🐖 Saving Budget (Tabungan & Sinking Fund)')
             .setFontWeight('bold');
  budgetSheet.getRange(currentRow, 2, 1, 15)
             .setBackground('#fffde7')
             .setFontColor('#ef6c00');
  currentRow++;
  
  for (var i = 0; i < savingCats.length; i++) {
    budgetSheet.getRange(currentRow, 2, 1, 3).merge().setValue(savingCats[i].name);
    for (var m = 0; m < months.length; m++) {
      var yearMonthKey = '2026-' + months[m].key;
      var val = savingCats[i].allocated;
      if (monthlyBudgets[yearMonthKey] && monthlyBudgets[yearMonthKey][savingCats[i].name] !== undefined) {
        val = monthlyBudgets[yearMonthKey][savingCats[i].name];
      }
      budgetSheet.getRange(currentRow, 5 + m).setValue(val).setNumberFormat('[$Rp-421] #,##0');
    }
    currentRow++;
  }
  var savingEndRow = currentRow - 1;
  
  // Baris Total Savings
  var totalSavingsRow = currentRow;
  budgetSheet.getRange(currentRow, 2, 1, 3).merge().setValue('Total Savings').setFontWeight('bold').setBackground('#f8f9fa');
  for (var m = 0; m < months.length; m++) {
    var colLetter = String.fromCharCode(69 + m);
    var formula = '=SUM(' + colLetter + savingStartRow + ':' + colLetter + savingEndRow + ')';
    budgetSheet.getRange(currentRow, 5 + m).setFormula(formula).setFontWeight('bold').setBackground('#f8f9fa').setNumberFormat('[$Rp-421] #,##0');
  }
  currentRow += 2;
  
  // d. Section Investment
  var investStartRow = currentRow + 1;
  budgetSheet.getRange(currentRow, 2, 1, 3).merge()
             .setValue('📈 Investment Budget (Investasi & Saham)')
             .setFontWeight('bold');
  budgetSheet.getRange(currentRow, 2, 1, 15)
             .setBackground('#e3f2fd')
             .setFontColor('#1565c0');
  currentRow++;
  
  for (var i = 0; i < investCats.length; i++) {
    budgetSheet.getRange(currentRow, 2, 1, 3).merge().setValue(investCats[i].name);
    for (var m = 0; m < months.length; m++) {
      var yearMonthKey = '2026-' + months[m].key;
      var val = investCats[i].allocated;
      if (monthlyBudgets[yearMonthKey] && monthlyBudgets[yearMonthKey][investCats[i].name] !== undefined) {
        val = monthlyBudgets[yearMonthKey][investCats[i].name];
      }
      budgetSheet.getRange(currentRow, 5 + m).setValue(val).setNumberFormat('[$Rp-421] #,##0');
    }
    currentRow++;
  }
  var investEndRow = currentRow - 1;
  
  // Baris Total Investment
  var totalInvestRow = currentRow;
  budgetSheet.getRange(currentRow, 2, 1, 3).merge().setValue('Total Investment').setFontWeight('bold').setBackground('#f8f9fa');
  for (var m = 0; m < months.length; m++) {
    var colLetter = String.fromCharCode(69 + m);
    var formula = '=SUM(' + colLetter + investStartRow + ':' + colLetter + investEndRow + ')';
    budgetSheet.getRange(currentRow, 5 + m).setFormula(formula).setFontWeight('bold').setBackground('#f8f9fa').setNumberFormat('[$Rp-421] #,##0');
  }
  currentRow += 2;
  
  // e. Section Summary KPI Bawah
  // Investment as % of Income
  var totalInvestPercentRow = currentRow;
  budgetSheet.getRange(currentRow, 2, 1, 3).merge().setValue('Investment as % of Income').setFontWeight('bold').setBackground('#f8f9fa');
  for (var m = 0; m < months.length; m++) {
    var colLetter = String.fromCharCode(69 + m);
    var formula = '=IFERROR(' + colLetter + totalInvestRow + '/' + colLetter + totalIncomeRow + ', 0)';
    budgetSheet.getRange(currentRow, 5 + m).setFormula(formula).setFontWeight('bold').setBackground('#f8f9fa').setNumberFormat('0.0%');
  }
  currentRow++;
  
  // Grand Total
  var grandTotalRow = currentRow;
  budgetSheet.getRange(currentRow, 2, 1, 3).merge().setValue('Grand Total (All Expense/Save/Invest)').setFontWeight('bold').setBackground('#e9ecef');
  for (var m = 0; m < months.length; m++) {
    var colLetter = String.fromCharCode(69 + m);
    var formula = '=' + colLetter + totalExpensesRow + '+' + colLetter + totalSavingsRow + '+' + colLetter + totalInvestRow;
    budgetSheet.getRange(currentRow, 5 + m).setFormula(formula).setFontWeight('bold').setBackground('#e9ecef').setNumberFormat('[$Rp-421] #,##0');
  }
  
  // 7. Tulis Rumus Atas (Allocated & Left to allocate di baris 4 & 5)
  for (var m = 0; m < months.length; m++) {
    var colLetter = String.fromCharCode(69 + m);
    
    // Allocated: =IFERROR(GrandTotal / TotalIncome, 0)
    var allocatedFormula = '=IFERROR(' + colLetter + grandTotalRow + '/' + colLetter + totalIncomeRow + ', 0)';
    budgetSheet.getRange(4, 5 + m).setFormula(allocatedFormula).setNumberFormat('0.0%').setFontWeight('bold');
    
    // Left to allocate: =TotalIncome - GrandTotal
    var leftFormula = '=' + colLetter + totalIncomeRow + '-' + colLetter + grandTotalRow;
    budgetSheet.getRange(5, 5 + m).setFormula(leftFormula).setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  }
  
  // 8. Freeze & Format Lebar Kolom
  budgetSheet.setFrozenRows(5);
  budgetSheet.setFrozenColumns(4); // Bekukan kolom A s/d D
  
  budgetSheet.autoResizeColumn(2); // Kolom B (nama kategori)
  budgetSheet.setColumnWidth(1, 20); // Kolom A (padding)
  budgetSheet.setColumnWidth(3, 20); // Kolom C (padding)
  budgetSheet.setColumnWidth(4, 20); // Kolom D (padding)
  
  for (var m = 0; m < months.length; m++) {
    budgetSheet.setColumnWidth(5 + m, 110); // Lebar sama rata untuk bulan
  }
  

  
  Logger.log('Tab Budgeting berhasil dibuat dengan formula & visualisasi premium!');
  return 'Tab "Budgeting" tahunan dengan visualisasi premium berhasil dibuat langsung di Google Spreadsheet Anda!';
}

// ===================== SATU KALI SETUP & MIGRASI PENGINGAT =====================

/**
 * Menyisipkan kolom 'valuationReminder' dan 'lastValuationUpdate' ke tab Accounts dan AssetsNonLiquid jika belum ada.
 * Jalankan fungsi ini sekali saja melalui tombol "Run" di editor Google Apps Script.
 */
function migrateDatabaseForReminders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsToMigrate = ['Accounts', 'AssetsNonLiquid'];
  
  for (var k = 0; k < sheetsToMigrate.length; k++) {
    var sheetName = sheetsToMigrate[k];
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;
    
    var data = sheet.getDataRange().getValues();
    if (data.length === 0) continue;
    
    var headers = data[0].map(function(h) { return h.toString().trim(); });
    var targetHeaders = HEADERS[sheetName];
    
    // Cari header yang kurang
    var missingHeaders = [];
    for (var i = 0; i < targetHeaders.length; i++) {
      if (headers.indexOf(targetHeaders[i]) === -1) {
        missingHeaders.push(targetHeaders[i]);
      }
    }
    
    if (missingHeaders.length > 0) {
      // Tambahkan header yang kurang ke baris pertama
      var lastCol = sheet.getLastColumn();
      sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      
      // Jika ada baris data lama, isi nilai default
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        for (var m = 0; m < missingHeaders.length; m++) {
          var colNum = lastCol + 1 + m;
          var missingHeader = missingHeaders[m];
          var fillVal = '';
          
          if (missingHeader === 'valuationReminder') {
            fillVal = 'TRUE'; // default aktif
          } else if (missingHeader === 'lastValuationUpdate') {
            // Isi dengan tanggal hari ini atau default tanggal purchase/start
            fillVal = new Date().toISOString().split('T')[0];
          }
          
          var range = sheet.getRange(2, colNum, lastRow - 1, 1);
          var vals = [];
          for (var r = 2; r <= lastRow; r++) {
            vals.push([fillVal]);
          }
          range.setValues(vals);
        }
      }
      Logger.log('Tab "' + sheetName + '" berhasil di-migrasi. Menambahkan kolom: ' + missingHeaders.join(', '));
    } else {
      Logger.log('Tab "' + sheetName + '" sudah up-to-date.');
    }
  }
  return 'Migrasi Kolom Pengingat Selesai!';
}

/**
 * Menyisipkan kolom-kolom komprehensif baru ke tab Debts.
 * Jalankan fungsi ini sekali saja melalui tombol "Run" di editor Google Apps Script.
 */
function migrateDebtsColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Debts');
  if (!sheet) return 'Tab Debts tidak ditemukan';
  
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return 'Data kosong';
  
  var headers = data[0].map(function(h) { return h.toString().trim(); });
  var targetHeaders = HEADERS['Debts'];
  
  // Cari header yang kurang
  var missingHeaders = [];
  for (var i = 0; i < targetHeaders.length; i++) {
    if (headers.indexOf(targetHeaders[i]) === -1) {
      missingHeaders.push(targetHeaders[i]);
    }
  }
  
  if (missingHeaders.length > 0) {
    // Tambahkan header yang kurang ke baris pertama
    var lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    
    // Jika ada baris data lama, isi nilai default
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      for (var m = 0; m < missingHeaders.length; m++) {
        var colNum = lastCol + 1 + m;
        var missingHeader = missingHeaders[m];
        var fillVal = '';
        
        // Defaults:
        if (missingHeader === 'status') {
          fillVal = 'Aktif';
        } else if (missingHeader === 'originalAmount') {
          fillVal = '=INDIRECT("D"&ROW())'; // Assume originalAmount = balance for old rows to prevent division by zero
        } else if (missingHeader === 'interestType') {
          fillVal = 'Fixed/Flat';
        } else if (missingHeader === 'startDate' || missingHeader === 'endDate') {
          fillVal = new Date().toISOString().split('T')[0];
        } else if (missingHeader === 'dueDate') {
          fillVal = '1';
        }
        
        var range = sheet.getRange(2, colNum, lastRow - 1, 1);
        var vals = [];
        for (var r = 2; r <= lastRow; r++) {
          vals.push([fillVal]);
        }
        range.setValues(vals);
      }
    }
    Logger.log('Tab "Debts" berhasil di-migrasi. Menambahkan kolom: ' + missingHeaders.join(', '));
    return 'Migrasi Kolom Debts Selesai! ' + missingHeaders.join(', ');
  } else {
    Logger.log('Tab "Debts" sudah up-to-date.');
    return 'Tab Debts sudah up-to-date.';
  }
}

// ===================== FIXED INCOME MULTI-TABLE HANDLERS =====================

/** Membaca data secara modular dari 3 seksi di tab Fixed Income Investment */
function readFixedIncomeSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Fixed Income Investment');
  if (!sheet) return [];
  
  var result = [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 31) return [];
  
  var values = sheet.getRange(31, 1, lastRow - 30, 21).getValues();
  
  // Baca header seksi masing-masing
  var bondHeaders = sheet.getRange(30, 1, 1, 21).getValues()[0].map(function(h) { return h.toString().trim(); });
  var depHeaders = sheet.getRange(79, 1, 1, 19).getValues()[0].map(function(h) { return h.toString().trim(); });
  var p2pHeaders = sheet.getRange(119, 1, 1, 20).getValues()[0].map(function(h) { return h.toString().trim(); });
  
  for (var i = 0; i < values.length; i++) {
    var rowNum = i + 31;
    var rowVal = values[i];
    var id = rowVal[0];
    if (!id) continue; // Skip baris tanpa ID
    
    // Skip header rows or divider rows
    var idStr = String(id).trim().toLowerCase();
    if (idStr === 'id' || idStr === 'deposit type' || idStr === 'product name' || idStr === 'bond type') continue;
    
    var obj = {};
    var headers = bondHeaders;
    var subType = 'sbn';
    
    if (rowNum >= 80 && rowNum < 118) {
      headers = depHeaders;
      subType = 'deposito';
    } else if (rowNum >= 120) {
      headers = p2pHeaders;
      subType = 'p2p';
    }
    
    for (var j = 0; j < headers.length; j++) {
      if (headers[j]) {
        obj[headers[j]] = rowVal[j];
      }
    }
    
    // Normalisasi field kunci untuk sinkronisasi frontend
    obj.id = id;
    obj.subType = subType;
    obj.category = 'investasi';
    
    // Fallback pemetaan kolom dari template keuangan ke model frontend
    obj.title = getValueCaseInsensitive(obj, 'Seri') || getValueCaseInsensitive(obj, 'Bond Type') || getValueCaseInsensitive(obj, 'Title') || getValueCaseInsensitive(obj, 'Product Name') || getValueCaseInsensitive(obj, 'Bank') || 'Aset Pendapatan Tetap';
    obj.purchasePrice = Number(getValueCaseInsensitive(obj, 'Principal')) || 0;
    obj.currentValue = subType === 'sbn' && Number(getValueCaseInsensitive(obj, 'Accrued Interest')) === 0 && Number(getValueCaseInsensitive(obj, 'Period Passed')) >= 24 ? 0 : obj.purchasePrice; 
    obj.purchaseDate = getValueCaseInsensitive(obj, 'Issue Date') || '';
    obj.location = getValueCaseInsensitive(obj, 'Mitra Distribusi') || getValueCaseInsensitive(obj, 'Location') || getValueCaseInsensitive(obj, 'P2P Provider') || '';
    
    var rate = Number(String(getValueCaseInsensitive(obj, 'Interest Rate (%)') || '').replace('%', '').trim()) || Number(String(getValueCaseInsensitive(obj, 'Coupon Type') || '').replace('%', '').trim()) || 6.4;
    // Jika persentase dibaca sebagai fraksi desimal (misal 0.064 untuk 6.4%), kalikan dengan 100
    if (rate > 0 && rate < 1) {
      rate = rate * 100;
    }
    obj.interestRate = rate;
    
    obj.maturityDate = getValueCaseInsensitive(obj, 'Maturity Date') || '';
    obj.notes = getValueCaseInsensitive(obj, 'Notes') || '';
    obj.icon = getValueCaseInsensitive(obj, 'Icon') || (subType === 'sbn' ? 'account_balance' : subType === 'deposito' ? 'savings' : 'show_chart');
    
    result.push(obj);
  }
  return result;
}

/** Menyimpan data SBN/Deposito baru ke seksi tabel yang sesuai */
function appendFixedIncome(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Fixed Income Investment');
  if (!sheet) throw new Error('Tab "Fixed Income Investment" tidak ditemukan');
  
  var subType = data.subType || 'sbn';
  var startRow = 31;
  var endRow = 77;
  var headerRow = 30;
  var numCols = 21;
  
  if (subType === 'deposito') {
    startRow = 80;
    endRow = 117;
    headerRow = 79;
    numCols = 19;
  } else if (subType === 'p2p') {
    startRow = 120;
    endRow = 150;
    headerRow = 119;
    numCols = 20;
  }
  
  var headers = sheet.getRange(headerRow, 1, 1, numCols).getValues()[0].map(function(h) { return h.toString().trim(); });
  
  // Temukan baris kosong pertama di seksi
  var targetRow = -1;
  for (var r = startRow; r <= endRow; r++) {
    var idCell = sheet.getRange(r, 1).getValue();
    if (!idCell) {
      targetRow = r;
      break;
    }
  }
  
  if (targetRow === -1) {
    targetRow = endRow;
    sheet.insertRowAfter(endRow);
  }
  
  // Mapping data frontend ke kolom template
  var mappedData = {};
  mappedData.id = data.id || '';
  mappedData.ID = data.id || '';
  mappedData.Icon = data.icon || '';
  mappedData.Notes = data.notes || '';
  mappedData.Location = data.location || '';
  
  if (subType === 'sbn') {
    mappedData['Bond Type'] = data.bondType || data.fixedIncomeType || (data.title && data.title.includes('Sukuk') ? 'Sukuk Tabungan (ST)' : 'Obligasi Negara Ritel (ORI)');
    mappedData['Seri'] = data.title || '';
    mappedData['Issuer'] = data.issuer || 'SBSN Indonesia';
    mappedData['Tenor (Year)'] = data.tenor !== undefined ? data.tenor : 2;
    mappedData['Coupon Type'] = data.couponType || 'Floating with Floor';
    mappedData['Interest Rate (%)'] = (data.interestRate !== undefined ? data.interestRate : 6.4) / 100;
    mappedData['Tax'] = data.tax !== undefined ? data.tax : 0.10;
    mappedData['Principal'] = data.purchasePrice || 0;
    mappedData['Interest Payment Period'] = data.interestPaymentPeriod || 'Monthly';
    mappedData['Mitra Distribusi'] = data.location || 'Bibit';
    mappedData['Issue Date'] = cleanDateString(data.purchaseDate);
    mappedData['Maturity Date'] = cleanDateString(data.maturityDate);
    mappedData['Payment Date'] = data.paymentDate !== undefined ? data.paymentDate : 10;
  } else if (subType === 'deposito') {
    mappedData['Bank'] = data.title || '';
    mappedData['Deposit Type'] = data.depositType || data.fixedIncomeType || 'Deposito Berjangka';
    mappedData['Tenor'] = data.tenor !== undefined ? data.tenor : 12;
    mappedData['Satuan Tenor'] = data.tenorUnit || 'Months';
    mappedData['Interest Rate (%)'] = (data.interestRate !== undefined ? data.interestRate : 4.5) / 100;
    mappedData['Tax'] = data.tax !== undefined ? data.tax : 0.20;
    mappedData['Principal'] = data.purchasePrice || 0;
    mappedData['Interest Payment Period'] = data.interestPaymentPeriod || 'Monthly';
    mappedData['Issue Date'] = cleanDateString(data.purchaseDate);
    mappedData['Maturity Date'] = cleanDateString(data.maturityDate);
    mappedData['Payment Date'] = data.paymentDate !== undefined ? data.paymentDate : 10;
  } else {
    mappedData['P2P Provider'] = data.location || '';
    mappedData['Product Name'] = data.title || '';
    mappedData['Type'] = data.type || data.fixedIncomeType || 'Productive Loan';
    mappedData['Tenor'] = data.tenor !== undefined ? data.tenor : 12;
    mappedData['Satuan Tenor'] = data.tenorUnit || 'Months';
    mappedData['Interest Rate (%)'] = (data.interestRate !== undefined ? data.interestRate : 12) / 100;
    mappedData['Tax'] = data.tax !== undefined ? data.tax : 0.15;
    mappedData['Principal'] = data.purchasePrice || 0;
    mappedData['Interest Payment Period'] = data.interestPaymentPeriod || 'Monthly';
    mappedData['Issue Date'] = cleanDateString(data.purchaseDate);
    mappedData['Maturity Date'] = cleanDateString(data.maturityDate);
    mappedData['Payment Date'] = data.paymentDate !== undefined ? data.paymentDate : 10;
  }
  
  var rowValues = headers.map(function(h) {
    var val = mappedData[h] !== undefined ? mappedData[h] : getValueCaseInsensitive(data, h);
    return val !== undefined ? val : '';
  });
  
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
  
  // Tulis formula-formula dinamis template
  if (subType === 'sbn') {
    sheet.getRange(targetRow, 13).setFormula('=L' + targetRow + '*J' + targetRow + '*E' + targetRow + '*(1-K' + targetRow + ')'); // Expected Total Interest
    sheet.getRange(targetRow, 15).setFormula('=IF(N' + targetRow + '="Monthly"; (L' + targetRow + '*J' + targetRow + '/12)*(1-K' + targetRow + '); (L' + targetRow + '*J' + targetRow + '/2)*(1-K' + targetRow + '))'); // Interest per Period
    sheet.getRange(targetRow, 16).setFormula('=MIN(E' + targetRow + '*12; IFERROR(ROUND((TODAY()-G' + targetRow + ')/(365.25/12)); 0))'); // Period Passed
    sheet.getRange(targetRow, 17).setFormula('=O' + targetRow + '*P' + targetRow + ''); // Total Interest Received
    sheet.getRange(targetRow, 18).setFormula('=IF(P' + targetRow + '>=E' + targetRow + '*12; 0; O' + targetRow + ')'); // Accrued Interest
  } else if (subType === 'deposito') {
    sheet.getRange(targetRow, 12).setFormula('=K' + targetRow + '*I' + targetRow + '*(1-J' + targetRow + ')'); // Expected Total Interest
    sheet.getRange(targetRow, 14).setFormula('=(K' + targetRow + '*I' + targetRow + '/12)*(1-J' + targetRow + ')'); // Interest per Period
    sheet.getRange(targetRow, 15).setFormula('=MIN(D' + targetRow + '; IFERROR(ROUND((TODAY()-F' + targetRow + ')/(365.25/12)); 0))'); // Period Passed
    sheet.getRange(targetRow, 16).setFormula('=N' + targetRow + '*O' + targetRow + ''); // Total Interest Received
    sheet.getRange(targetRow, 17).setFormula('=IF(O' + targetRow + '>=D' + targetRow + '; 0; N' + targetRow + ')'); // Accrued Interest
  } else {
    sheet.getRange(targetRow, 12).setFormula('=K' + targetRow + '*I' + targetRow + '*(1-J' + targetRow + ')'); // Expected Total Interest
    sheet.getRange(targetRow, 14).setFormula('=(K' + targetRow + '*I' + targetRow + '/12)*(1-J' + targetRow + ')'); // Interest per Period
    sheet.getRange(targetRow, 15).setFormula('=MIN(D' + targetRow + '; IFERROR(ROUND((TODAY()-F' + targetRow + ')/(365.25/12)); 0))'); // Period Passed
    sheet.getRange(targetRow, 16).setFormula('=N' + targetRow + '*O' + targetRow + ''); // Total Interest Received
    sheet.getRange(targetRow, 17).setFormula('=IF(O' + targetRow + '>=D' + targetRow + '; 0; N' + targetRow + ')'); // Accrued Interest
  }
}

/** Memperbarui data SBN/Deposito secara modular */
function updateFixedIncome(id, data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Fixed Income Investment');
  if (!sheet) return false;
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 31) return false;
  
  var ids = sheet.getRange(31, 1, lastRow - 30, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      var targetRow = i + 31;
      var headerRow = 30;
      var numCols = 21;
      if (targetRow >= 80 && targetRow < 118) {
        headerRow = 79;
        numCols = 19;
      } else if (targetRow >= 120) {
        headerRow = 119;
        numCols = 20;
      }
      
      var headers = sheet.getRange(headerRow, 1, 1, numCols).getValues()[0].map(function(h) { return h.toString().trim(); });
      var currentRowValues = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
      
      // Mapping updates
      var mappedData = {};
      if (data.title !== undefined) {
        if (targetRow < 80) mappedData['Seri'] = data.title;
        else if (targetRow < 118) mappedData['Bank'] = data.title;
        else mappedData['Product Name'] = data.title;
      }
      if (data.purchasePrice !== undefined) mappedData['Principal'] = data.purchasePrice;
      if (data.purchaseDate !== undefined) mappedData['Issue Date'] = cleanDateString(data.purchaseDate);
      if (data.location !== undefined) {
        if (targetRow < 80) mappedData['Mitra Distribusi'] = data.location;
        else if (targetRow >= 120) mappedData['P2P Provider'] = data.location;
        else mappedData['Location'] = data.location;
      }
      if (data.interestRate !== undefined) mappedData['Interest Rate (%)'] = data.interestRate / 100;
      if (data.maturityDate !== undefined) mappedData['Maturity Date'] = cleanDateString(data.maturityDate);
      if (data.notes !== undefined) mappedData['Notes'] = data.notes;
      if (data.icon !== undefined) mappedData['Icon'] = data.icon;
      
      var rowValues = headers.map(function(h, idx) {
        if (h === 'id' || h === 'ID') return id;
        var val = mappedData[h] !== undefined ? mappedData[h] : getValueCaseInsensitive(data, h);
        return val !== undefined ? val : currentRowValues[idx];
      });
      
      sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
      return true;
    }
  }
  return false;
}

/** Menghapus data SBN/Deposito secara modular dengan mengosongkan sel baris agar tidak merusak baris */
function deleteFixedIncome(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Fixed Income Investment');
  if (!sheet) return false;
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 31) return false;
  
  var ids = sheet.getRange(31, 1, lastRow - 30, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      var targetRow = i + 31;
      var numCols = sheet.getLastColumn();
      sheet.getRange(targetRow, 1, 1, numCols).clearContent();
      return true;
    }
  }
  return false;
}

// ===================== PROGRAMMATIC SETUP FOR FIXED INCOME DASHBOARD =====================

/**
 * Membentuk visualisasi dashboard & tabel modular premium untuk tab Fixed Income Investment.
 * Menyelamatkan data ST012 lama Anda dan menuliskannya kembali ke baris tabel baru.
 * Jalankan fungsi ini sekali saja melalui tombol "Run" di editor Google Apps Script.
 */
function setupFixedIncomeDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Fixed Income Investment');
  if (!sheet) {
    sheet = ss.insertSheet('Fixed Income Investment');
  }
  
  // 1. BACKUP DATA LAMA
  var backupData = [];
  try {
    var rawValues = sheet.getDataRange().getValues();
    if (rawValues.length > 1) {
      var headers = rawValues[0];
      for (var r = 1; r < rawValues.length; r++) {
        var row = rawValues[r];
        if (row[0] && row[0] !== 'id' && row[0] !== 'ID') {
          var obj = {};
          for (var c = 0; c < headers.length; c++) {
            obj[headers[c]] = row[c];
          }
          backupData.push(obj);
        }
      }
    }
  } catch (e) {
    Logger.log('Tidak ada data lama untuk di-backup: ' + e.message);
  }
  
  // 2. CLEAR SHEET & SET THEME
  sheet.clear();
  
  // a. Lebar kolom padding A, C, D
  sheet.setColumnWidth(1, 25); // Padding ID
  sheet.setColumnWidth(3, 20); // Spacer
  sheet.setColumnWidth(4, 20); // Spacer
  
  // b. Judul Banner Utama (A1:T1)
  sheet.getRange('A1:T1').merge()
       .setValue('Fixed Income Investment')
       .setBackground('#1e293b')
       .setFontColor('#ffffff')
       .setFontWeight('bold')
       .setFontSize(16)
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 45);
  
  // 3. KPI CARD KIRI (A3:D10)
  sheet.getRange('B3:D3').merge().setValue('Interest Received').setFontWeight('bold').setFontColor('#475569').setFontSize(10).setHorizontalAlignment('left');
  sheet.getRange('B4:D7').merge().setFormula('=SUM(Q31:Q77)+SUM(P80:P117)+SUM(Q120:Q150)')
       .setFontWeight('bold').setFontColor('#0f5132').setFontSize(28).setHorizontalAlignment('left').setVerticalAlignment('middle').setNumberFormat('[$Rp-421] #,##0');
  
  sheet.getRange('B8').setValue('Principal:').setFontWeight('bold').setFontColor('#475569');
  sheet.getRange('C8:D8').merge().setFormula('=SUM(L31:L77)+SUM(K80:K117)+SUM(L120:L150)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  
  sheet.getRange('B9').setValue('Expected Int:').setFontWeight('bold').setFontColor('#475569');
  sheet.getRange('C9:D9').merge().setFormula('=SUM(M31:M77)+SUM(L80:L117)+SUM(M120:M150)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  
  sheet.getRange('B10').setValue('Accrued Int:').setFontWeight('bold').setFontColor('#475569');
  sheet.getRange('C10:D10').merge().setFormula('=SUM(R31:R77)+SUM(Q80:Q117)+SUM(R120:R150)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  
  // Format border luar KPI Card
  sheet.getRange('B3:D10').setBorder(true, true, true, true, null, null, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  
  // 4. SUMMARY TABLE TENGAH (F3:K23)
  var summaryHeaders = ['Fixed Income Investment', 'Principal', 'Expected Total Interest', 'Total Interest Received', 'Accrued Interest'];
  sheet.getRange(3, 6, 1, 5).setValues([summaryHeaders]).setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  
  // Baris Utama
  sheet.getRange('F4').setValue('Bonds').setFontWeight('bold');
  sheet.getRange('G4').setFormula('=SUM(L31:L77)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('H4').setFormula('=SUM(M31:M77)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('I4').setFormula('=SUM(Q31:Q77)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('J4').setFormula('=SUM(R31:R77)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('F4:J4').setBackground('#f1f5f9');
  
  // Sub-detail Bonds
  var bondsSubs = ['Obligasi FR', 'FR Syariah', 'Obligasi Negara Ritel (ORI)', 'Saving Bond Ritel (SBR)', 'Sukuk Ritel (SR)', 'Sukuk Tabungan (ST)'];
  for (var i = 0; i < bondsSubs.length; i++) {
    var r = 5 + i;
    sheet.getRange(r, 6).setValue('  • ' + bondsSubs[i]);
    sheet.getRange(r, 7).setFormula('=SUMIF(B31:B77; "' + bondsSubs[i] + '"; L31:L77)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 8).setFormula('=SUMIF(B31:B77; "' + bondsSubs[i] + '"; M31:M77)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 9).setFormula('=SUMIF(B31:B77; "' + bondsSubs[i] + '"; Q31:Q77)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 10).setFormula('=SUMIF(B31:B77; "' + bondsSubs[i] + '"; R31:R77)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 6, 1, 5).setFontColor('#475569');
  }
  
  sheet.getRange('F11').setValue('Time Deposit').setFontWeight('bold');
  sheet.getRange('G11').setFormula('=SUM(K80:K117)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('H11').setFormula('=SUM(L80:L117)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('I11').setFormula('=SUM(P80:P117)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('J11').setFormula('=SUM(Q80:Q117)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('F11:J11').setBackground('#f1f5f9');
  
  // Sub-detail Deposito
  var depSubs = ['Deposito Berjangka', 'Sertifikat Deposito', 'Deposit on Call (DOC)'];
  for (var i = 0; i < depSubs.length; i++) {
    var r = 12 + i;
    sheet.getRange(r, 6).setValue('  • ' + depSubs[i]);
    sheet.getRange(r, 7).setFormula('=SUMIF(C80:C117; "' + depSubs[i] + '"; K80:K117)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 8).setFormula('=SUMIF(C80:C117; "' + depSubs[i] + '"; L80:L117)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 9).setFormula('=SUMIF(C80:C117; "' + depSubs[i] + '"; P80:P117)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 10).setFormula('=SUMIF(C80:C117; "' + depSubs[i] + '"; Q80:Q117)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 6, 1, 5).setFontColor('#475569');
  }
  
  sheet.getRange('F15').setValue('P2P Lending').setFontWeight('bold');
  sheet.getRange('G15').setFormula('=SUM(L120:L150)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('H15').setFormula('=SUM(M120:M150)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('I15').setFormula('=SUM(Q120:Q150)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('J15').setFormula('=SUM(R120:R150)').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('F15:J15').setBackground('#f1f5f9');
  
  // Sub-detail P2P
  var p2pSubs = ['Consumer Loan', 'Productive Loan'];
  for (var i = 0; i < p2pSubs.length; i++) {
    var r = 16 + i;
    sheet.getRange(r, 6).setValue('  • ' + p2pSubs[i]);
    sheet.getRange(r, 7).setFormula('=SUMIF(D120:D150; "' + p2pSubs[i] + '"; L120:L150)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 8).setFormula('=SUMIF(D120:D150; "' + p2pSubs[i] + '"; M120:M150)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 9).setFormula('=SUMIF(D120:D150; "' + p2pSubs[i] + '"; Q120:Q150)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 10).setFormula('=SUMIF(D120:D150; "' + p2pSubs[i] + '"; R120:R150)').setNumberFormat('[$Rp-421] #,##0');
    sheet.getRange(r, 6, 1, 5).setFontColor('#475569');
  }
  
  // Total Grand Summary Row
  sheet.getRange('F18').setValue('Total Fixed Income').setFontWeight('bold');
  sheet.getRange('G18').setFormula('=G4+G11+G15').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('H18').setFormula('=H4+H11+H15').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('I18').setFormula('=I4+I11+I15').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('J18').setFormula('=J4+J11+J15').setNumberFormat('[$Rp-421] #,##0').setFontWeight('bold');
  sheet.getRange('F18:J18').setBackground('#e2e8f0');
  
  sheet.getRange('F3:J18').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  
  // 5. SEKSI OBLIGASI/BONDS (Row 28 s/d 77)
  sheet.getRange('B28:U28').merge().setValue('Bonds Holdings').setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11).setVerticalAlignment('middle');
  sheet.setRowHeight(28, 25);
  sheet.getRange('A30:U30').clearContent();
  sheet.getRange('A30:U30').setValues([['ID', 'Bond Type', 'Seri', 'Issuer', 'Tenor (Year)', 'Maturity Date', 'Issue Date', 'Payment Date', 'Coupon Type', 'Interest Rate (%)', 'Tax', 'Principal', 'Expected Total Interest', 'Interest Payment Period', 'Interest per Period (After Tax)', 'Period Passed', 'Total Interest Received', 'Accrued Interest', 'Mitra Distribusi', 'Icon', 'Notes']]);
  sheet.getRange('A30:U30').setBackground('#475569').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  
  // 6. SEKSI DEPOSITO (Row 78 s/d 117)
  sheet.getRange('B78:S78').merge().setValue('Time Deposit Holdings').setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11).setVerticalAlignment('middle');
  sheet.setRowHeight(78, 25);
  sheet.getRange('A79:S79').setValues([['ID', 'Bank', 'Deposit Type', 'Tenor', 'Satuan Tenor', 'Issue Date', 'Maturity Date', 'Payment Date', 'Interest Rate (%)', 'Tax', 'Principal', 'Expected Total Interest', 'Interest Payment Period', 'Interest per Period (After Tax)', 'Period Passed', 'Total Interest Received', 'Accrued Interest', 'Icon', 'Notes']]);
  sheet.getRange('A79:S79').setBackground('#475569').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  
  // 7. SEKSI P2P LENDING (Row 118 s/d 150)
  sheet.getRange('B118:T118').merge().setValue('P2P Lending Holdings').setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11).setVerticalAlignment('middle');
  sheet.setRowHeight(118, 25);
  sheet.getRange('A119:T119').setValues([['ID', 'P2P Provider', 'Product Name', 'Type', 'Tenor', 'Satuan Tenor', 'Issue Date', 'Maturity Date', 'Payment Date', 'Interest Rate (%)', 'Tax', 'Principal', 'Expected Total Interest', 'Interest Payment Period', 'Interest per Period (After Tax)', 'Period Passed', 'Total Interest Received', 'Accrued Interest', 'Icon', 'Notes']]);
  sheet.getRange('A119:T119').setBackground('#475569').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  
  // Format Lebar Kolom data
  sheet.setColumnWidth(2, 160); // Seri / Bank / P2P Provider
  sheet.setColumnWidth(5, 75);  // Tenor
  sheet.setColumnWidth(6, 95);  // Maturity Date
  sheet.setColumnWidth(7, 95);  // Issue Date
  sheet.setColumnWidth(10, 85); // Interest Rate
  sheet.setColumnWidth(12, 110); // Principal
  sheet.setColumnWidth(13, 110); // Expected Total Interest
  sheet.setColumnWidth(15, 110); // Interest per Period
  sheet.setColumnWidth(17, 110); // Total Interest Received
  sheet.setColumnWidth(18, 110); // Accrued Interest
  
  // 8. TULIS KEMBALI BACKUP DATA LAMA KE TABEL BARU
  var restoredCount = 0;
  for (var k = 0; k < backupData.length; k++) {
    var data = backupData[k];
    var subType = data.subType || 'sbn';
    var title = data.title || '';
    if (title.toLowerCase().includes('deposito') || title.toLowerCase().includes('deposit') || title.toLowerCase().includes('bank') || data.category === 'deposito') {
      subType = 'deposito';
    } else if (title.toLowerCase().includes('st012') || title.toLowerCase().includes('sukuk') || title.toLowerCase().includes('sbn')) {
      subType = 'sbn';
    }
    
    // Normalisasi detail untuk ST012
    var finalData = {
      id: data.id || 'ast_st012',
      subType: subType,
      title: title,
      purchasePrice: Number(data.purchasePrice) || 100000000,
      interestRate: Number(data.interestRate) || 6.4,
      purchaseDate: data.purchaseDate ? data.purchaseDate.split('T')[0] : '2024-05-10',
      maturityDate: data.maturityDate ? data.maturityDate.split('T')[0] : '2026-05-10',
      location: data.location || 'Bibit',
      notes: data.notes || 'Telah dicairkan ke Tabungan BCA',
      icon: data.icon || 'account_balance'
    };
    
    appendFixedIncome(finalData);
    restoredCount++;
  }
  
  // Jika tidak ada backup, buatkan satu ST012 default agar user langsung melihat contoh nyata
  if (restoredCount === 0) {
    var defaultST012 = {
      id: 'ast_st012',
      subType: 'sbn',
      title: 'Sukuk Tabungan ST012-T2',
      purchasePrice: 100000000,
      interestRate: 6.4,
      purchaseDate: '2024-05-10',
      maturityDate: '2026-05-10',
      location: 'Bibit',
      notes: 'Telah dicairkan ke Tabungan BCA',
      icon: 'account_balance'
    };
    appendFixedIncome(defaultST012);
  }
  
  // Set Frozen Row untuk mempermudah scroll di Bonds Holdings
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(0);
  
  Logger.log('Tab Fixed Income Investment berhasil dibentuk persis dengan template Marcel!');
  return 'Tab "Fixed Income Investment" berhasil dikonfigurasi menjadi dashboard modular premium dengan format Bonds, Time Deposit, dan P2P Lending secara otomatis!';
}



