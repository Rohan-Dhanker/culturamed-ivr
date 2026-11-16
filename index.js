
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CulturaMed Healthcare</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#f2f6fa;color:#243b53;font-family:Segoe UI,Arial,sans-serif}
header{background:linear-gradient(110deg,#102a43,#176b87);color:white;padding:20px 5%;display:flex;justify-content:space-between;align-items:center}
.brand{font-size:22px;font-weight:800}
.brand small{display:block;font-size:12px;font-weight:400;color:#c9e6ee;margin-top:3px}
.pill{border:1px solid #ffffff66;border-radius:20px;padding:7px 13px;font-size:12px}
.container{max-width:1250px;margin:26px auto;padding:0 18px}
.hero{background:linear-gradient(120deg,#e0f2f3,#f6fbfc);border:1px solid #cce5e7;border-radius:19px;padding:27px;margin-bottom:20px}
.eyebrow{font-size:11px;letter-spacing:1.4px;font-weight:800;color:#176b87}
.hero h1{font-size:30px;color:#102a43;margin:9px 0}
.hero p,.muted{color:#627d98}
.hero p{margin:0}
.layout{display:grid;grid-template-columns:235px 1fr;gap:18px}
.sidebar,.panel{background:white;border:1px solid #d9e5ec;border-radius:16px;box-shadow:0 7px 24px #102a4310}
.sidebar{padding:12px;height:max-content}
.nav{width:100%;border:0;background:white;text-align:left;padding:13px;border-radius:9px;color:#486581;cursor:pointer;margin:2px 0;font-size:14px}
.nav:hover,.nav.active{background:#e8f7f5;color:#116b75;font-weight:700}
.panel{padding:24px;min-height:500px}
h2{color:#102a43;margin:5px 0}
h3{color:#243b53}
.muted{font-size:13px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.field{margin:12px 0}
.field label{display:block;font-size:12px;font-weight:700;color:#486581;margin-bottom:6px}
.field input,.field select,.field textarea{width:100%;padding:11px;border:1px solid #cbd8e2;border-radius:9px;font:inherit;background:white}
.field textarea{min-height:80px;resize:vertical}
.btn{background:#176b87;color:white;border:0;border-radius:9px;padding:11px 16px;font-weight:700;cursor:pointer}
.btn:hover{filter:brightness(.93)}
.btn.alt{background:#eaf2f6;color:#31566d}
.btn.danger{background:#fff0f0;color:#b8323c}
.row{display:flex;gap:9px;flex-wrap:wrap}
.card{border:1px solid #d9e5ec;border-radius:13px;padding:16px;margin:12px 0}
.notice{background:#edf8f5;border:1px solid #ccebe1;color:#176b5c;padding:13px;border-radius:10px;margin:13px 0}
.warning{background:#fff8e8;border-color:#f3dfb4;color:#8a5a12}
.voice{background:linear-gradient(120deg,#102a43,#176b87);color:white;padding:21px;border-radius:15px;margin-bottom:20px}
.voice h2{color:white}
.voice p{color:#d5e9ef;font-size:13px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.stat{background:white;border:1px solid #d9e5ec;border-radius:13px;padding:16px}
.stat strong{display:block;font-size:27px;color:#102a43}
.stat small{color:#627d98}
.tablewrap{overflow:auto;border:1px solid #d9e5ec;border-radius:10px;margin:12px 0}
table{border-collapse:collapse;width:100%;min-width:550px}
th,td{text-align:left;padding:11px;border-bottom:1px solid #edf2f6;font-size:13px}
th{background:#f5f9fb;color:#627d98;font-size:11px}
.empty{text-align:center;color:#627d98;padding:25px}
.footer{text-align:center;color:#829ab1;font-size:11px;padding:20px}
@media(max-width:750px){
.layout{grid-template-columns:1fr}
.sidebar{display:flex;overflow-x:auto;gap:3px}
.nav{white-space:nowrap;width:auto}
.grid,.stats{grid-template-columns:1fr}
.hero h1{font-size:24px}
.panel{padding:16px}
.pill{display:none}
}
</style>
</head>
<body>
<header>
<div class="brand">✚ CulturaMed Healthcare<small>Patient Voice & Care Experience</small></div>
<span class="pill">DEMO ENVIRONMENT</span>
</header>
<div class="container">
<section class="hero">
<div class="eyebrow">CONNECTED PATIENT EXPERIENCE</div>
<h1>Care that listens. Service that responds.</h1>
<p>Explore appointment management, patient follow-ups and clinic reception services.</p>
</section>
<div class="layout">
<aside class="sidebar">
<button class="nav active" data-page="home">⌂ Overview</button>
<button class="nav" data-page="book">＋ Book Appointment</button>
<button class="nav" data-page="manage">▤ My Appointments</button>
<button class="nav" data-page="care">♡ Care & Follow-up</button>
<button class="nav" data-page="reception">☏ Reception Desk</button>
<button class="nav" data-page="clinic">✚ Clinic Information</button>
<button class="nav" data-page="admin">▦ Admin Dashboard</button>
</aside>
<main class="panel" id="view"></main>
</div>
<div class="footer">CulturaMed Healthcare · Demonstration only · Not for emergency use</div>
</div>
<script>
"use strict";

function getData(key){
try{return JSON.parse(localStorage.getItem("cm_"+key)||"[]");}
catch(e){return [];}
}
function saveData(key,data){
localStorage.setItem("cm_"+key,JSON.stringify(data));
}
function esc(value){
return String(value==null?"":value).replace(/[&<>"']/g,function(c){
return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
});
}
function speak(message){
if(!("speechSynthesis" in window)){alert("Voice playback is not supported in this browser.");return;}
stopVoice();
var u=new SpeechSynthesisUtterance(message);
u.lang="en-IN";
u.rate=0.95;
window.speechSynthesis.speak(u);
}
function stopVoice(){
if("speechSynthesis" in window){window.speechSynthesis.cancel();}
}
function today(){
var d=new Date();
var offset=d.getTimezoneOffset();
return new Date(d.getTime()-offset*60000).toISOString().slice(0,10);
}
function showPage(page){
document.querySelectorAll(".nav").forEach(function(b){
b.classList.toggle("active",b.dataset.page===page);
});
var view=document.getElementById("view");

if(page==="home"){
view.innerHTML=
'<div class="voice"><div class="eyebrow" style="color:#b8e7e9">CULTURAMED VOICE ASSISTANT</div>'+
'<h2>Welcome to CulturaMed</h2>'+
'<p>How can we help you today? Choose a service or listen to the welcome greeting.</p>'+
'<div class="row"><button class="btn" onclick="speak(\'Welcome to CulturaMed Healthcare. How may we assist you today?\')">▶ Play Greeting</button>'+
'<button class="btn alt" onclick="stopVoice()">■ Stop Voice</button></div></div>'+
'<h2>Patient Services</h2><p class="muted">Select a service to continue.</p>'+
'<div class="grid">'+
'<div class="card"><h3>＋ Appointment Booking</h3><p class="muted">Request a doctor appointment.</p><button class="btn" onclick="showPage(\'book\')">Book Now</button></div>'+
'<div class="card"><h3>▤ My Appointments</h3><p class="muted">Find, reschedule or cancel demo requests.</p><button class="btn" onclick="showPage(\'manage\')">Manage</button></div>'+
'<div class="card"><h3>♡ Care & Follow-up</h3><p class="muted">Submit follow-up requests.</p><button class="btn" onclick="showPage(\'care\')">Continue</button></div>'+
'<div class="card"><h3>☏ Reception Desk</h3><p class="muted">Request a reception callback.</p><button class="btn" onclick="showPage(\'reception\')">Contact Reception</button></div>'+
'</div><div class="notice warning">Demo only: do not enter real or sensitive patient information. Data is stored in this browser.</div>';
}

if(page==="book"){
view.innerHTML=
'<h2>Book an Appointment</h2><p class="muted">Enter details to create a demo appointment request.</p>'+
'<form id="bookingForm"><div class="grid">'+
'<div class="field"><label>Patient Full Name *</label><input name="name" required maxlength="80" placeholder="Enter full name"></div>'+
'<div class="field"><label>Mobile Number *</label><input name="mobile" required pattern="[0-9]{10}" maxlength="10" inputmode="numeric" placeholder="10-digit number"></div>'+
'<div class="field"><label>Email Address</label><input name="email" type="email" maxlength="100" placeholder="name@example.com"></div>'+
'<div class="field"><label>Department *</label><select name="department" id="department" required><option value="">Select department</option><option>General Medicine</option><option>Cardiology</option><option>Neurology</option><option>Orthopaedics</option><option>Paediatrics</option><option>Dermatology</option></select></div>'+
'<div class="field"><label>Doctor *</label><select name="doctor" id="doctor" required><option value="">Select department first</option></select></div>'+
'<div class="field"><label>Preferred Date *</label><input name="date" type="date" id="appointmentDate" required min="'+today()+'"></div>'+
'<div class="field"><label>Preferred Time *</label><select name="time" required><option value="">Select time</option><option>09:00 AM</option><option>10:00 AM</option><option>11:00 AM</option><option>12:00 PM</option><option>02:00 PM</option><option>03:00 PM</option><option>04:00 PM</option><option>05:00 PM</option></select></div>'+
'<div class="field"><label>Reason for Visit</label><input name="reason" maxlength="150" placeholder="Brief reason"></div>'+
'</div><div class="notice warning">Use sample details only. This is not a real clinic booking.</div>'+
'<button class="btn" type="submit">Confirm Demo Appointment</button></form><div id="bookingResult"></div>';

var doctors={
"General Medicine":["Dr. Amit Sharma","Dr. Neha Verma"],
"Cardiology":["Dr. Rajiv Mehta","Dr. Pooja Kapoor"],
"Neurology":["Dr. Arjun Rao","Dr. Simran Kaur"],
"Orthopaedics":["Dr. Vikram Singh","Dr. Ananya Das"],
"Paediatrics":["Dr. Ritu Malhotra","Dr. Karan Joshi"],
"Dermatology":["Dr. Meera Nair","Dr. Rahul Bansal"]
};
document.getElementById("department").addEventListener("change",function(){
var select=document.getElementById("doctor");
select.innerHTML='<option value="">Select doctor</option>';
(doctors[this.value]||[]).forEach(function(name){
var opt=document.createElement("option");
opt.value=name;opt.textContent=name;select.appendChild(opt);
});
});
document.getElementById("bookingForm").addEventListener("submit",function(e){
e.preventDefault();
var data=Object.fromEntries(new FormData(this).entries());
if(!/^[0-9]{10}$/.test(data.mobile)){alert("Enter a valid 10-digit mobile number.");return;}
if(data.date<today()){alert("Select today or a future date.");return;}
data.id="CM"+Date.now().toString().slice(-8);
data.status="Requested";
data.createdAt=new Date().toLocaleString();
var list=getData("appointments");
list.push(data);saveData("appointments",list);
document.getElementById("bookingResult").innerHTML=
'<div class="notice"><h3>✓ Demo Appointment Request Saved</h3>'+
'<p>Reference: <strong>'+esc(data.id)+'</strong></p>'+
'<p>Patient: '+esc(data.name)+'</p><p>Doctor: '+esc(data.doctor)+'</p>'+
'<p>Date: '+esc(data.date)+' · '+esc(data.time)+'</p><p>Status: Requested (Demo)</p></div>';
this.reset();
document.getElementById("doctor").innerHTML='<option value="">Select department first</option>';
speak("Your demo appointment request has been saved. Reference number "+data.id);
});
}

if(page==="manage"){
view.innerHTML=
'<h2>My Appointments</h2><p class="muted">Search using the mobile number entered with the request.</p>'+
'<div class="field"><label>Registered Mobile Number</label><input id="searchMobile" maxlength="10" inputmode="numeric" placeholder="10-digit mobile number"></div>'+
'<button class="btn" onclick="searchAppointments()">Search Appointments</button><div id="appointmentResults"></div>';
}

if(page==="care"){
view.innerHTML=
'<h2>Care Plan & Follow-up</h2><p class="muted">Submit a follow-up or general service request.</p>'+
'<form id="careForm"><div class="grid">'+
'<div class="field"><label>Patient Name *</label><input name="name" required maxlength="80"></div>'+
'<div class="field"><label>Mobile Number *</label><input name="mobile" required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"></div>'+
'<div class="field"><label>Request Type *</label><select name="type" required><option value="">Select request</option><option>Follow-up Appointment</option><option>Prescription Query</option><option>General Care Query</option><option>Test Report Query</option></select></div>'+
'<div class="field"><label>Preferred Contact Date</label><input name="date" type="date" min="'+today()+'"></div></div>'+
'<div class="field"><label>Message *</label><textarea name="message" required maxlength="500" placeholder="Describe your request"></textarea></div>'+
'<div class="notice warning">Do not enter medical records or sensitive information in this demo.</div>'+
'<button class="btn">Submit Demo Request</button></form><div id="careResult"></div>';
document.getElementById("careForm").addEventListener("submit",function(e){
e.preventDefault();
var data=Object.fromEntries(new FormData(this).entries());
if(!/^[0-9]{10}$/.test(data.mobile)){alert("Enter a valid 10-digit mobile number.");return;}
data.id="CARE"+Date.now().toString().slice(-7);
data.createdAt=new Date().toLocaleString();
var list=getData("careRequests");list.push(data);saveData("careRequests",list);
document.getElementById("careResult").innerHTML='<div class="notice">✓ Request saved. Reference: <strong>'+esc(data.id)+'</strong></div>';
this.reset();speak("Your care request has been saved.");
});
}

if(page==="reception"){
view.innerHTML=
'<h2>Reception Desk</h2><p class="muted">Request a callback from the sample clinic reception team.</p>'+
'<form id="callbackForm"><div class="grid">'+
'<div class="field"><label>Patient Name *</label><input name="name" required maxlength="80"></div>'+
'<div class="field"><label>Mobile Number *</label><input name="mobile" required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"></div>'+
'<div class="field"><label>Preferred Time *</label><select name="time" required><option value="">Select time</option><option>Morning (9 AM - 12 PM)</option><option>Afternoon (12 PM - 3 PM)</option><option>Evening (3 PM - 6 PM)</option></select></div>'+
'<div class="field"><label>Reason for Callback *</label><select name="reason" required><option value="">Select reason</option><option>Appointment Enquiry</option><option>Billing Enquiry</option><option>Doctor Availability</option><option>General Enquiry</option><option>Other</option></select></div></div>'+
'<div class="field"><label>Additional Message</label><textarea name="message" maxlength="500"></textarea></div>'+
'<button class="btn">Submit Callback Request</button></form><div id="callbackResult"></div>';
document.getElementById("callbackForm").addEventListener("submit",function(e){
e.preventDefault();
var data=Object.fromEntries(new FormData(this).entries());
if(!/^[0-9]{10}$/.test(data.mobile)){alert("Enter a valid 10-digit mobile number.");return;}
data.id="CALL"+Date.now().toString().slice(-7);
data.createdAt=new Date().toLocaleString();
var list=getData("callbacks");list.push(data);saveData("callbacks",list);
document.getElementById("callbackResult").innerHTML='<div class="notice">✓ Callback request saved. Reference: <strong>'+esc(data.id)+'</strong></div>';
this.reset();speak("Your callback request has been saved.");
});
}

if(page==="clinic"){
view.innerHTML=
'<h2>Clinic Information</h2><p class="muted">Sample information for this demonstration.</p>'+
'<div class="card"><h3>✚ CulturaMed Healthcare Centre</h3><p>Sample address: Main Healthcare Road, New Delhi, India</p><p><strong>Working Hours:</strong> Monday to Saturday, 9 AM – 6 PM</p><p><strong>Sunday:</strong> Closed</p><p><strong>Reception:</strong> Demo contact details not configured</p></div>'+
'<h3>Departments & Doctors</h3><div class="grid">'+
'<div class="card"><strong>General Medicine</strong><p class="muted">Dr. Amit Sharma · Dr. Neha Verma</p></div>'+
'<div class="card"><strong>Cardiology</strong><p class="muted">Dr. Rajiv Mehta · Dr. Pooja Kapoor</p></div>'+
'<div class="card"><strong>Neurology</strong><p class="muted">Dr. Arjun Rao · Dr. Simran Kaur</p></div>'+
'<div class="card"><strong>Orthopaedics</strong><p class="muted">Dr. Vikram Singh · Dr. Ananya Das</p></div>'+
'<div class="card"><strong>Paediatrics</strong><p class="muted">Dr. Ritu Malhotra · Dr. Karan Joshi</p></div>'+
'<div class="card"><strong>Dermatology</strong><p class="muted">Dr. Meera Nair · Dr. Rahul Bansal</p></div></div>'+
'<div class="notice warning">Clinic details, doctors and schedules are sample data, not verified operating clinic information.</div>';
}

if(page==="admin"){
var a=getData("appointments"),c=getData("callbacks"),r=getData("careRequests");
var appointmentRows=a.map(function(x){
return "<tr><td>"+esc(x.id)+"</td><td>"+esc(x.name)+"</td><td>"+esc(x.doctor)+"</td><td>"+esc(x.date)+"</td><td>"+esc(x.status)+"</td></tr>";
}).join("");
var callbackRows=c.map(function(x){
return "<tr><td>"+esc(x.id)+"</td><td>"+esc(x.name)+"</td><td>"+esc(x.mobile)+"</td><td>"+esc(x.reason)+"</td></tr>";
}).join("");
var careRows=r.map(function(x){
return "<tr><td>"+esc(x.id)+"</td><td>"+esc(x.name)+"</td><td>"+esc(x.mobile)+"</td><td>"+esc(x.type)+"</td></tr>";
}).join("");
view.innerHTML=
'<h2>Admin Dashboard</h2><p class="muted">Requests saved in this browser only.</p>'+
'<div class="stats"><div class="stat"><strong>'+a.length+'</strong><small>Appointment Requests</small></div>'+
'<div class="stat"><strong>'+c.length+'</strong><small>Callback Requests</small></div>'+
'<div class="stat"><strong>'+r.length+'</strong><small>Care Requests</small></div></div>'+
'<h3 style="margin-top:25px">Appointment Requests</h3>'+
(a.length?'<div class="tablewrap"><table><thead><tr><th>Reference</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead><tbody>'+appointmentRows+'</tbody></table></div>':'<div class="empty">No appointment requests yet.</div>')+
'<h3>Callback Requests</h3>'+
(c.length?'<div class="tablewrap"><table><thead><tr><th>Reference</th><th>Patient</th><th>Mobile</th><th>Reason</th></tr></thead><tbody>'+callbackRows+'</tbody></table></div>':'<div class="empty">No callback requests yet.</div>')+
'<h3>Care Requests</h3>'+
(r.length?'<div class="tablewrap"><table><thead><tr><th>Reference</th><th>Patient</th><th>Mobile</th><th>Type</th></tr></thead><tbody>'+careRows+'</tbody></table></div>':'<div class="empty">No care requests yet.</div>')+
'<button class="btn alt" onclick="showPage(\'home\')">Back to Overview</button>';
}
}

document.querySelectorAll(".nav").forEach(function(button){
button.addEventListener("click",function(){showPage(button.dataset.page);});
});
showPage("home");
</script>
</body>
</html>`);
});

app.listen(PORT, () => {
console.log("CulturaMed Healthcare running on port " + PORT);
});
