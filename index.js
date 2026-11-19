
'use strict';

/*
 * CulturaMed Healthcare
 * Single-file Node.js + Express patient service platform.
 *
 * Runtime: Node.js 18.20.3+
 * Start: node index.js | npm start
 *
 * IMPORTANT:
 * - Records are stored in server memory and are lost on restart.
 * - Configure ADMIN_PASSWORD before enabling administrative access.
 * - This is a functional prototype, not a production healthcare data system.
 * - Do not enter real patient or medical information until persistent,
 *   access-controlled storage and a privacy/security assessment are implemented.
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_COOKIE = 'cm_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

const db = {
  appointments: [],
  careRequests: [],
  receptionRequests: [],
  settings: {
    organizationName: 'CulturaMed Healthcare',
    clinicName: 'CulturaMed Healthcare',
    country: '',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    currency: 'USD',
    callingCode: '+1',
    phone: '',
    email: '',
    address: '',
    operatingHours: 'Please contact reception for current operating hours.',
    appointmentPolicy: 'Appointment requests are subject to clinic confirmation.',
    departments: ['General Medicine', 'Cardiology', 'Dermatology', 'Paediatrics', 'Orthopaedics'],
    doctors: [
      { name: 'General Medicine Team', department: 'General Medicine' },
      { name: 'Cardiology Team', department: 'Cardiology' },
      { name: 'Dermatology Team', department: 'Dermatology' },
      { name: 'Paediatrics Team', department: 'Paediatrics' },
      { name: 'Orthopaedics Team', department: 'Orthopaedics' }
    ],
    appointmentSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30'],
    voiceLanguage: 'en-US',
    voiceRate: 1
  }
};

const rateBuckets = new Map();

function cleanString(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || ''));
}

function isPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function makeRef(prefix) {
  return prefix + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function isoNow() {
  return new Date().toISOString();
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index > -1) {
      const key = part.slice(0, index).trim();
      try {
        out[key] = decodeURIComponent(part.slice(index + 1).trim());
      } catch (_) {}
    }
  });
  return out;
}

function issueSession() {
  const payload = Buffer.from(JSON.stringify({
    exp: Date.now() + SESSION_TTL_MS,
    nonce: crypto.randomBytes(12).toString('hex')
  })).toString('base64url');

  return payload + '.' + sign(payload);
}

function validSession(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token || !token.includes('.')) return false;

  const parts = token.split('.');
  if (!safeEqual(sign(parts[0]), parts[1])) return false;

  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return Number(data.exp) > Date.now();
  } catch (_) {
    return false;
  }
}

function requireAdmin(req, res, next) {
  if (!validSession(req)) {
    return res.status(401).json({
      error: 'Administrator authentication is required.'
    });
  }
  next();
}

function rateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, start: now };

  if (now - bucket.start > 60000) {
    bucket.count = 0;
    bucket.start = now;
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (bucket.count > 180) {
    return res.status(429).json({
      error: 'Too many requests. Please try again shortly.'
    });
  }

  next();
}

app.use('/api', rateLimit);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

function validatePerson(body) {
  const name = cleanString(body.name, 120);
  const phone = cleanString(body.phone, 40);
  const email = cleanString(body.email, 160).toLowerCase();
  const countryCode = cleanString(body.countryCode, 8);
  const errors = [];

  if (name.length < 2) errors.push('Please enter the patient name.');

  if (!isPhone((countryCode + ' ' + phone).trim())) {
    errors.push('Please enter a valid international phone number.');
  }

  if (!isEmail(email)) {
    errors.push('Please enter a valid email address.');
  }

  return { name, phone, email, countryCode, errors };
}

function isPastDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;

  const selected = new Date(date + 'T00:00:00');
  if (Number.isNaN(selected.getTime())) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return selected < today;
}

function findAppointment(reference) {
  return db.appointments.find(
    item => item.reference.toLowerCase() === String(reference || '').toLowerCase()
  );
}

function publicAppointment(item) {
  const { internalNotes, ...safe } = item;
  return safe;
}

function getAdminSummary() {
  const appointments = db.appointments;

  return {
    totalAppointments: appointments.length,
    confirmedAppointments: appointments.filter(x => x.status === 'Confirmed').length,
    pendingAppointments: appointments.filter(
      x => ['Requested', 'Pending Confirmation', 'Reschedule Requested'].includes(x.status)
    ).length,
    cancelledAppointments: appointments.filter(x => x.status === 'Cancelled').length,
    careRequests: db.careRequests.length,
    callbackRequests: db.receptionRequests.filter(
      x => x.category === 'Callback request'
    ).length
  };
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    product: 'CulturaMed Healthcare',
    storage: 'in-memory',
    timestamp: isoNow()
  });
});

app.get('/api/config', (req, res) => {
  const s = db.settings;

  res.json({
    organizationName: s.organizationName,
    clinicName: s.clinicName,
    country: s.country,
    timezone: s.timezone,
    dateFormat: s.dateFormat,
    currency: s.currency,
    callingCode: s.callingCode,
    phone: s.phone,
    email: s.email,
    address: s.address,
    operatingHours: s.operatingHours,
    appointmentPolicy: s.appointmentPolicy,
    departments: s.departments,
    doctors: s.doctors,
    appointmentSlots: s.appointmentSlots,
    voiceLanguage: s.voiceLanguage,
    voiceRate: s.voiceRate
  });
});

app.post('/api/appointments', (req, res) => {
  const person = validatePerson(req.body || {});
  const body = req.body || {};

  const department = cleanString(body.department, 100);
  const doctor = cleanString(body.doctor, 120);
  const date = cleanString(body.date, 10);
  const time = cleanString(body.time, 10);
  const type = cleanString(body.type, 60);
  const reason = cleanString(body.reason, 500);
  const notes = cleanString(body.notes, 1000);

  const errors = person.errors.slice();

  if (!db.settings.departments.includes(department)) {
    errors.push('Please select a valid department.');
  }

  if (!db.settings.doctors.some(
    d => d.name === doctor && d.department === department
  )) {
    errors.push('Please select a doctor for the chosen department.');
  }

  if (isPastDate(date)) {
    errors.push('Please select today or a future date.');
  }

  if (!db.settings.appointmentSlots.includes(time)) {
    errors.push('Please select an available configured time slot.');
  }

  if (!['In-person', 'Virtual', 'Phone consultation'].includes(type)) {
    errors.push('Please select a valid appointment type.');
  }

  if (reason.length < 3) {
    errors.push('Please provide a brief reason for the visit.');
  }

  if (errors.length) {
    return res.status(400).json({
      error: 'Please review the highlighted information.',
      details: errors
    });
  }

  const record = {
    reference: makeRef('CM-APT'),
    ...person,
    department,
    doctor,
    date,
    time,
    type,
    reason,
    notes,
    status: 'Requested',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    internalNotes: ''
  };

  db.appointments.unshift(record);

  res.status(201).json({
    message: 'Your appointment request has been received. The clinic must confirm availability before it becomes a confirmed appointment.',
    appointment: publicAppointment(record)
  });
});

app.post('/api/appointments/search', (req, res) => {
  const body = req.body || {};

  const reference = cleanString(body.reference, 40);
  const phone = cleanString(body.phone, 40).replace(/\D/g, '');
  const email = cleanString(body.email, 160).toLowerCase();

  if (!reference && !phone && !email) {
    return res.status(400).json({
      error: 'Enter an appointment reference, registered mobile number or email address.'
    });
  }

  let matches = [];

  if (reference) {
    const found = findAppointment(reference);
    if (found) matches = [found];
  } else {
    matches = db.appointments.filter(item =>
      (phone && (item.countryCode + item.phone).replace(/\D/g, '') === phone) ||
      (email && item.email.toLowerCase() === email)
    );
  }

  res.json({
    appointments: matches.map(publicAppointment)
  });
});

app.post('/api/appointments/:reference/reschedule', (req, res) => {
  const item = findAppointment(req.params.reference);

  if (!item) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  const body = req.body || {};
  const phone = cleanString(body.phone, 40).replace(/\D/g, '');
  const email = cleanString(body.email, 160).toLowerCase();

  if (
    !(phone && (item.countryCode + item.phone).replace(/\D/g, '') === phone) &&
    !(email && item.email.toLowerCase() === email)
  ) {
    return res.status(404).json({
      error: 'Appointment not found for the supplied contact details.'
    });
  }

  const date = cleanString(body.date, 10);
  const time = cleanString(body.time, 10);

  if (isPastDate(date)) {
    return res.status(400).json({
      error: 'Please select today or a future date.'
    });
  }

  if (!db.settings.appointmentSlots.includes(time)) {
    return res.status(400).json({
      error: 'Please select a configured appointment time.'
    });
  }

  if (['Cancelled', 'Completed'].includes(item.status)) {
    return res.status(409).json({
      error: 'This appointment can no longer be rescheduled.'
    });
  }

  item.requestedDate = date;
  item.requestedTime = time;
  item.status = 'Reschedule Requested';
  item.updatedAt = isoNow();

  res.json({
    message: 'Your rescheduling request has been submitted for clinic review.',
    appointment: publicAppointment(item)
  });
});

app.post('/api/appointments/:reference/cancel', (req, res) => {
  const item = findAppointment(req.params.reference);

  if (!item) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  const body = req.body || {};
  const phone = cleanString(body.phone, 40).replace(/\D/g, '');
  const email = cleanString(body.email, 160).toLowerCase();

  if (
    !(phone && (item.countryCode + item.phone).replace(/\D/g, '') === phone) &&
    !(email && item.email.toLowerCase() === email)
  ) {
    return res.status(404).json({
      error: 'Appointment not found for the supplied contact details.'
    });
  }

  if (item.status === 'Completed') {
    return res.status(409).json({
      error: 'A completed appointment cannot be cancelled.'
    });
  }

  item.status = 'Cancelled';
  item.updatedAt = isoNow();

  res.json({
    message: 'Your cancellation request has been recorded.',
    appointment: publicAppointment(item)
  });
});



app.post('/api/care-requests', (req, res) => {
  const body = req.body || {};
  const person = validatePerson(body);
  const type = cleanString(body.type, 100);
  const preferredTime = cleanString(body.preferredTime, 100);
  const message = cleanString(body.message, 1500);
  const allowed = ['Follow-up appointment', 'General care enquiry', 'Prescription-related enquiry', 'Test report enquiry', 'Consultation follow-up', 'General patient assistance'];
  const errors = person.errors.slice();
  if (!allowed.includes(type)) errors.push('Please select a valid request category.');
  if (!preferredTime) errors.push('Please select a preferred contact time.');
  if (message.length < 5) errors.push('Please provide a little more detail.');
  if (errors.length) return res.status(400).json({ error: 'Please review the information.', details: errors });
  const record = { reference: makeRef('CM-CARE'), ...person, type, preferredTime, message, status: 'Received', createdAt: isoNow(), updatedAt: isoNow() };
  db.careRequests.unshift(record);
  res.status(201).json({ message: 'Your patient assistance request has been received.', request: { reference: record.reference, status: record.status } });
});

app.post('/api/reception-requests', (req, res) => {
  const body = req.body || {};
  const person = validatePerson(body);
  const preferredTime = cleanString(body.preferredTime, 100);
  const category = cleanString(body.category, 100);
  const message = cleanString(body.message, 1200);
  const allowed = ['Callback request', 'General enquiry', 'Appointment availability', 'Reception assistance'];
  const errors = person.errors.slice();
  if (!preferredTime) errors.push('Please select a preferred callback time.');
  if (!allowed.includes(category)) errors.push('Please select a valid enquiry category.');
  if (message.length < 3) errors.push('Please enter a short message.');
  if (errors.length) return res.status(400).json({ error: 'Please review the information.', details: errors });
  const record = { reference: makeRef('CM-REC'), ...person, preferredTime, category, message, status: 'Received', createdAt: isoNow(), updatedAt: isoNow() };
  db.receptionRequests.unshift(record);
  res.status(201).json({ message: 'Your reception request has been received. A team member can follow up using the contact details supplied.', request: { reference: record.reference, status: record.status } });
});

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Administrator access is not configured. Set ADMIN_PASSWORD on the server.' });
  const password = String((req.body || {}).password || '');
  if (!safeEqual(password, ADMIN_PASSWORD)) return res.status(401).json({ error: 'The password is incorrect.' });
  const token = issueSession();
  const secureFlag = req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly${secureFlag}; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`);
  res.json({ message: 'Administrator signed in.' });
});
app.post('/api/admin/logout', (req, res) => {
  const secureFlag = req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly${secureFlag}; SameSite=Strict; Path=/; Max-Age=0`);
  res.json({ message: 'Signed out.' });
});
app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ authenticated: true }));
app.get('/api/admin/summary', requireAdmin, (req, res) => res.json(getAdminSummary()));
app.get('/api/admin/records', requireAdmin, (req, res) => {
  const query = cleanString(req.query.q, 120).toLowerCase();
  const status = cleanString(req.query.status, 60);
  const filter = rows => rows.filter(row => {
    const text = [row.reference, row.name, row.phone, row.email, row.category, row.type, row.department, row.doctor].join(' ').toLowerCase();
    return (!query || text.includes(query)) && (!status || row.status === status);
  });
  res.json({
    appointments: filter(db.appointments).map(publicAppointment),
    careRequests: filter(db.careRequests),
    receptionRequests: filter(db.receptionRequests)
  });
});
app.patch('/api/admin/appointments/:reference', requireAdmin, (req, res) => {
  const item = findAppointment(req.params.reference);
  if (!item) return res.status(404).json({ error: 'Appointment not found.' });
  const allowed = ['Requested', 'Pending Confirmation', 'Confirmed', 'Reschedule Requested', 'Cancelled', 'Completed'];
  const status = cleanString((req.body || {}).status, 60);
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid appointment status.' });
  item.status = status;
  item.updatedAt = isoNow();
  res.json({ appointment: publicAppointment(item) });
});
app.patch('/api/admin/requests/:kind/:reference', requireAdmin, (req, res) => {
  const kind = req.params.kind;
  const collection = kind === 'care' ? db.careRequests : kind === 'reception' ? db.receptionRequests : null;
  if (!collection) return res.status(400).json({ error: 'Invalid request type.' });
  const item = collection.find(x => x.reference.toLowerCase() === req.params.reference.toLowerCase());
  if (!item) return res.status(404).json({ error: 'Request not found.' });
  const status = cleanString((req.body || {}).status, 60);
  if (!['Received', 'In review', 'Processed', 'Closed'].includes(status)) return res.status(400).json({ error: 'Invalid request status.' });
  item.status = status;
  item.updatedAt = isoNow();
  res.json({ request: item });
});
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const body = req.body || {};
  const next = { ...db.settings };
  const textFields = ['organizationName', 'clinicName', 'country', 'timezone', 'dateFormat', 'currency', 'callingCode', 'phone', 'email', 'address', 'operatingHours', 'appointmentPolicy', 'voiceLanguage'];
  textFields.forEach(key => { if (body[key] !== undefined) next[key] = cleanString(body[key], key === 'address' || key === 'appointmentPolicy' ? 500 : 160); });
  if (next.email && !isEmail(next.email)) return res.status(400).json({ error: 'Please enter a valid clinic email address.' });
  if (body.departments !== undefined) {
    if (!Array.isArray(body.departments) || body.departments.length > 40) return res.status(400).json({ error: 'Departments must be a list of up to 40 entries.' });
    next.departments = [...new Set(body.departments.map(x => cleanString(x, 100)).filter(Boolean))];
  }
  if (body.doctors !== undefined) {
    if (!Array.isArray(body.doctors) || body.doctors.length > 100) return res.status(400).json({ error: 'Doctors must be a list of up to 100 entries.' });
    next.doctors = body.doctors.map(x => ({ name: cleanString(x.name, 120), department: cleanString(x.department, 100) })).filter(x => x.name && next.departments.includes(x.department));
  }
  if (body.appointmentSlots !== undefined) {
    if (!Array.isArray(body.appointmentSlots) || body.appointmentSlots.length > 50) return res.status(400).json({ error: 'Appointment slots must be a list of up to 50 entries.' });
    next.appointmentSlots = [...new Set(body.appointmentSlots.map(x => cleanString(x, 10)).filter(x => /^([01]\d|2[0-3]):[0-5]\d$/.test(x)))];
  }
  if (body.voiceRate !== undefined) next.voiceRate = Math.min(1.5, Math.max(0.7, Number(body.voiceRate) || 1));
  db.settings = next;
  res.json({ message: 'Settings updated.', settings: db.settings });
});

const HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#10243a">
<meta name="description" content="CulturaMed Healthcare patient services and appointment requests.">
<title>CulturaMed Healthcare | Patient Services</title>
<style>
:root{--navy:#10243a;--navy2:#183650;--blue:#2876b9;--teal:#1b9a91;--ink:#203448;--muted:#708194;--line:#e4ebf1;--bg:#f3f6f9;--white:#fff;--soft:#eaf4f8;--shadow:0 12px 34px rgba(24,48,72,.08);--radius:16px}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}button{cursor:pointer}.app{min-height:100vh}.sidebar{position:fixed;inset:0 auto 0 0;width:252px;background:var(--navy);color:#eaf3fa;padding:25px 16px;display:flex;flex-direction:column;z-index:20}.brand{display:flex;align-items:center;gap:12px;padding:0 10px 28px}.brand-mark{width:39px;height:39px;border-radius:13px;background:linear-gradient(145deg,#36b5ac,#2876b9);display:grid;place-items:center;color:white;font-size:22px;font-weight:800}.brand strong{display:block;font-size:15px;letter-spacing:.1px}.brand small{color:#a9bdcd;font-size:11px}.nav-label{font-size:10px;text-transform:uppercase;letter-spacing:1.4px;color:#8198aa;padding:10px 12px}.nav{display:grid;gap:5px}.nav button{border:0;background:transparent;color:#c4d3df;text-align:left;padding:11px 12px;border-radius:10px;display:flex;align-items:center;gap:12px;font-size:13px;transition:.2s}.nav button:hover,.nav button.active{background:#23445e;color:#fff}.nav .ico{width:20px;text-align:center;font-size:16px}.side-foot{margin-top:auto;border-top:1px solid #29445a;padding:16px 10px 0;color:#a9bdcd;font-size:11px}.main{margin-left:252px;min-height:100vh}.topbar{height:72px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 34px;position:sticky;top:0;z-index:10}.crumb{font-size:12px;color:var(--muted)}.crumb b{color:var(--ink);font-weight:650}.top-actions{display:flex;align-items:center;gap:12px}.secure-note{font-size:11px;color:var(--muted)}.avatar{width:34px;height:34px;border-radius:50%;background:#e4f1f4;color:#246b7a;display:grid;place-items:center;font-weight:700}.content{max-width:1440px;margin:auto;padding:30px 34px 55px}.page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:24px}.eyebrow{font-size:10px;font-weight:750;letter-spacing:1.6px;text-transform:uppercase;color:var(--teal)}h1{font-size:27px;letter-spacing:-.8px;margin:5px 0 6px;color:var(--navy);line-height:1.2}h2{font-size:17px;margin:0 0 6px;color:var(--navy)}h3{font-size:14px;margin:0 0 5px;color:var(--navy)}p{margin:0;color:var(--muted)}.sub{max-width:720px;font-size:13px}.btn{border:1px solid transparent;border-radius:9px;padding:10px 15px;font-weight:650;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:.18s}.btn-primary{background:var(--blue);color:#fff}.btn-primary:hover{background:#1c629f}.btn-dark{background:var(--navy);color:#fff}.btn-soft{background:#eaf3f8;color:#225b7c;border-color:#d9e8ef}.btn-outline{background:#fff;color:var(--ink);border-color:var(--line)}.btn-danger{background:#fff0ef;color:#a33b36;border-color:#f4d5d2}.btn-sm{padding:7px 10px;font-size:11px}.grid{display:grid;gap:18px}.grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}.grid-4{grid-template-columns:repeat(4,minmax(0,1fr))}.card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow)}.hero{background:linear-gradient(112deg,#102b43,#1b526d);border-radius:20px;padding:32px;color:white;position:relative;overflow:hidden;display:grid;grid-template-columns:1.3fr .7fr;gap:20px;min-height:245px}.hero:after{content:"";position:absolute;width:290px;height:290px;border:1px solid rgba(255,255,255,.12);border-radius:50%;right:8%;top:-110px;box-shadow:0 0 0 35px rgba(255,255,255,.035),0 0 0 70px rgba(255,255,255,.025)}.hero h1{color:#fff;font-size:31px;max-width:570px;margin:9px 0 12px}.hero p{color:#c7d9e5;max-width:560px}.hero .eyebrow{color:#70d1c7}.hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.hero .btn-primary{background:#fff;color:#174b69}.hero .btn-soft{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.18)}.voice-card{align-self:center;justify-self:end;width:min(100%,250px);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:17px;padding:19px;position:relative;z-index:1;backdrop-filter:blur(8px)}.voice-orb{width:54px;height:54px;border-radius:50%;background:#d7f5ef;color:#167b77;display:grid;place-items:center;font-size:23px;margin-bottom:13px}.voice-card p{font-size:11px}.voice-controls{display:flex;gap:7px;margin-top:14px}.voice-controls .btn{flex:1;padding:8px 5px;font-size:10px}.section-row{display:flex;justify-content:space-between;align-items:center;margin:27px 0 13px}.service-card{padding:18px;cursor:pointer;transition:.2s;border:1px solid var(--line);background:#fff;border-radius:14px;text-align:left;width:100%}.service-card:hover{transform:translateY(-2px);border-color:#b9d5e2;box-shadow:var(--shadow)}.service-icon{width:38px;height:38px;border-radius:11px;background:#eaf4f8;display:grid;place-items:center;font-size:18px;margin-bottom:13px}.service-card p{font-size:11px;margin-top:5px}.service-card strong{font-size:13px;color:var(--navy)}.info-strip{display:flex;gap:13px;align-items:center;padding:15px 17px;background:#edf6f7;border:1px solid #dceced;border-radius:12px;color:#386b73;font-size:12px}.metric{padding:17px 18px}.metric-top{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:11px}.metric-value{font-size:27px;font-weight:750;color:var(--navy);margin-top:8px}.metric-icon{width:31px;height:31px;border-radius:9px;background:#edf5f8;display:grid;place-items:center}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.field{display:flex;flex-direction:column;gap:6px}.field.full{grid-column:1/-1}.field label{font-size:11px;font-weight:700;color:#41576a}.field input,.field select,.field textarea,.toolbar input,.toolbar select{width:100%;border:1px solid #dce5ec;border-radius:9px;background:#fff;padding:10px 11px;color:var(--ink);outline:none;min-height:40px}.field textarea{min-height:90px;resize:vertical}.field input:focus,.field select:focus,.field textarea:focus,.toolbar input:focus{border-color:#66a5c8;box-shadow:0 0 0 3px #e7f2f8}.hint{font-size:10px;color:var(--muted)}.form-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.notice{padding:12px 14px;border-radius:10px;font-size:12px;margin-bottom:15px}.notice.error{background:#fff0ef;color:#983d37;border:1px solid #f3d8d5}.notice.success{background:#edf8f4;color:#28745e;border:1px solid #d6eee4}.notice.info{background:#edf5fa;color:#32657e;border:1px solid #d9e9f2}.hidden{display:none!important}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:15px}.toolbar input{max-width:340px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px}table{width:100%;border-collapse:collapse;min-width:650px;background:white}th,td{text-align:left;padding:12px 13px;border-bottom:1px solid #edf1f4;font-size:11px;vertical-align:middle}th{background:#f8fafb;color:#687d8e;font-size:10px;text-transform:uppercase;letter-spacing:.7px}td{color:#405568}tr:last-child td{border-bottom:0}.status{display:inline-flex;padding:4px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#edf3f7;color:#557084}.status.confirmed,.status.processed,.status.completed{background:#e7f6ef;color:#287657}.status.cancelled,.status.closed{background:#fff0ef;color:#a34840}.status.requested,.status.received,.status.pending-confirmation,.status.reschedule-requested,.status.in-review{background:#fff5e5;color:#94671e}.empty{padding:26px;text-align:center;color:var(--muted);font-size:12px}.result-card{border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:12px}.result-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:13px 0}.detail-grid div{background:#f7f9fb;padding:9px;border-radius:8px}.detail-grid small{display:block;color:var(--muted);font-size:9px}.detail-grid strong{font-size:11px}.voice-panel{background:linear-gradient(135deg,#102b43,#1c5870);color:#fff;border-radius:18px;padding:25px}.voice-panel p{color:#c8d9e3}.ivr-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:20px}.ivr-option{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.18);border-radius:11px;color:white;padding:14px;text-align:left;display:flex;gap:12px;align-items:center}.ivr-option:hover{background:rgba(255,255,255,.16)}.ivr-number{width:29px;height:29px;border-radius:9px;background:#d8f2ee;color:#176e6c;display:grid;place-items:center;font-weight:800}.voice-state{margin-top:16px;padding:12px;background:rgba(255,255,255,.08);border-radius:10px;font-size:12px;color:#dceaf0}.admin-lock{max-width:430px;margin:25px auto}.footer-note{font-size:10px;color:#8797a5;margin-top:25px;text-align:center}.mobile-menu{display:none}.toast{position:fixed;right:22px;bottom:22px;z-index:50;max-width:360px;background:#183650;color:white;padding:13px 17px;border-radius:11px;box-shadow:var(--shadow);font-size:12px}.toast.error{background:#963e38}.muted{color:var(--muted)}.inline-actions{display:flex;gap:6px;flex-wrap:wrap}.tag{font-size:10px;color:#47748a;background:#edf5f8;padding:4px 8px;border-radius:20px}.settings-list{display:flex;flex-direction:column;gap:10px}.settings-list .field{max-width:100%}
@media(max-width:1050px){.grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{grid-template-columns:1fr .7fr}.content{padding:25px}}
@media(max-width:760px){.sidebar{transform:translateX(-100%);transition:.25s;width:265px}.sidebar.open{transform:translateX(0)}.main{margin-left:0}.mobile-menu{display:inline-flex}.topbar{padding:0 16px;height:62px}.content{padding:21px 15px 40px}.page-head{display:block}.page-head>.btn{margin-top:13px}.hero{grid-template-columns:1fr;padding:24px;min-height:0}.hero h1{font-size:26px}.voice-card{justify-self:start;width:100%;max-width:none}.grid-2,.grid-3{grid-template-columns:1fr}.grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}.form-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.ivr-options{grid-template-columns:1fr}.secure-note{display:none}.detail-grid{grid-template-columns:1fr 1fr}}
@media(max-width:390px){.grid-4{grid-template-columns:1fr}.hero-actions .btn{width:100%}.detail-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="app">
<aside class="sidebar" id="sidebar">
  <div class="brand"><div class="brand-mark">+</div><div><strong>CulturaMed</strong><small>HEALTHCARE</small></div></div>
  <div class="nav-label">Patient services</div>
  <nav class="nav" id="mainNav">
    <button class="active" data-page="overview"><span class="ico">⌂</span>Overview</button>
    <button data-page="booking"><span class="ico">＋</span>Book an appointment</button>
    <button data-page="manage"><span class="ico">▤</span>Manage appointments</button>
    <button data-page="care"><span class="ico">♡</span>Patient care & follow-up</button>
    <button data-page="reception"><span class="ico">☏</span>Reception desk</button>
    <button data-page="clinic"><span class="ico">⌖</span>Clinic information</button>
    <button data-page="voice"><span class="ico">◉</span>Voice assistant / IVR</button>
  </nav>
  <div class="nav-label">Workspace</div>
  <nav class="nav">
    <button data-page="admin"><span class="ico">▦</span>Administration</button>
    <button data-page="settings"><span class="ico">⚙</span>Settings</button>
  </nav>
  <div class="side-foot">CulturaMed Healthcare<br>Patient experience platform</div>
</aside>
<main class="main">
  <header class="topbar">
    <div style="display:flex;align-items:center;gap:12px"><button class="btn btn-outline mobile-menu" id="menuToggle" aria-label="Open navigation">☰</button><div class="crumb">Workspace&nbsp; / &nbsp;<b id="crumbName">Overview</b></div></div>
    <div class="top-actions"><span class="secure-note">Patient-first service experience</span><div class="avatar" aria-label="CulturaMed">C</div></div>
  </header>
  <div class="content" id="pageContent"></div>
</main>
</div>
<div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
<script>
(function(){
'use strict';
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const state={page:'overview',config:null,admin:false,adminRecords:null,adminSummary:null,adminFilter:'',lastAppointment:null,voiceText:'',toastTimer:null};
const pageNames={overview:'Overview',booking:'Patient appointment booking',manage:'Manage appointments',care:'Patient care and follow-up',reception:'Reception desk',clinic:'Clinic information',voice:'Voice assistant / IVR',admin:'Administration dashboard',settings:'Settings'};
const esc = value => String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const attr = esc;
const fmtDate = value => { if(!value)return '—'; const d=new Date(value+'T00:00:00'); return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(d); };
async function api(url,options={}){
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  const response=await fetch(url,{...options,headers,credentials:'same-origin'});
  let data={}; try{data=await response.json();}catch(_){}
  if(!response.ok){const error=new Error(data.error||'The request could not be completed.');error.details=data.details||[];error.status=response.status;throw error;}
  return data;
}

function toast(message,type=''){
  const el=$('#toast');el.textContent=message;el.className='toast'+(type?' '+type:'');
  clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.add('hidden'),4200);
}
function notice(message,type='info'){return '<div class="notice '+type+'">'+esc(message)+'</div>';}
function field(label,name,type='text',required=true,extra=''){
  return '<div class="field"><label for="'+attr(name)+'">'+esc(label)+(required?' *':'')+'</label><input id="'+attr(name)+'" name="'+attr(name)+'" type="'+attr(type)+'" '+(required?'required':'')+' '+extra+'></div>';
}
function selectField(label,name,options,required=true){
  return '<div class="field"><label for="'+attr(name)+'">'+esc(label)+(required?' *':'')+'</label><select id="'+attr(name)+'" name="'+attr(name)+'" '+(required?'required':'')+'><option value="">Select '+esc(label.toLowerCase())+'</option>'+options.map(x=>'<option value="'+attr(x)+'">'+esc(x)+'</option>').join('')+'</select></div>';
}
function pageHead(title,sub,action=''){return '<div class="page-head"><div><div class="eyebrow">CULTURAMED HEALTHCARE</div><h1>'+esc(title)+'</h1><p class="sub">'+esc(sub)+'</p></div>'+action+'</div>';}
function go(page){
  if(!pageNames[page])return;
  state.page=page;$('#crumbName').textContent=pageNames[page];
  $$('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('#sidebar').classList.remove('open');render();
}
function speak(text){
  if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){toast('Voice playback is not available in this browser. You can still use the on-screen options.','error');return;}
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang=(state.config&&state.config.voiceLanguage)||'en-US';
  utterance.rate=Number((state.config&&state.config.voiceRate)||1);
  window.speechSynthesis.speak(utterance);
}
function stopVoice(){if('speechSynthesis' in window)window.speechSynthesis.cancel();}
function welcomeText(){return 'Welcome to CulturaMed Healthcare. Thank you for contacting us. How may we assist you today?';}
function renderOverview(){
 return pageHead('Care that connects. Service that listens.','A considered patient experience for appointment requests, care enquiries and reception assistance.')+
 '<section class="hero"><div><div class="eyebrow">WELCOME TO CULTURAMED</div><h1>Your healthcare journey, made simpler.</h1><p>Access patient services, request appointments and connect with the right support through one welcoming experience.</p><div class="hero-actions"><button class="btn btn-primary" data-go="booking">＋&nbsp; Request an appointment</button><button class="btn btn-soft" data-go="voice">◉&nbsp; Explore voice assistant</button></div></div><div class="voice-card"><div class="voice-orb">◖</div><h3 style="color:white">Voice welcome</h3><p>Listen to a short welcome message from CulturaMed Healthcare.</p><div class="voice-controls"><button class="btn btn-primary" data-action="welcome">▶ Play</button><button class="btn btn-soft" data-action="stop-voice">■ Stop</button></div></div></section>'+
 '<div class="section-row"><h2>Patient services</h2><span class="tag">Available online</span></div>'+
 '<div class="grid grid-3">'+
 service('＋','Appointment booking','Send an appointment request to the clinic.','booking')+
 service('▤','Manage appointments','Find an existing request and ask for a change.','manage')+
 service('♡','Patient care','Send a care enquiry or follow-up request.','care')+
 service('☏','Reception assistance','Request a callback or submit an enquiry.','reception')+
 service('⌖','Clinic information','Review configurable clinic details and policies.','clinic')+
 service('◉','Voice assistant','Navigate patient services with guided voice prompts.','voice')+
 '</div><div class="section-row"><h2>Here to help</h2></div><div class="info-strip"><span style="font-size:20px">✦</span><span>Appointment requests are not confirmed bookings. The clinic must review and confirm availability before your appointment is confirmed.</span></div>'+
 '<div class="footer-note">Please do not submit emergency requests or sensitive medical records through this service.</div>';
}
function service(icon,title,desc,page){return '<button class="service-card" data-go="'+page+'"><div class="service-icon">'+icon+'</div><strong>'+title+'</strong><p>'+desc+'</p></button>';}
function renderBooking(){
 const c=state.config;
 return pageHead('Request an appointment','Share your preferred details. The clinic will review your request and contact you about availability.')+
 '<div class="grid grid-2"><section class="card"><h2>Patient details</h2><p style="font-size:11px;margin-bottom:18px">Fields marked with * are required.</p><form id="bookingForm"><div class="form-grid">'+
 field('Full name','name')+
 '<div class="field"><label for="countryCode">Country calling code *</label><input id="countryCode" name="countryCode" value="'+attr(c.callingCode||'')+'" placeholder="+1" required></div>'+
 field('Mobile number','phone','tel',true,'autocomplete="tel-national"')+
 field('Email address','email','email',true,'autocomplete="email"')+
 selectField('Department','department',c.departments)+
 '<div class="field"><label for="doctor">Preferred doctor *</label><select id="doctor" name="doctor" required><option value="">Select a department first</option></select></div>'+
 field('Preferred date','date','date',true,'min="'+new Date().toISOString().slice(0,10)+'"')+
 selectField('Preferred time','time',c.appointmentSlots)+
 selectField('Appointment type','type',['In-person','Virtual','Phone consultation'])+
 '<div class="field full"><label for="reason">Reason for visit *</label><textarea id="reason" name="reason" required maxlength="500" placeholder="Briefly describe the reason for your appointment"></textarea></div>'+
 '<div class="field full"><label for="notes">Additional notes</label><textarea id="notes" name="notes" maxlength="1000" placeholder="Optional information for the clinic"></textarea></div>'+
 '</div><div id="bookingNotice"></div><div class="form-actions"><button class="btn btn-primary" type="submit">Submit appointment request&nbsp; →</button></div></form></section>'+
 '<aside class="card"><div class="service-icon">✦</div><h2>What happens next?</h2><p style="font-size:12px;margin:8px 0 18px">Your request is sent to the clinic workflow. It is not a confirmed appointment.</p><div class="settings-list"><div><b>01 · Request received</b><p style="font-size:11px">A reference number is generated for your request.</p></div><div><b>02 · Clinic review</b><p style="font-size:11px">The clinic reviews the preferred date, time and department.</p></div><div><b>03 · Confirmation</b><p style="font-size:11px">The clinic updates the status after checking availability.</p></div></div><div style="margin-top:20px">'+notice(c.appointmentPolicy||'Appointment requests are subject to clinic confirmation.','info')+'</div></aside></div>';
}
function renderManage(){
 return pageHead('Manage an appointment','Search using your appointment reference, registered mobile number or email address.')+
 '<section class="card" style="max-width:800px"><form id="searchForm"><div class="form-grid">'+field('Appointment reference','reference','text',false)+field('Registered mobile number','phone','tel',false)+field('Email address','email','email',false)+'</div><div class="form-actions"><button class="btn btn-primary" type="submit">Search appointments</button></div></form><div id="searchResults"></div></section>';
}
function renderCare(){
 return pageHead('Patient care and follow-up','Send a non-urgent patient assistance request. This channel does not provide medical diagnosis or emergency support.')+
 '<section class="card" style="max-width:850px"><form id="careForm"><div class="form-grid">'+field('Patient name','name')+'<div class="field"><label for="countryCode">Country calling code *</label><input id="countryCode" name="countryCode" value="'+attr(state.config.callingCode||'')+'" required></div>'+field('Contact number','phone','tel')+field('Email address','email','email')+selectField('Request type','type',['Follow-up appointment','General care enquiry','Prescription-related enquiry','Test report enquiry','Consultation follow-up','General patient assistance'])+selectField('Preferred contact time','preferredTime',['Morning','Afternoon','Evening','Any time'])+'<div class="field full"><label for="message">Message *</label><textarea id="message" name="message" required maxlength="1500" placeholder="How can the patient support team assist?"></textarea></div></div><div id="careNotice"></div><div class="form-actions"><button class="btn btn-primary" type="submit">Submit care request</button></div></form></section>';
}
function renderReception(){
 return pageHead('Reception desk','Request a callback or send a general enquiry to the reception team.')+
 '<section class="card" style="max-width:850px"><form id="receptionForm"><div class="form-grid">'+field('Patient name','name')+'<div class="field"><label for="countryCode">Country calling code *</label><input id="countryCode" name="countryCode" value="'+attr(state.config.callingCode||'')+'" required></div>'+field('Contact number','phone','tel')+field('Email address','email','email')+selectField('Preferred callback time','preferredTime',['Morning','Afternoon','Evening','Any time'])+selectField('Enquiry category','category',['Callback request','General enquiry','Appointment availability','Reception assistance'])+'<div class="field full"><label for="message">Message *</label><textarea id="message" name="message" required maxlength="1200" placeholder="Please tell reception how they can help"></textarea></div></div><div id="receptionNotice"></div><div class="form-actions"><button class="btn btn-primary" type="submit">Send reception request</button></div></form></section>';
}
function renderClinic(){
 const c=state.config;
 return pageHead('Clinic information','Review the organization details and service information currently configured for this workspace.')+
 '<div class="grid grid-2"><section class="card"><div class="service-icon">⌖</div><h2>'+esc(c.clinicName||'CulturaMed Healthcare')+'</h2><p style="font-size:12px;margin:5px 0 18px">Clinic information</p><div class="detail-grid">'+detail('Country',c.country||'Not configured')+detail('Address',c.address||'Not configured')+detail('Contact number',c.phone||'Not configured')+detail('Email',c.email||'Not configured')+detail('Time zone',c.timezone||'UTC')+detail('Operating hours',c.operatingHours||'Not configured')+'</div></section><section class="card"><h2>Departments and services</h2><p style="font-size:11px;margin-bottom:15px">Configured departments</p><div class="settings-list">'+c.departments.map(d=>'<div class="info-strip"><span>✚</span><b>'+esc(d)+'</b></div>').join('')+'</div><h3 style="margin-top:22px">Appointment policy</h3><p style="font-size:12px;margin-top:7px">'+esc(c.appointmentPolicy||'Please contact the clinic for appointment policies.')+'</p></section></div>';
}
function detail(label,value){return '<div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>';}

function renderVoice(){
 return pageHead('Voice assistant and IVR','CulturaMed Healthcare — guided patient phone-menu demonstration.')+
 '<section class="voice-panel"><div class="eyebrow" style="color:#70d1c7">CULTURAMED VOICE SERVICES</div><h2 style="color:white;font-size:22px;margin-top:8px">Welcome to CulturaMed Healthcare</h2><p style="font-size:13px;margin-top:8px">How can we help you today? Select an option below.</p><div class="ivr-options">'+
 ivr(1,'Appointment Booking','booking')+
 ivr(2,'Existing Appointment Check','manage')+
 ivr(3,'Talk to Doctor / Reception','reception')+
 ivr(4,'Clinic Information','clinic')+
 '</div><div class="voice-state" id="voiceState" aria-live="polite">Welcome to CulturaMed Healthcare. Please select an option from 1 to 4.</div><div class="hero-actions"><button class="btn btn-primary" data-action="ivr-welcome">▶ Play welcome</button><button class="btn btn-soft" data-action="ivr-menu">▤ Hear menu</button><button class="btn btn-soft" data-action="stop-voice">■ Stop voice</button><button class="btn btn-soft" data-action="repeat-prompt">↻ Repeat prompt</button></div></section><div class="info-strip" style="margin-top:18px"><span>ⓘ</span><span>Browser-based IVR demonstration. Actual incoming telephone calls require an active phone number and telephony service.</span></div>';
}

function ivr(n,label,target){return '<button class="ivr-option" data-ivr="'+n+'"><span class="ivr-number">'+n+'</span><b>'+label+'</b></button>';}



function menuText(){return 'Welcome to CulturaMed Healthcare. For appointment booking, press one. To check an existing appointment, press two. To talk to a doctor or reception, press three. For clinic information, press four.';}



function setVoiceState(text){const el=$('#voiceState');if(el)el.textContent=text;state.voiceText=text;}
function renderAdmin(){
 if(!state.admin)return pageHead('Administration dashboard','Authorized administrative access is required to review patient service records.')+
 '<section class="card admin-lock"><div class="service-icon">▣</div><h2>Administrator sign in</h2><p style="font-size:11px;margin:5px 0 18px">Use the administrator password configured on the server.</p><form id="adminLogin"><div class="field"><label for="adminPassword">Administrator password</label><input id="adminPassword" name="password" type="password" required autocomplete="current-password"></div><div id="adminLoginNotice"></div><div class="form-actions"><button class="btn btn-primary" type="submit">Sign in</button></div></form><p class="hint" style="margin-top:12px">If access has not been configured, set the ADMIN_PASSWORD environment variable on the server.</p></section>';
 const s=state.adminSummary||{};
 return pageHead('Administration dashboard','Review appointment requests, care enquiries and reception requests.','<button class="btn btn-outline" data-action="admin-refresh">↻ Refresh records</button>')+
 '<div class="grid grid-4">'+metric('Appointment requests',s.totalAppointments||0,'▤')+metric('Confirmed appointments',s.confirmedAppointments||0,'✓')+metric('Pending requests',s.pendingAppointments||0,'◷')+metric('Cancelled appointments',s.cancelledAppointments||0,'×')+metric('Care requests',s.careRequests||0,'♡')+metric('Callback requests',s.callbackRequests||0,'☏')+'</div>'+
 '<div class="section-row"><h2>Patient service records</h2><button class="btn btn-outline btn-sm" data-action="admin-logout">Sign out</button></div>'+
 '<div class="toolbar"><input id="adminSearch" placeholder="Search name, reference, contact..." value="'+attr(state.adminFilter)+'"><button class="btn btn-primary" data-action="admin-search">Search</button></div>'+
 '<div class="card" style="padding:0;overflow:hidden"><div style="padding:17px 18px"><h2>Appointment management</h2></div><div id="adminAppointments" class="table-wrap"></div></div>'+
 '<div class="grid grid-2" style="margin-top:18px"><section class="card" style="padding:0;overflow:hidden"><div style="padding:17px"><h2>Care follow-up</h2></div><div id="adminCare" class="table-wrap"></div></section><section class="card" style="padding:0;overflow:hidden"><div style="padding:17px"><h2>Reception requests</h2></div><div id="adminReception" class="table-wrap"></div></section></div>';
}
function metric(label,value,icon){return '<div class="card metric"><div class="metric-top"><span>'+label+'</span><span class="metric-icon">'+icon+'</span></div><div class="metric-value">'+Number(value)+'</div></div>';}
function renderSettings(){
 const c=state.config;
 return pageHead('Settings','Configure clinic identity, international preferences, departments, doctors, appointment slots and voice behaviour.')+
 '<section class="card"><form id="settingsForm"><div class="form-grid">'+
 field('Organization name','organizationName','text',true,'value="'+attr(c.organizationName)+'"')+
 field('Clinic name','clinicName','text',true,'value="'+attr(c.clinicName)+'"')+
 field('Country','country','text',false,'value="'+attr(c.country)+'"')+
 field('Time zone','timezone','text',true,'value="'+attr(c.timezone)+'"')+
 field('Date format','dateFormat','text',true,'value="'+attr(c.dateFormat)+'"')+
 field('Currency code','currency','text',true,'value="'+attr(c.currency)+'"')+
 field('Country calling code','callingCode','text',true,'value="'+attr(c.callingCode)+'"')+
 field('Contact number','phone','tel',false,'value="'+attr(c.phone)+'"')+
 field('Clinic email','email','email',false,'value="'+attr(c.email)+'"')+
 field('Voice language','voiceLanguage','text',true,'value="'+attr(c.voiceLanguage)+'"')+
 '<div class="field"><label for="voiceRate">Voice speed</label><input id="voiceRate" name="voiceRate" type="number" min=".7" max="1.5" step=".1" value="'+attr(c.voiceRate)+'"></div>'+
 '<div class="field full"><label for="address">Clinic address</label><textarea id="address" name="address">'+esc(c.address)+'</textarea></div>'+
 '<div class="field full"><label for="operatingHours">Operating hours</label><textarea id="operatingHours" name="operatingHours">'+esc(c.operatingHours)+'</textarea></div>'+
 '<div class="field full"><label for="appointmentPolicy">Appointment policy</label><textarea id="appointmentPolicy" name="appointmentPolicy">'+esc(c.appointmentPolicy)+'</textarea></div>'+
 '<div class="field full"><label for="departments">Departments (one per line)</label><textarea id="departments" name="departments">'+esc(c.departments.join('\n'))+'</textarea></div>'+
 '<div class="field full"><label for="doctors">Doctors (one per line, format: Name | Department)</label><textarea id="doctors" name="doctors">'+esc(c.doctors.map(d=>d.name+' | '+d.department).join('\n'))+'</textarea></div>'+
 '<div class="field full"><label for="appointmentSlots">Appointment slots (comma separated, 24-hour HH:MM)</label><input id="appointmentSlots" name="appointmentSlots" value="'+attr(c.appointmentSlots.join(', '))+'"></div>'+
 '</div><div id="settingsNotice"></div><div class="form-actions"><button class="btn btn-primary" type="submit">Save settings</button></div></form></section>';
}

function render(){
 const root=$('#pageContent');
 const views={overview:renderOverview,booking:renderBooking,manage:renderManage,care:renderCare,reception:renderReception,clinic:renderClinic,voice:renderVoice,admin:renderAdmin,settings:renderSettings};
 root.innerHTML=(views[state.page]||renderOverview)();
 if(state.page==='admin'&&state.admin)loadAdminRecords();
}
function formObject(form){return Object.fromEntries(new FormData(form).entries());}
function showFormError(target,error){
 const details=error.details&&error.details.length?'<ul>'+error.details.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
 target.innerHTML=notice(error.message+details,'error');
}
function renderAppointmentResult(item){
 return '<article class="result-card"><div class="result-head"><div><b>'+esc(item.reference)+'</b><div class="hint">Appointment request</div></div>'+statusBadge(item.status)+'</div><div class="detail-grid">'+detail('Patient',item.name)+detail('Department',item.department)+detail('Doctor',item.doctor)+detail('Requested date',fmtDate(item.date))+detail('Requested time',item.time)+detail('Appointment type',item.type)+'</div><p class="hint">This request is not a confirmed booking unless its status is Confirmed.</p>'+(!['Cancelled','Completed'].includes(item.status)?'<div class="inline-actions" style="margin-top:12px"><button class="btn btn-soft btn-sm" data-reschedule="'+attr(item.reference)+'">Request reschedule</button><button class="btn btn-danger btn-sm" data-cancel="'+attr(item.reference)+'">Request cancellation</button></div>':'')+'<div id="action-'+attr(item.reference)+'"></div></article>';
}
function statusBadge(status){return '<span class="status '+attr(status.toLowerCase().replace(/\s+/g,'-'))+'">'+esc(status)+'</span>';}
async function loadAdminRecords(){
 try{
  const [summary,records]=await Promise.all([api('/api/admin/summary'),api('/api/admin/records?q='+encodeURIComponent(state.adminFilter))]);
  state.adminSummary=summary;state.adminRecords=records;
  const a=$('#adminAppointments'),c=$('#adminCare'),r=$('#adminReception');
  if(!a)return;
  a.innerHTML=records.appointments.length?'<table><thead><tr><th>Reference / Patient</th><th>Department</th><th>Date</th><th>Status</th><th>Update status</th></tr></thead><tbody>'+records.appointments.map(x=>'<tr><td><b>'+esc(x.reference)+'</b><br>'+esc(x.name)+'</td><td>'+esc(x.department)+'</td><td>'+fmtDate(x.date)+'</td><td>'+statusBadge(x.status)+'</td><td><select data-appointment-status="'+attr(x.reference)+'">'+['Requested','Pending Confirmation','Confirmed','Reschedule Requested','Cancelled','Completed'].map(s=>'<option '+(s===x.status?'selected':'')+'>'+s+'</option>').join('')+'</select></td></tr>').join('')+'</tbody></table>':'<div class="empty">No appointment requests found.</div>';
  c.innerHTML=records.careRequests.length?simpleRequestTable(records.careRequests,'care'):'<div class="empty">No care requests found.</div>';
  r.innerHTML=records.receptionRequests.length?simpleRequestTable(records.receptionRequests,'reception'):'<div class="empty">No reception requests found.</div>';
 }catch(error){if(error.status===401){state.admin=false;render();}else toast(error.message,'error');}
}
function simpleRequestTable(rows,kind){
 return '<table><thead><tr><th>Reference</th><th>Patient</th><th>Category</th><th>Status</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.reference)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.type||x.category)+'</td><td><select data-request-kind="'+kind+'" data-request-ref="'+attr(x.reference)+'">'+['Received','In review','Processed','Closed'].map(s=>'<option '+(s===x.status?'selected':'')+'>'+s+'</option>').join('')+'</select></td></tr>').join('')+'</tbody></table>';
}
async function refreshConfig(){state.config=await api('/api/config');}
function bindNavigation(){
 $('#mainNav').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)go(b.dataset.page);});
 $('#menuToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
 $('#pageContent').addEventListener('click',async e=>{
  const goButton=e.target.closest('[data-go]');if(goButton){go(goButton.dataset.go);return;}
  const action=e.target.closest('[data-action]');if(action){const name=action.dataset.action;
   if(name==='welcome'||name==='ivr-welcome')speak(welcomeText());
   if(name==='stop-voice')stopVoice();
   if(name==='ivr-menu'){speak(menuText());setVoiceState(menuText());}
   if(name==='repeat-prompt')speak(state.voiceText||menuText());
   if(name==='admin-refresh')loadAdminRecords();
   if(name==='admin-search'){state.adminFilter=$('#adminSearch').value;loadAdminRecords();}
   if(name==='admin-logout'){try{await api('/api/admin/logout',{method:'POST',body:'{}'});}catch(_){}state.admin=false;state.adminSummary=null;go('admin');}
  }


const ivr=e.target.closest('[data-ivr]');
if(ivr){
 const n=Number(ivr.dataset.ivr);
 const map={1:'booking',2:'manage',3:'reception',4:'clinic'};
 const labels={
  1:'Appointment Booking',
  2:'Existing Appointment Check',
  3:'Talk to Doctor / Reception',
  4:'Clinic Information'
 };
 if(map[n]){
  speak(labels[n]);
  setVoiceState(labels[n]+'. Opening the selected service.');
  go(map[n]);
 }
 return;
}
  
  
  const cancel=e.target.closest('[data-cancel]');if(cancel){const ref=cancel.dataset.cancel;const host=$('#action-'+CSS.escape(ref));host.innerHTML='<div class="field" style="margin-top:12px"><label>Registered mobile number or email to verify this request</label><input id="verify-'+attr(ref)+'" placeholder="Mobile or email"></div><button class="btn btn-danger btn-sm" data-confirm-cancel="'+attr(ref)+'">Confirm cancellation request</button>';return;}
  const reschedule=e.target.closest('[data-reschedule]');if(reschedule){const ref=reschedule.dataset.reschedule;const host=$('#action-'+CSS.escape(ref));host.innerHTML='<div class="form-grid" style="margin-top:12px"><div class="field"><label>Registered mobile or email</label><input id="verify-'+attr(ref)+'" placeholder="Mobile or email"></div><div class="field"><label>New date</label><input id="newdate-'+attr(ref)+'" type="date" min="'+new Date().toISOString().slice(0,10)+'"></div><div class="field"><label>New time</label><select id="newtime-'+attr(ref)+'">'+state.config.appointmentSlots.map(s=>'<option>'+attr(s)+'</option>').join('')+'</select></div></div><button class="btn btn-primary btn-sm" data-confirm-reschedule="'+attr(ref)+'">Submit reschedule request</button>';return;}
  const cc=e.target.closest('[data-confirm-cancel]');if(cc){const ref=cc.dataset.confirmCancel;const value=$('#verify-'+CSS.escape(ref)).value;const payload=value.includes('@')?{email:value}:{phone:value};try{const result=await api('/api/appointments/'+encodeURIComponent(ref)+'/cancel',{method:'POST',body:JSON.stringify(payload)});toast(result.message);go('manage');}catch(err){toast(err.message,'error');}return;}
  const cr=e.target.closest('[data-confirm-reschedule]');if(cr){const ref=cr.dataset.confirmReschedule;const value=$('#verify-'+CSS.escape(ref)).value;const payload={date:$('#newdate-'+CSS.escape(ref)).value,time:$('#newtime-'+CSS.escape(ref)).value};if(value.includes('@'))payload.email=value;else payload.phone=value;try{const result=await api('/api/appointments/'+encodeURIComponent(ref)+'/reschedule',{method:'POST',body:JSON.stringify(payload)});toast(result.message);go('manage');}catch(err){toast(err.message,'error');}return;}
 });
 $('#pageContent').addEventListener('change',async e=>{
  const d=e.target;
  if(d.id==='department'){const doctors=state.config.doctors.filter(x=>x.department===d.value);$('#doctor').innerHTML='<option value="">Select preferred doctor</option>'+doctors.map(x=>'<option>'+esc(x.name)+'</option>').join('');}
  if(d.matches('[data-appointment-status]')){try{await api('/api/admin/appointments/'+encodeURIComponent(d.dataset.appointmentStatus),{method:'PATCH',body:JSON.stringify({status:d.value})});toast('Appointment status updated.');loadAdminRecords();}catch(err){toast(err.message,'error');}}
  if(d.matches('[data-request-kind]')){try{await api('/api/admin/requests/'+d.dataset.requestKind+'/'+encodeURIComponent(d.dataset.requestRef),{method:'PATCH',body:JSON.stringify({status:d.value})});toast('Request status updated.');loadAdminRecords();}catch(err){toast(err.message,'error');}}
 });
 $('#pageContent').addEventListener('submit',async e=>{
  const form=e.target;if(!form.matches('form'))return;e.preventDefault();
  if(form.id==='bookingForm'){
   const noticeEl=$('#bookingNotice');noticeEl.innerHTML='';
   try{const result=await api('/api/appointments',{method:'POST',body:JSON.stringify(formObject(form))});state.lastAppointment=result.appointment;noticeEl.innerHTML=notice(result.message+' Reference: '+result.appointment.reference,'success')+'<div class="result-card"><b>Request reference: '+esc(result.appointment.reference)+'</b><p style="font-size:11px;margin-top:6px">Status: '+esc(result.appointment.status)+'. Keep this reference to manage your request.</p><div class="form-actions"><button type="button" class="btn btn-outline" data-action="print-confirmation">Print details</button><button type="button" class="btn btn-soft" data-go="manage">Manage request</button></div></div>';form.reset();$('#countryCode').value=state.config.callingCode||'';$('#doctor').innerHTML='<option value="">Select a department first</option>';}
   catch(error){showFormError(noticeEl,error);}return;
  }
  if(form.id==='searchForm'){
   const resultEl=$('#searchResults');resultEl.innerHTML='';
   try{const result=await api('/api/appointments/search',{method:'POST',body:JSON.stringify(formObject(form))});resultEl.innerHTML=result.appointments.length?result.appointments.map(renderAppointmentResult).join(''):'<div class="empty">No matching appointment requests were found.</div>';}
   catch(error){showFormError(resultEl,error);}return;
  }
  if(form.id==='careForm'||form.id==='receptionForm'){
   const isCare=form.id==='careForm';const noticeEl=$(isCare?'#careNotice':'#receptionNotice');noticeEl.innerHTML='';
   try{const result=await api(isCare?'/api/care-requests':'/api/reception-requests',{method:'POST',body:JSON.stringify(formObject(form))});noticeEl.innerHTML=notice(result.message+' Reference: '+result.request.reference,'success');form.reset();$('#countryCode').value=state.config.callingCode||'';}
   catch(error){showFormError(noticeEl,error);}return;
  }
  if(form.id==='adminLogin'){
   const noticeEl=$('#adminLoginNotice');noticeEl.innerHTML='';
   try{await api('/api/admin/login',{method:'POST',body:JSON.stringify(formObject(form))});state.admin=true;toast('Administrator signed in.');await loadAdminRecords();render();}
   catch(error){showFormError(noticeEl,error);}return;
  }
  if(form.id==='settingsForm'){
   const raw=formObject(form);
   const departments=raw.departments.split('\n').map(x=>x.trim()).filter(Boolean);
   const doctors=raw.doctors.split('\n').map(line=>{const p=line.split('|');return{name:(p[0]||'').trim(),department:(p[1]||'').trim()};}).filter(x=>x.name&&x.department);
   const payload={...raw,departments,doctors,appointmentSlots:raw.appointmentSlots.split(',').map(x=>x.trim()).filter(Boolean),voiceRate:Number(raw.voiceRate)};
   const noticeEl=$('#settingsNotice');noticeEl.innerHTML='';
   try{await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(payload)});await refreshConfig();noticeEl.innerHTML=notice('Settings saved successfully.','success');render();}
   catch(error){showFormError(noticeEl,error);}return;
  }
 });
}
document.addEventListener('keydown',e=>{
 if(state.page==='voice'&&['1','2','3','4'].includes(e.key)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){
  const b=$('[data-ivr="'+e.key+'"]');if(b)b.click();
 }
 if(e.key==='Escape')$('#sidebar').classList.remove('open');
});
document.addEventListener('click',e=>{
 if(e.target.closest('[data-action="print-confirmation"]'))window.print();
});
async function init(){
 try{await refreshConfig();bindNavigation();render();try{await api('/api/admin/session');state.admin=true;}catch(_){}if(state.admin&&state.page==='admin')loadAdminRecords();}
 catch(error){$('#pageContent').innerHTML=notice('The application could not load its configuration. Please refresh the page.','error');}
}
init();
})();
</script>
</body>
</html>`;



app.get('/', (req, res) => {
  res.type('html').send(HTML);
});



// Temporary read-only Dataverse appointment metadata diagnostic
app.get('/api/internal/dataverse-schema', async (req, res) => {
  try {
    const expectedToken = process.env.EXOTEL_WEBHOOK_TOKEN || '';
    const suppliedToken = String(req.headers['x-diagnostics-token'] || '');

    if (!expectedToken || !suppliedToken || !safeEqual(expectedToken, suppliedToken)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tenantId = process.env.DATAVERSE_TENANT_ID || '';
    const clientId = process.env.DATAVERSE_CLIENT_ID || '';
    const clientSecret = process.env.DATAVERSE_CLIENT_SECRET || '';
    const dataverseUrl = (process.env.DATAVERSE_URL || '').replace(/\/$/, '');

    if (!tenantId || !clientId || !clientSecret || !dataverseUrl) {
      return res.status(503).json({
        error: 'Dataverse environment variables are incomplete.',
        configured: {
          tenantId: Boolean(tenantId),
          clientId: Boolean(clientId),
          clientSecret: Boolean(clientSecret),
          dataverseUrl: Boolean(dataverseUrl)
        }
      });
    }

    const authResponse = await fetch(
      'https://login.microsoftonline.com/' +
        encodeURIComponent(tenantId) +
        '/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: dataverseUrl + '/.default'
        })
      }
    );

    const authBody = await authResponse.json();

    if (!authResponse.ok || !authBody.access_token) {
      console.error('Dataverse diagnostic authentication failed:', authResponse.status);
     return res.status(502).json({
  error: 'Dataverse authentication failed.',
  status: authResponse.status,
  aadError: authBody.error || null,
  aadErrorDescription: authBody.error_description || null
});
    }

    const headers = {
      Authorization: 'Bearer ' + authBody.access_token,
      Accept: 'application/json',
      'OData-Version': '4.0',
      'OData-MaxVersion': '4.0'
    };

    async function readMetadata(path) {
      const response = await fetch(
        dataverseUrl + '/api/data/v9.2/' + path,
        { headers }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          'Metadata request failed (' + response.status + '): ' +
          (body.error?.message || 'Unknown Dataverse error')
        );
      }

      return body;
    }

    const entityPath =
      "EntityDefinitions(LogicalName='msemr_appointmentemr')";

const [attributes, lookups, relationships, statusMetadata] =
  await Promise.all([
    readMetadata(
      entityPath +
      "/Attributes?$select=LogicalName,SchemaName,AttributeType,IsValidForCreate,RequiredLevel,DisplayName"
    ),

    readMetadata(
      entityPath +
      "/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,SchemaName,Targets,IsValidForCreate,RequiredLevel"
    ),

    readMetadata(
      entityPath +
      "/ManyToOneRelationships?$select=SchemaName,ReferencingAttribute,ReferencedEntity,ReferencingEntityNavigationPropertyName,ReferencedEntityNavigationPropertyName"
    ),

    readMetadata(
      entityPath +
      "/Attributes(LogicalName='msemr_appointmentstatus')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)"
    )
  ]);

    const relevantNames = new Set([
      'subject',
      'description',
      'scheduledstart',
      'scheduledend',
      'msemr_starttime',
      'msemr_appointmentstatus',
      'msemr_actorpatient',
      'msemr_actorpractitioner',
      'msemr_actorlocation'
    ]);

    const fields = (attributes.value || [])
      .filter(field => relevantNames.has(field.LogicalName))
      .map(field => ({
        logicalName: field.LogicalName,
        schemaName: field.SchemaName,
        type: field.AttributeType,
        validForCreate: field.IsValidForCreate,
        requiredLevel: field.RequiredLevel?.Value || null,
        displayName:
          field.DisplayName?.UserLocalizedLabel?.Label || null
      }));

    const lookupFields = (lookups.value || []).map(field => ({
      logicalName: field.LogicalName,
      schemaName: field.SchemaName,
      targets: field.Targets || [],
      validForCreate: field.IsValidForCreate,
      requiredLevel: field.RequiredLevel?.Value || null
    }));

    console.log('Dataverse appointment metadata diagnostic completed.');

    const requiredLookups = new Set([
  'msemr_actorpatient',
  'msemr_actorpractitioner',
  'msemr_actorlocation'
]);

const navigationProperties = (relationships.value || [])
  .filter(item =>
    requiredLookups.has(item.ReferencingAttribute)
  )
  .map(item => ({
    attribute: item.ReferencingAttribute,
    targetEntity: item.ReferencedEntity,
    navigationProperty:
      item.ReferencingEntityNavigationPropertyName
  }));

const appointmentStatusOptions =
  (statusMetadata.OptionSet?.Options || []).map(option => ({
    value: option.Value,
    label:
      option.Label?.UserLocalizedLabel?.Label || null
  }));
    
    return res.json({
  entity: 'msemr_appointmentemr',
  fields,
  lookups: lookupFields,
  navigationProperties,
  appointmentStatusOptions
});

  } catch (error) {
    console.error('Dataverse metadata diagnostic error:', error.message);
    return res.status(500).json({
      error: 'Could not read appointment metadata.',
      details: error.message
    });
  }
});



// Exotel Gather / Passthru integration
const exotelCallSessions = new Map();

app.get('/api/exotel/gather', (req, res) => {
  try {
    const expectedToken = process.env.EXOTEL_WEBHOOK_TOKEN || '';
    const suppliedToken = String(req.query.key || '');

    if (
      !expectedToken ||
      !suppliedToken ||
      !safeEqual(expectedToken, suppliedToken)
    ) {
      return res.status(401).type('text').send('Unauthorized');
    }

    const callSid = cleanString(req.query.CallSid, 150);
    const stage = cleanString(req.query.stage, 20).toLowerCase();

    // Exotel incoming caller number
    const callerNumber = cleanString(
      req.query.CallFrom || req.query.From,
      30
    ).replace(/[^\d+]/g, '');

    // Gather input
    const digits = String(req.query.digits || '')
      .replace(/^["']|["']$/g, '')
      .replace(/\D/g, '');

    if (!callSid || !digits || !isPhone(callerNumber)) {
      return res.status(400).type('text').send('Missing call data');
    }

    if (!['date', 'time', 'mobile'].includes(stage)) {
      return res.status(400).type('text').send('Invalid stage');
    }

    if (stage === 'date' && !/^\d{8}$/.test(digits)) {
      return res.status(400).type('text').send('Invalid date');
    }

    if (
      stage === 'time' &&
      !/^(?:[01]\d|2[0-3])[0-5]\d$/.test(digits)
    ) {
      return res.status(400).type('text').send('Invalid time');
    }

    if (stage === 'mobile' && (digits.length < 10 || digits.length > 15)) {
      return res.status(400).type('text').send('Invalid mobile number');
    }

    const now = Date.now();

    // Remove expired sessions
    for (const [id, session] of exotelCallSessions.entries()) {
      if (now - session.updatedAt > 30 * 60 * 1000) {
        exotelCallSessions.delete(id);
      }
    }

    if (
      !exotelCallSessions.has(callSid) &&
      exotelCallSessions.size >= 2000
    ) {
      return res.status(503).type('text').send('Call capacity reached');
    }

    const session = exotelCallSessions.get(callSid) || {
      callSid,
      mobile: '',
      date: '',
      time: '',
      createdAt: now
    };

    // Save caller number from incoming call
    session.mobile = callerNumber;

    // Save Gather input according to stage
    session[stage] = digits;
    session.updatedAt = now;

    exotelCallSessions.set(callSid, session);

    console.log('Exotel input received:', {
      callSid,
      stage,
      hasCallerNumber: Boolean(session.mobile),
      hasDate: Boolean(session.date),
      hasTime: Boolean(session.time)
    });

    return res.status(200).type('text').send('OK');

  } catch (error) {
    console.error('Exotel Gather webhook error:', error.message);
    return res.status(500).type('text').send('Internal error');
  }
});


app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});


const server = app.listen(PORT, () => {
  console.log(`CulturaMed Healthcare is running on port ${PORT}`);
  if (!ADMIN_PASSWORD) console.warn('ADMIN_PASSWORD is not configured; administrative sign-in is disabled.');
  console.warn('Storage mode: in-memory only. Do not use real patient data.');
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
