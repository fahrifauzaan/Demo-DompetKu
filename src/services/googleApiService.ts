const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// Header columns mapping (must match the spreadsheet exactly)
const HEADERS: Record<string, string[]> = {
  'Transactions': ['id', 'date', 'desc', 'location', 'amount', 'category', 'icon', 'status', 'account', 'type'],
  'Accounts': ['id', 'name', 'type', 'balance', 'currency', 'icon', 'startDate', 'valuationReminder', 'lastValuationUpdate'],
  'Fixed Income Investment': ['id', 'title', 'category', 'purchasePrice', 'currentValue', 'purchaseDate', 'location', 'icon', 'equity', 'notes', 'ticker', 'shares', 'avgCost', 'interestRate', 'maturityDate', 'subType'],
  'BudgetCategories': ['id', 'name', 'icon', 'color', 'type', 'allocated', 'includeInTotal', 'alertAt'],
  'Debts': ['id', 'name', 'type', 'balance', 'interestRate', 'minPayment', 'icon', 'originalAmount', 'interestType', 'startDate', 'endDate', 'dueDate', 'lender', 'status'],
  'Settings': ['key', 'value'],
  'AssetsNonLiquid': ['id', 'title', 'category', 'subType', 'purchasePrice', 'currentValue', 'purchaseDate', 'location', 'icon', 'notes', 'specification', 'landArea', 'buildingArea', 'mfgYear', 'usefulLife', 'depreciationMethod', 'valuationReminder', 'lastValuationUpdate'],
  'Saham': ['ID', 'Title', 'Ticker', 'Shares', 'Avg. Cost', 'Current Price', 'Purchase Date', 'Location', 'Icon', 'Notes'],
  'Crypto': ['ID', 'Title', 'Ticker', 'Coins', 'Avg. Cost', 'Current Price', 'Purchase Date', 'Location', 'Icon', 'Notes'],
  'Reksadana': ['ID', 'Title', 'Units', 'Nav Per Unit', 'Current_NAV', 'Purchase Date', 'Location', 'Icon', 'Notes'],
  // Entitas berikut sebelumnya hanya lewat macro fallback (bisa nyasar ke sheet demo untuk user OAuth).
  // Kolom PERSIS sama dengan google-apps-script.js agar API & macro konsisten membaca/menulis sheet yang sama.
  'Goals': ['id', 'name', 'icon', 'color', 'goalType', 'targetAmount', 'targetDate', 'startDate', 'initialAmount', 'expectedReturn', 'monthlyContribution', 'priority', 'status', 'notes'],
  'Recurring': ['id', 'name', 'type', 'amount', 'category', 'account', 'frequency', 'dayOfMonth', 'startDate', 'endDate', 'lastPostedDate', 'autoPost', 'notes'],
  'Insurance': ['id', 'name', 'insType', 'provider', 'policyNumber', 'premium', 'premiumFrequency', 'coverageAmount', 'startDate', 'renewalDate', 'insured', 'beneficiary', 'status', 'notes'],
  'Retirement': ['id', 'name', 'progType', 'provider', 'currentBalance', 'monthlyContribution', 'contributionType', 'employerContribution', 'startDate', 'targetAge', 'expectedReturn', 'status', 'notes']
};

/** Apakah sheet ini didukung jalur API/OAuth langsung (ke spreadsheet user). */
export function isApiSheet(sheetName: string): boolean {
  return Object.prototype.hasOwnProperty.call(HEADERS, sheetName);
}

/** Deteksi error "tab belum ada" dari Google Sheets API (biar bisa auto-create lalu retry). */
function isMissingSheetError(status: number, text: string): boolean {
  return status === 400 && /unable to parse range|not found/i.test(text);
}

/**
 * Buat tab (dengan baris header) bila belum ada. Idempotent: "already exists" diabaikan.
 * Dipakai agar penulisan tak pernah gagal-diam hanya karena tab-nya belum dibuat di spreadsheet user.
 */
async function ensureSheetWithHeader(accessToken: string, spreadsheetId: string, sheetName: string, headers: string[]) {
  const addResp = await fetch(`${SHEETS_API_URL}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
  });
  if (!addResp.ok) {
    const t = await addResp.text();
    if (/already exists/i.test(t)) return; // tab sudah ada (dengan header-nya) — jangan timpa
    throw new Error(`Gagal membuat tab ${sheetName} (HTTP ${addResp.status}).`);
  }
  // Tab baru dibuat → tulis baris header sekali.
  await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [headers] }),
  });
}

/**
 * Copies the template spreadsheet to the user's Google Drive.
 */
export async function copyTemplateSpreadsheet(accessToken: string, templateId: string): Promise<string> {
  const response = await fetch(`${DRIVE_API_URL}/${templateId}/copy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'DompetKu Database',
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Copy Spreadsheet Error:', errorData);
    throw new Error('Gagal menyalin template database ke Google Drive Anda.');
  }

  const data = await response.json();
  return data.id; // The new Spreadsheet ID
}

