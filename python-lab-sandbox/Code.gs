/**
 * GLM Python Lab — domain-restricted Apps Script backend.
 * Deploy as USER_DEPLOYING from an @glm.edu.co Workspace account, with
 * access set to DOMAIN. Every public RPC re-checks Session.getActiveUser().
 * Students never need direct access to the results spreadsheet.
 */
const CONFIG = {
  SPREADSHEET_ID: '', // Set this to an existing results Sheet ID if desired.
  RESULTS_SHEET_NAME: 'Python Lab Results',
  ALLOWED_DOMAIN: '@glm.edu.co'
};

const RESULTS_HEADERS = [
  'Timestamp ISO', 'Saved At', 'Student Name', 'Student Email',
  'Exercise ID', 'Level', 'Topic', 'Exercise Title', 'Engine',
  'Status', 'Score', 'Passed', 'Feedback', 'Reflection / Teacher Note',
  'Test Inputs', 'Expected Checks', 'Output', 'Code',
  'Attempt Number', 'Submitted By'
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('GLM Python Lab · Sandbox')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function getCurrentStudent() {
  try {
    return { ok: true, email: currentStudentEmail_() };
  } catch (error) {
    return { ok: false, message: error.message || String(error) };
  }
}

function submitStudentProgress(payload) {
  try {
    const email = currentStudentEmail_();
    const clean = validatePayload_(payload, email);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sheet = resultsSheet_(spreadsheet_());
      const attemptNumber = nextAttempt_(sheet, email, clean.exerciseId);
      const now = new Date();
      const savedAt = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow([
        now.toISOString(), savedAt, safeText_(clean.studentName), email,
        clean.exerciseId, safeText_(clean.level), safeText_(clean.topic),
        safeText_(clean.title), clean.engine, clean.status, clean.score,
        clean.passed, safeText_(clean.feedback), safeText_(clean.reflection),
        '', '', safeText_(clean.output), safeText_(clean.code),
        attemptNumber, email
      ]);
      return { ok: true, savedAt: savedAt, attemptNumber: attemptNumber };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return { ok: false, message: error.message || String(error) };
  }
}

function getStudentProgress() {
  try {
    const email = currentStudentEmail_();
    const sheet = resultsSheet_(spreadsheet_());
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: true, progress: [] };

    const rows = sheet.getRange(2, 1, lastRow - 1, RESULTS_HEADERS.length).getValues();
    const latest = {};
    rows.forEach(function (row) {
      if (String(row[3] || '').trim().toLowerCase() !== email) return;
      const exerciseId = String(row[4] || '').trim();
      if (!exerciseId) return;
      latest[exerciseId] = {
        exerciseId: exerciseId,
        studentName: String(row[2] || ''),
        studentEmail: email,
        level: String(row[5] || ''),
        topic: String(row[6] || ''),
        title: String(row[7] || ''),
        engine: String(row[8] || ''),
        status: String(row[9] || ''),
        score: Number(row[10] || 0),
        passed: row[11] === true || String(row[11]).toLowerCase() === 'true',
        feedback: String(row[12] || ''),
        reflection: restoreText_(row[13]),
        output: restoreText_(row[16]),
        code: restoreText_(row[17]),
        attemptNumber: Number(row[18] || 0),
        savedAt: row[1] instanceof Date
          ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
          : String(row[1] || '')
      };
    });
    return { ok: true, progress: Object.keys(latest).map(function (id) { return latest[id]; }) };
  } catch (error) {
    return { ok: false, message: error.message || String(error), progress: [] };
  }
}

// Run from the script editor as the school account to create/check the Sheet.
// The trailing underscore prevents calls through google.script.run.
function setupTeacherSheet_() {
  const sheet = resultsSheet_(spreadsheet_());
  return { spreadsheetUrl: sheet.getParent().getUrl(), sheetName: sheet.getName() };
}

function currentStudentEmail_() {
  const owner = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  if (!isSchoolEmail_(owner)) {
    throw new Error('The web app must be deployed by an @glm.edu.co Workspace account.');
  }
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!isSchoolEmail_(email)) {
    throw new Error('Your GLM identity is unavailable. Open the school web app with your @glm.edu.co account. Progress was not saved.');
  }
  return email;
}

function isSchoolEmail_(email) {
  return /^[^\s@]+@glm\.edu\.co$/i.test(String(email || '').trim());
}

function validatePayload_(payload, email) {
  if (!payload || typeof payload !== 'object') throw new Error('No progress data received.');
  const value = function (key, max) {
    const text = String(payload[key] == null ? '' : payload[key]);
    if (text.length > max) throw new Error(key + ' is too long.');
    return text;
  };
  const clean = {
    studentName: value('studentName', 120).trim(),
    studentEmail: email, // Ignore any address supplied by the browser.
    exerciseId: value('exerciseId', 40),
    level: value('level', 40), topic: value('topic', 80),
    title: value('title', 160), engine: value('engine', 40),
    status: value('status', 60), score: Number(payload.score),
    passed: payload.passed === true,
    feedback: value('feedback', 1000), reflection: value('reflection', 1500),
    code: value('code', 50000), output: value('output', 20000)
  };
  if (clean.studentName.length < 3) throw new Error('Write your full name.');
  if (!/^[A-Z0-9-]{1,40}$/.test(clean.exerciseId)) throw new Error('Invalid exercise ID.');
  if (['brython', 'pyodide'].indexOf(clean.engine) < 0) throw new Error('Invalid Python engine.');
  if (['In progress', 'Submitted', 'Completed', 'Needs revision', 'Mastery evidence'].indexOf(clean.status) < 0) {
    throw new Error('Invalid progress status.');
  }
  if (!isFinite(clean.score) || clean.score < 0 || clean.score > 100 || Math.floor(clean.score) !== clean.score) {
    throw new Error('Invalid score.');
  }
  return clean;
}

function spreadsheet_() {
  if (CONFIG.SPREADSHEET_ID) return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('PYTHON_LAB_SPREADSHEET_ID');
  if (savedId) return SpreadsheetApp.openById(savedId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = active || SpreadsheetApp.create('Python Lab Tracker Results');
  props.setProperty('PYTHON_LAB_SPREADSHEET_ID', sheet.getId());
  return sheet;
}

function resultsSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.RESULTS_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.RESULTS_SHEET_NAME);
  const headerRange = sheet.getRange(1, 1, 1, RESULTS_HEADERS.length);
  const headers = headerRange.getValues()[0];
  if (headers.every(function (item) { return item === ''; })) {
    headerRange.setValues([RESULTS_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (RESULTS_HEADERS.some(function (header, i) { return String(headers[i]) !== header; })) {
    throw new Error('The results Sheet has different columns. Set SPREADSHEET_ID to a compatible Sheet.');
  }
  return sheet;
}

function nextAttempt_(sheet, email, exerciseId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  const values = sheet.getRange(2, 4, lastRow - 1, 2).getValues();
  return 1 + values.filter(function (row) {
    return String(row[0] || '').trim().toLowerCase() === email && String(row[1]) === exerciseId;
  }).length;
}

function safeText_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function restoreText_(value) {
  const text = String(value == null ? '' : value);
  return /^'[=+\-@\t\r]/.test(text) ? text.substring(1) : text;
}
