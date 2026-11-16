
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CulturaMed Healthcare | IVR</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#071426;color:#fff;font-family:Arial,sans-serif}
.container{max-width:850px;margin:45px auto;padding:25px}
.card{background:#10243d;border:1px solid #29415e;border-radius:22px;padding:30px}
.header{text-align:center}
.logo{font-size:42px}
h1{margin:10px 0;color:#65d6c2}
.subtitle{color:#a9bed1}
.status{display:inline-block;background:#123f39;color:#75ebc9;padding:9px 16px;border-radius:30px;margin:18px}
.message{background:#0a192b;padding:22px;border-radius:14px;text-align:center;margin:20px 0;line-height:1.7}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}
button{cursor:pointer;border:1px solid #365573;border-radius:13px;padding:18px;background:#193653;color:white;font-size:16px;text-align:left}
button:hover{background:#235579}
.num{font-size:25px;color:#65d6c2;font-weight:bold;margin-right:12px}
.controls{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}
.controls button{flex:1;text-align:center;background:#087f78}
#response{margin-top:20px;background:#0a192b;padding:20px;border-radius:12px;min-height:65px;line-height:1.6}
.footer{text-align:center;color:#8da4b9;font-size:12px;margin-top:22px}
@media(max-width:550px){.grid{grid-template-columns:1fr}.container{margin:10px auto;padding:12px}}
</style>
</head>
<body>
<div class="container">
<div class="card">
<div class="header">
<div class="logo">✚</div>
<h1>CulturaMed Healthcare</h1>
<div class="subtitle">Patient Voice Assistance System</div>
<div class="status">● IVR DEMO ONLINE</div>
</div>

<div class="message">
<strong>Welcome to CulturaMed Healthcare.</strong><br>
Please select an option using the keypad below.
</div>

<div class="grid">
<button onclick="selectOption('1')"><span class="num">1</span> Appointment Booking</button>
<button onclick="selectOption('2')"><span class="num">2</span> Existing Appointments</button>
<button onclick="selectOption('3')"><span class="num">3</span> Care Plan & Follow-up</button>
<button onclick="selectOption('4')"><span class="num">4</span> Talk to Reception</button>
<button onclick="selectOption('5')"><span class="num">5</span> Clinic Information</button>
</div>

<div class="controls">
<button onclick="welcome()">▶ Play Welcome</button>
<button onclick="repeatMenu()">↻ Repeat Menu</button>
</div>

<div id="response">Your selected option's response will appear here.</div>

<div class="footer">
CulturaMed Healthcare | Demonstration IVR | Local Simulation
</div>
</div>
</div>

<script>
const responses = {
"1": "You selected Appointment Booking. Please contact our reception to schedule a new appointment.",
"2": "You selected Existing Appointments. Please contact our reception for appointment assistance.",
"3": "You selected Care Plan and Follow-up. Please contact your healthcare coordinator for assistance.",
"4": "You selected Talk to Reception. This is a demonstration. Your call is not being transferred to a real person.",
"5": "Welcome to CulturaMed Healthcare. Our clinic provides healthcare services, patient assistance and appointment support. Thank you for calling."
};

function speak(text) {
  if (!("speechSynthesis" in window)) {
    document.getElementById("response").textContent =
      "Voice playback is not supported by this browser.";
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

function welcome() {
  const message = "Welcome to CulturaMed Healthcare. For Appointment Booking, press 1. For Existing Appointments, press 2. For Care Plan and Follow-up, press 3. To Talk to Reception, press 4. For Clinic Information, press 5.";
  document.getElementById("response").textContent = message;
  speak(message);
}

function repeatMenu() {
  welcome();
}

function selectOption(number) {
  const message = responses[number];
  document.getElementById("response").textContent = message;
  speak(message);
}

document.addEventListener("keydown", function(event) {
  if (responses[event.key]) selectOption(event.key);
});
</script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log("CulturaMed IVR running at http://localhost:" + PORT);
});