/**
 * Finds the spreadsheet created by the app in the user's Google Drive.
 * Requires drive.file scope.
 */
export async function findAppSpreadsheet(accessToken: string, customFileName?: string): Promise<string | null> {
  const fileName = customFileName || 'DompetKu Database';
  const response = await fetch(`${DRIVE_API_URL}?q=name='${fileName}' and trashed=false&spaces=drive`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) return null;
  const data = await response.json();
  if (data.files && data.files.length > 0) {
    // Return the most recently created or just the first one
    return data.files[0].id;
  }
  return null;
}

/**
 * Helper to get values case-insensitively, similar to the Apps Script.
 */
function getValueCaseInsensitive(data: any, header: string): any {
  if (!data) return undefined;
  if (data[header] !== undefined) return data[header];

  const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, string[]> = {
    'id': ['id', 'key'],
    'title': ['title', 'name'],
    'ticker': ['ticker', 'symbol'],
    'shares': ['shares', 'qty', 'quantity', 'units', 'coins'],
    'coins': ['shares', 'qty', 'quantity', 'units', 'coins'],
    'units': ['shares', 'qty', 'quantity', 'units', 'coins'],
    'avgcost': ['avgcost', 'avg_cost', 'navperunit'],
    'navperunit': ['avgcost', 'avg_cost', 'navperunit'],
    'currentprice': ['currentprice', 'current_price', 'currentnav', 'current_nav', 'nav'],
    'currentnav': ['currentprice', 'current_price', 'currentnav', 'current_nav', 'nav'],
    'purchasedate': ['purchasedate', 'purchase_date', 'date'],
    'location': ['location', 'broker', 'platform'],
    'icon': ['icon'],
    'notes': ['notes', 'keterangan']
  };

  const keys = Object.keys(data);
  for (const key of keys) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanKey === cleanHeader) return data[key];
    if (aliases[cleanHeader] && aliases[cleanHeader].includes(cleanKey)) {
      return data[key];
    }
  }
  return undefined;
}

/**
 * Appends a new row to a specific sheet.
 */
export async function addRowToSheet(accessToken: string, spreadsheetId: string, sheetName: string, data: any) {
  const headers = HEADERS[sheetName];
  if (!headers) throw new Error(`Sheet ${sheetName} not found in headers mapping.`);

  const rowData = headers.map(h => {
    const val = getValueCaseInsensitive(data, h);
    return val !== undefined ? val : '';
  });

  const doAppend = () => fetch(`${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowData] })
  });

  let response = await doAppend();
  if (!response.ok) {
    const errText = await response.text();
    // Tab belum ada di spreadsheet user → buat tab + header, lalu ulang append sekali.
    if (isMissingSheetError(response.status, errText)) {
      await ensureSheetWithHeader(accessToken, spreadsheetId, sheetName, headers);
      response = await doAppend();
    }
    if (!response.ok) {
      const finalErr = await response.text().catch(() => errText);
      console.error('Add Row Error:', finalErr);
      // THROW agar kegagalan tampil (saveError), bukan hilang diam-diam lalu data lenyap saat sinkron.
      throw new Error(`Gagal menyimpan ke ${sheetName} (HTTP ${response.status}).`);
    }
  }
}

/**
 * Appends MANY rows to a sheet in a SINGLE API call.
 * Bulk imports must use this instead of looping addRowToSheet — one call avoids
 * the per-user write-quota (rate limit) that silently drops rows, and is atomic
 * (all rows land, or the call throws and none do).
 * Throws on non-OK so the caller can surface a real error instead of a false success.
 */
export async function appendRowsToSheet(accessToken: string, spreadsheetId: string, sheetName: string, dataArray: any[]) {
  const headers = HEADERS[sheetName];
  if (!headers) throw new Error(`Sheet ${sheetName} not found in headers mapping.`);
  if (!dataArray.length) return;

  const values = dataArray.map(data =>
    headers.map(h => {
      const val = getValueCaseInsensitive(data, h);
      return val !== undefined ? val : '';
    })
  );

  const doAppend = () => fetch(`${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });

  let response = await doAppend();
  if (!response.ok) {
    const errText = await response.text();
    if (isMissingSheetError(response.status, errText)) {
      await ensureSheetWithHeader(accessToken, spreadsheetId, sheetName, headers);
      response = await doAppend();
    }
    if (!response.ok) {
      const finalErr = await response.text().catch(() => errText);
      console.error('Append Rows Error:', finalErr);
      throw new Error(`Gagal menyimpan ${dataArray.length} baris ke ${sheetName} (HTTP ${response.status}).`);
    }
  }
}

/**
 * Updates an existing row in a specific sheet by ID.
 * Warning: This requires reading the sheet first to find the row index.
 */
