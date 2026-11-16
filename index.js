
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CulturaMed Healthcare</title>
<style>
:root{--navy:#102a43;--blue:#176b87;--teal:#168b8b;--ink:#243b53;--muted:#627d98;--line:#d9e5ec;--bg:#f3f7fa}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Segoe UI,Arial,sans-serif}button,input,select,textarea{font:inherit}button{cursor:pointer}
header{background:linear-gradient(110deg,var(--navy),var(--blue));color:#fff;padding:18px 5%;display:flex;justify-content:space-between;align-items:center}.brand{font-size:21px;font-weight:800}.brand small{display:block;font-size:12px;font-weight:400;color:#d3e9ef}.pill{border:1px solid #ffffff66;border-radius:20px;padding:7px 12px;font-size:12px}
.wrap{max-width:1240px;margin:25px auto;padding:0 18px}.hero{background:linear-gradient(120deg,#e2f3f4,#f7fbfc);border:1px solid #cce5e7;border-radius:19px;padding:25px;margin-bottom:18px}.eyebrow{font-size:11px;letter-spacing:1.3px;font-weight:800;color:var(--blue)}.hero h1{font-size:29px;color:var(--navy);margin:8px 0}.hero p{margin:0;color:var(--muted)}
.layout{display:grid;grid-template-columns:235px 1fr;gap:18px}.sidebar,.panel{background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 8px 25px #102a4310}.sidebar{padding:12px;height:max-content}.nav{display:block;width:100%;border:0;background:#fff;text-align:left;padding:13px;border-radius:9px;color:#486581;margin:2px 0}.nav:hover,.nav.active{background:#e8f7f5;color:#116b75;font-weight:700}.panel{padding:24px;min-height:510px}h2{color:var(--navy);margin:4px 0}h3{color:var(--navy);margin:5px 0}.muted{color:var(--muted);font-size:13px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field{margin:12px 0}.field label{display:block;font-size:12px;font-weight:700;color:#486581;margin-bottom:6px}.field input,.field select,.field textarea{width:100%;padding:11px;border:1px solid #cbd8e2;border-radius:9px;background:#fff}.field textarea{min-height:75px}.btn{background:var(--blue);color:white;border:0;border-radius:9px;padding:11px 16px;font-weight:700}.btn.alt{background:#eaf2f6;color:#31566d}.btn.danger{background:#fff0f0;color:#b8323c}.row{display:flex;gap:9px;flex-wrap:wrap}.card{border:1px solid var(--line);border-radius:13px;padding:16px;margin:12px 0}.notice{background:#edf8f5;border:1px solid #ccebe1;color:#176b5c;padding:13px;border-radius:10px;margin:13px 0}.warn{background:#fff8e8;border-color:#f3dfb4;color:#8a5a12}.voice{background:linear-gradient(120deg,var(--navy),var(--blue));color:#fff;padding:20px;border-radius:15px;margin-bottom:18px}.voice h2{color:#fff}.voice p{color:#d5e9ef}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.stat{border:1px solid var(--line);border-radius:13px;padding:15px}.stat strong{display:block;font-size:26px;color:var(--navy)}.stat small{color:var(--muted)}.tablewrap{overflow:auto;border:1px solid var(--line);border-radius:10px;margin:12px 0}table{border-collapse:collapse;width:100%;min-width:550px}th,td{text-align:left;padding:11px;border-bottom:1px solid #edf2f6;font-size:13px}th{background:#f5f9fb;color:var(--muted);font-size:11px}.empty{text-align:center;color:var(--muted);padding:25px}.footer{text-align:center;color:#829ab1;font-size:11px;padding:20px}
@media(max-width:750px){.layout{grid-template-columns:1fr}.sidebar{display:flex;overflow-x:auto;gap:3px}.nav{white-space:nowrap;width:auto}.grid,.stats{grid-template-columns:1fr}.hero h1{font-size:24px}.panel{padding:16px}.pill{display:none}}
</style></head>
<body>
<header><div class="brand">✚ CulturaMed Healthcare<small>Patient Voice &amp; Care Experience</small></div><span class="pill">DEMO ENVIRONMENT</span></header>
<div class="wrap"><section class="hero"><div class="eyebrow">CONNECTED PATIENT EXPERIENCE</div><h1>Care that listens. Service that responds.</h1><p>Appointment management, patient follow-ups and clinic reception services.</p></section>
<div class="layout"><aside class="sidebar">
<button class="nav active" data-page="home">⌂ Overview</button><button class="nav" data-page="book">＋ Book Appointment</button><button class="nav" data-page="manage">▤ My Appointments</button><button class="nav" data-page="care">♡ Care &amp; Follow-up</button><button class="nav" data-page="reception">☏ Reception Desk</button><button class="nav" data-page="clinic">✚ Clinic Information</button><button class="nav" data-page="admin">▦ Admin Dashboard</button>
</aside><main class="panel" id="view"></main></div><div class="footer">CulturaMed Healthcare · Demo only · Not for emergency use</div></div>
<script>
'use strict';
var view=document.getElementById('view');
var doctors={"General Medicine":["Dr. Amit Sharma","Dr. Neha Verma"],"Cardiology":["Dr. Rajiv Mehta","Dr. Pooja Kapoor"],"Neurology":["Dr. Arjun Rao","Dr. Simran Kaur"],"Orthopaedics":["Dr. Vikram Singh","Dr. Ananya Das"],"Paediatrics":["Dr. Ritu Malhotra","Dr. Karan Joshi"],"Dermatology":["Dr. Meera Nair","Dr. Rahul Bansal"]};

function read(key){try{return JSON.parse(localStorage.getItem('cm_'+key)||'[]')}catch(e){return []}}
function save(key,data){localStorage.setItem('cm_'+key,JSON.stringify(data))}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function today(){var d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function speak(message){if(!('speechSynthesis'in window)){alert('Voice playback is not supported in this browser.');return}window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(message);u.lang='en-IN';u.rate=.95;window.speechSynthesis.speak(u)}
function stopVoice(){if('speechSynthesis'in window)window.speechSynthesis.cancel()}

function setPage(page){
document.querySelectorAll('.nav').forEach(function(b){b.classList.toggle('active',b.dataset.page===page)});

if(page==='home'){
view.innerHTML='<div class="voice"><div class="eyebrow" style="color:#b8e7e9">CULTURAMED VOICE ASSISTANT</div><h2>Welcome to CulturaMed</h2><p>How can we help you today? Choose a service or listen to the welcome greeting.</p><div class="row"><button class="btn" data-action="greeting">▶ Play Greeting</button><button class="btn alt" data-action="stop">■ Stop Voice</button></div></div><h2>Patient Services</h2><p class="muted">Select a service to continue.</p><div class="grid"><div class="card"><h3>＋ Appointment Booking</h3><p class="muted">Request a doctor appointment.</p><button class="btn" data-page="book">Book Now</button></div><div class="card"><h3>▤ My Appointments</h3><p class="muted">Find, reschedule or cancel demo requests.</p><button class="btn" data-page="manage">Manage</button></div><div class="card"><h3>♡ Care &amp; Follow-up</h3><p class="muted">Submit follow-up requests.</p><button class="btn" data-page="care">Continue</button></div><div class="card"><h3>☏ Reception Desk</h3><p class="muted">Request a reception callback.</p><button class="btn" data-page="reception">Contact Reception</button></div></div><div class="notice warn">Demo only: do not enter real or sensitive patient information. Data is stored in this browser.</div>';
}

if(page==='book'){
view.innerHTML='<h2>Book an Appointment</h2><p class="muted">Enter sample details to create a demo appointment request.</p><form id="bookingForm"><div class="grid"><div class="field"><label>Patient Full Name *</label><input name="name" required maxlength="80"></div><div class="field"><label>Mobile Number *</label><input name="mobile" required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"></div><div class="field"><label>Email Address</label><input name="email" type="email" maxlength="100"></div><div class="field"><label>Department *</label><select name="department" id="department" required><option value="">Select department</option><option>General Medicine</option><option>Cardiology</option><option>Neurology</option><option>Orthopaedics</option><option>Paediatrics</option><option>Dermatology</option></select></div><div class="field"><label>Doctor *</label><select name="doctor" id="doctor" required><option value="">Select department first</option></select></div><div class="field"><label>Preferred Date *</label><input name="date" type="date" min="'+today()+'" required></div><div class="field"><label>Preferred Time *</label><select name="time" required><option value="">Select time</option><option>09:00 AM</option><option>10:00 AM</option><option>11:00 AM</option><option>12:00 PM</option><option>02:00 PM</option><option>03:00 PM</option><option>04:00 PM</option><option>05:00 PM</option></select></div><div class="field"><label>Reason for Visit</label><input name="reason" maxlength="150"></div></div><div class="notice warn">Use sample details only. This is not a real clinic booking.</div><button class="btn">Confirm Demo Appointment</button></form><div id="bookingResult"></div>';

document.getElementById('department').addEventListener('change',function(){
var sel=document.getElementById('doctor');sel.innerHTML='<option value="">Select doctor</option>';
(doctors[this.value]||[]).forEach(function(n){var o=document.createElement('option');o.value=n;o.textContent=n;sel.appendChild(o)});
});

document.getElementById('bookingForm').addEventListener('submit',function(e){
e.preventDefault();var d=Object.fromEntries(new FormData(this).entries());
if(!/^[0-9]{10}$/.test(d.mobile)){alert('Enter a valid 10-digit mobile number.');return}
if(d.date<today()){alert('Select today or a future date.');return}
d.id='CM-'+Date.now().toString().slice(-8);d.status='Requested';d.createdAt=new Date().toLocaleString();
var a=read('appointments');a.unshift(d);save('appointments',a);
document.getElementById('bookingResult').innerHTML='<div class="notice"><h3>✓ Demo Appointment Request Saved</h3><p>Reference: <b>'+esc(d.id)+'</b></p><p>Patient: '+esc(d.name)+'</p><p>Doctor: '+esc(d.doctor)+'</p><p>Date: '+esc(d.date)+' · '+esc(d.time)+'</p><p>Status: Requested (Demo)</p></div>';
this.reset();document.getElementById('doctor').innerHTML='<option value="">Select department first</option>';speak('Your demo appointment request has been saved. Reference '+d.id);
});
}

if(page==='manage'){
view.innerHTML='<h2>My Appointments</h2><p class="muted">Search using the mobile number entered with the request.</p><div class="field"><label>Registered Mobile Number</label><input id="searchMobile" maxlength="10" inputmode="numeric" placeholder="10-digit mobile number"></div><button class="btn" data-action="search">Search Appointments</button><div id="appointmentResults"></div>';
}

if(page==='care'){
view.innerHTML='<h2>Care Plan &amp; Follow-up</h2><p class="muted">Submit a follow-up or general service request.</p><form id="careForm"><div class="grid"><div class="field"><label>Patient Name *</label><input name="name" required maxlength="80"></div><div class="field"><label>Mobile Number *</label><input name="mobile" required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"></div><div class="field"><label>Request Type *</label><select name="type" required><option value="">Select request</option><option>Follow-up Appointment</option><option>Prescription Query</option><option>General Care Query</option><option>Test Report Query</option></select></div><div class="field"><label>Preferred Contact Date</label><input name="date" type="date" min="'+today()+'"></div></div><div class="field"><label>Message *</label><textarea name="message" required maxlength="500"></textarea></div><div class="notice warn">Do not enter medical records or sensitive information in this demo.</div><button class="btn">Submit Demo Request</button></form><div id="careResult"></div>';
document.getElementById('careForm').addEventListener('submit',function(e){
e.preventDefault();var d=Object.fromEntries(new FormData(this).entries());
if(!/^[0-9]{10}$/.test(d.mobile)){alert('Enter a valid 10-digit mobile number.');return}
d.id='CARE-'+Date.now().toString().slice(-7);d.createdAt=new Date().toLocaleString();
var a=read('care');a.unshift(d);save('care',a);
document.getElementById('careResult').innerHTML='<div class="notice">✓ Request saved. Reference: <b>'+esc(d.id)+'</b></div>';
this.reset();speak('Your care request has been saved');
});
}

if(page==='reception'){
view.innerHTML='<h2>Reception Desk</h2><p class="muted">Request a callback from the sample clinic reception team.</p><form id="callbackForm"><div class="grid"><div class="field"><label>Patient Name *</label><input name="name" required maxlength="80"></div><div class="field"><label>Mobile Number *</label><input name="mobile" required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"></div><div class="field"><label>Preferred Time *</label><select name="time" required><option value="">Select time</option><option>Morning (9 AM - 12 PM)</option><option>Afternoon (12 PM - 3 PM)</option><option>Evening (3 PM - 6 PM)</option></select></div><div class="field"><label>Reason for Callback *</label><select name="reason" required><option value="">Select reason</option><option>Appointment Enquiry</option><option>Billing Enquiry</option><option>Doctor Availability</option><option>General Enquiry</option><option>Other</option></select></div></div><div class="field"><label>Additional Message</label><textarea name="message" maxlength="500"></textarea></div><button class="btn">Submit Callback Request</button></form><div id="callbackResult"></div>';
document.getElementById('callbackForm').addEventListener('submit',function(e){
e.preventDefault();var d=Object.fromEntries(new FormData(this).entries());
if(!/^[0-9]{10}$/.test(d.mobile)){alert('Enter a valid 10-digit mobile number.');return}
d.id='CALL-'+Date.now().toString().slice(-7);d.createdAt=new Date().toLocaleString();
var a=read('callbacks');a.unshift(d);save('callbacks',a);
document.getElementById('callbackResult').innerHTML='<div class="notice">✓ Callback request saved. Reference: <b>'+esc(d.id)+'</b></div>';
this.reset();speak('Your callback request has been saved');
});
}

if(page==='clinic'){
var html='<h2>Clinic Information</h2><p class="muted">Sample information for this demonstration.</p><div class="card"><h3>✚ CulturaMed Healthcare Centre</h3><p>Sample address: Main Healthcare Road, New Delhi, India</p><p><b>Working Hours:</b> Monday to Saturday, 9 AM – 6 PM</p><p><b>Sunday:</b> Closed</p><p><b>Reception:</b> Demo contact details not configured</p></div><h3>Departments &amp; Doctors</h3><div class="grid">';
Object.keys(doctors).forEach(function(dep){html+='<div class="card"><b>'+esc(dep)+'</b><p class="muted">'+doctors[dep].map(esc).join(' · ')+'</p></div>'});
view.innerHTML=html+'</div><div class="notice warn">Clinic details, doctors and schedules are sample data, not verified operating clinic information.</div>';
}

if(page==='admin'){
var a=read('appointments'),c=read('callbacks'),r=read('care');
view.innerHTML='<h2>Admin Dashboard</h2><p class="muted">Requests saved in this browser only.</p><div class="stats"><div class="stat"><strong>'+a.length+'</strong><small>Appointment Requests</small></div><div class="stat"><strong>'+c.length+'</strong><small>Callback Requests</small></div><div class="stat"><strong>'+r.length+'</strong><small>Care Requests</small></div></div><h3 style="margin-top:22px">Appointment Requests</h3>'+tableAppointments(a)+'<h3>Callback Requests</h3>'+tableCallbacks(c)+'<h3>Care Requests</h3>'+tableCare(r)+'<div class="notice warn">Admin dashboard has no login or role-based security. Do not enter real patient data.</div>';
}
}

function tableAppointments(a){
if(!a.length)return '<div class="empty">No appointment requests yet.</div>';
return '<div class="tablewrap"><table><thead><tr><th>Reference</th><th>Patient</th><th>Mobile</th><th>Doctor</th><th>Date / Time</th><th>Status</th></tr></thead><tbody>'+a.map(function(x){return '<tr><td>'+esc(x.id)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.mobile)+'</td><td>'+esc(x.doctor)+'</td><td>'+esc(x.date)+' '+esc(x.time)+'</td><td>'+esc(x.status)+'</td></tr>'}).join('')+'</tbody></table></div>';
}
function tableCallbacks(a){
if(!a.length)return '<div class="empty">No callback requests yet.</div>';
return '<div class="tablewrap"><table><thead><tr><th>Reference</th><th>Patient</th><th>Mobile</th><th>Reason</th><th>Preferred time</th></tr></thead><tbody>'+a.map(function(x){return '<tr><td>'+esc(x.id)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.mobile)+'</td><td>'+esc(x.reason)+'</td><td>'+esc(x.time)+'</td></tr>'}).join('')+'</tbody></table></div>';
}
function tableCare(a){
if(!a.length)return '<div class="empty">No care requests yet.</div>';
return '<div class="tablewrap"><table><thead><tr><th>Reference</th><th>Patient</th><th>Mobile</th><th>Type</th><th>Date</th></tr></thead><tbody>'+a.map(function(x){return '<tr><td>'+esc(x.id)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.mobile)+'</td><td>'+esc(x.type)+'</td><td>'+esc(x.date)+'</td></tr>'}).join('')+'</tbody></table></div>';
}

function searchAppointments(){
var mobile=document.getElementById('searchMobile').value.trim(),out=document.getElementById('appointmentResults');
if(!/^[0-9]{10}$/.test(mobile)){out.innerHTML='<div class="notice warn">Enter a valid 10-digit mobile number.</div>';return}
var a=read('appointments').filter(function(x){return x.mobile===mobile});
if(!a.length){out.innerHTML='<div class="empty">No appointments found for this mobile number.</div>';return}
out.innerHTML=a.map(function(x){return '<div class="card"><h3>'+esc(x.doctor)+'</h3><p>Reference: '+esc(x.id)+'</p><p>Date: '+esc(x.date)+' · '+esc(x.time)+'</p><p>Status: <b>'+esc(x.status)+'</b></p><div class="row"><button class="btn alt" data-action="reschedule" data-id="'+esc(x.id)+'">Reschedule</button><button class="btn danger" data-action="cancel" data-id="'+esc(x.id)+'">Cancel</button></div></div>'}).join('');
}

function changeAppointment(id,action){
var a=read('appointments'),x=a.find(function(z){return z.id===id});
if(!x)return;
if(action==='cancel'){if(!confirm('Cancel this demo appointment request?'))return;x.status='Cancelled'}
else{
var d=prompt('Enter new date (YYYY-MM-DD)',x.date);if(!d)return;
if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(d)||d<today()||isNaN(Date.parse(d))){alert('Enter a valid today or future date.');return}
var t=prompt('Enter new time',x.time);if(!t)return;
x.date=d;x.time=t;x.status='Reschedule Requested';
}
save('appointments',a);searchAppointments();
}

document.addEventListener('click',function(e){
var p=e.target.closest('[data-page]');
if(p){setPage(p.dataset.page);return}
var a=e.target.closest('[data-action]');
if(!a)return;
if(a.dataset.action==='greeting')speak('Welcome to CulturaMed Healthcare. How may we assist you today?');
if(a.dataset.action==='stop')stopVoice();
if(a.dataset.action==='search')searchAppointments();
if(a.dataset.action==='cancel')changeAppointment(a.dataset.id,'cancel');
if(a.dataset.action==='reschedule')changeAppointment(a.dataset.id,'reschedule');
});

document.querySelectorAll('.nav').forEach(function(b){b.addEventListener('click',function(){setPage(b.dataset.page)})});
setPage('home');
</script></body></html>`);
});

app.listen(PORT, () => console.log("CulturaMed Healthcare running on port " + PORT));