export async function updateRowInSheet(accessToken: string, spreadsheetId: string, sheetName: string, data: any) {
  const headers = HEADERS[sheetName];
  if (!headers) throw new Error(`Sheet ${sheetName} not found in headers mapping.`);

  const idToFind = String(data.id || data.key);

  // 1. Read the sheet to find the row
  const getResponse = await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values/${sheetName}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!getResponse.ok) return;
  const sheetData = await getResponse.json();
  const rows = sheetData.values || [];
  
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === idToFind) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    console.warn(`Row with id ${idToFind} not found in ${sheetName}`);
    return;
  }

  // 2. Prepare updated row data
  const existingRow = rows[rowIndex];
  const rowData = headers.map((h, colIndex) => {
    const val = getValueCaseInsensitive(data, h);
    return val !== undefined ? val : (existingRow[colIndex] !== undefined ? existingRow[colIndex] : '');
  });

  // 3. Update the specific row
  // Range is A:Z roughly. rowIndex is 0-indexed in array, but Sheets API rows are 1-indexed.
  // So array index 1 is Row 2.
  const sheetRowNumber = rowIndex + 1;
  const updateRange = `${sheetName}!A${sheetRowNumber}`;

  const updateResponse = await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowData]
    })
  });

  if (!updateResponse.ok) {
    console.error('Update Row Error:', await updateResponse.text());
  }
}

/**
 * Deletes a row by ID.
 * Google Sheets API doesn't have a direct "delete row" via values endpoint.
 * We must use batchUpdate with DeleteDimensionRequest.
 */
export async function deleteRowFromSheet(accessToken: string, spreadsheetId: string, sheetName: string, idToDelete: string) {
  // First, we need the sheetId (numeric ID) of the sheetName.
  const getMetaResponse = await fetch(`${SHEETS_API_URL}/${spreadsheetId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!getMetaResponse.ok) return;
  const metaData = await getMetaResponse.json();
  const sheet = metaData.sheets.find((s: any) => s.properties.title === sheetName);
  if (!sheet) return;
  const numericSheetId = sheet.properties.sheetId;

  // Next, find the row index
  const getResponse = await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values/${sheetName}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!getResponse.ok) return;
  const sheetData = await getResponse.json();
  const rows = sheetData.values || [];
  
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(idToDelete)) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) return; // Not found

  // Send batchUpdate to delete the row dimension
  const batchUpdateResponse = await fetch(`${SHEETS_API_URL}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: numericSheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }
      ]
    })
  });

  if (!batchUpdateResponse.ok) {
    console.error('Delete Row Error:', await batchUpdateResponse.text());
  }
}

/**
 * Fetches all sheets and formats them like the old Apps Script `?sheet=all` macro.
 */
export async function fetchAllDataFromSheets(accessToken: string, spreadsheetId: string) {
  // 1. Fetch metadata first to see which sheet tabs exist
  const metaResponse = await fetch(`${SHEETS_API_URL}/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!metaResponse.ok) {
    if (metaResponse.status === 401 || metaResponse.status === 403) {
      throw new Error(`Google Auth Error (${metaResponse.status}): Sesi Google Anda telah berakhir atau Anda tidak memiliki izin akses ke Spreadsheet ini.`);
    }
    const errText = await metaResponse.text().catch(() => '');
    throw new Error(`Gagal mengakses spreadsheet Anda (Status: ${metaResponse.status}). Pastikan ID Spreadsheet benar dan Anda memiliki izin akses. Detail: ${errText.substring(0, 100)}`);
  }
  
  const metaData = await metaResponse.json();
  const existingSheetNames = (metaData.sheets || []).map((s: any) => s.properties.title);

  // 2. Filter our HEADERS keys to only include those that actually exist in the spreadsheet
  const sheetNames = Object.keys(HEADERS).filter(name => existingSheetNames.includes(name));
  
  if (sheetNames.length === 0) {
    return { success: true, data: {} };
  }

  const rangesQuery = sheetNames.map(name => `ranges=${encodeURIComponent(name)}`).join('&');
  
  const response = await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values:batchGet?${rangesQuery}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('BatchGet Error:', errorText);
    throw new Error('Gagal mengambil data dari tab spreadsheet: ' + errorText);
  }

  const data = await response.json();
  
  // Format the response to match what useFinanceStore expects:
  // { success: true, data: { Transactions: [ { id: ... } ], ... } }
  const result: Record<string, any[]> = {};

  if (data.valueRanges) {
    data.valueRanges.forEach((rangeObj: any) => {
      // The range usually looks like "'Transactions'!A1:Z1000" or just "Transactions"
      // Extract the sheet name
      const rangeName = rangeObj.range;
      let sheetNameMatched = '';
      for (const name of sheetNames) {
        if (rangeName.includes(name)) {
          sheetNameMatched = name;
          break;
        }
      }

      if (!sheetNameMatched) return;

      const rows = rangeObj.values || [];
      if (rows.length <= 1) {
        result[sheetNameMatched] = [];
        return;
      }

      const headers = rows[0];
      const parsedRows = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[0] && row[0] !== 0) continue; // Skip empty rows (no ID)
        
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = row[j];
        }
        parsedRows.push(obj);
      }
      
      result[sheetNameMatched] = parsedRows;
    });
  }

  return { success: true, data: result };
}
