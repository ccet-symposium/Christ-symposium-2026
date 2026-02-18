const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJAmNb8SXhXp9PSaScVb15x-zI8R6dBzeesbAKqHQDyF3IiZI_tO2J2mnCrGOZm607/exec"; 
const SECRET = "symposium_secure_2026";

/* ===== REGISTRATION EXPIRY ===== */
const EXPIRY = new Date("2026-02-25T20:00:00+05:30");

function isClosed() {
    return new Date() > EXPIRY;
}

function checkClosed() {
    if (isClosed()) {
        document.body.innerHTML = `
        <div style="
            height:100vh;
            display:flex;
            justify-content:center;
            align-items:center;
            font-family:Arial;
            background:#0f172a;
            color:white;
            text-align:center;
        ">
            <div>
                <h1>Registration Closed ❌</h1>
                <p>Symposium registration closed on<br><b>25 Feb 2026 – 8:00 PM</b></p>
            </div>
        </div>`;
    }
}

let screenshotBase64 = "";
let isVerified = false;

/* ---------- FORM VALIDATION ---------- */
function formValid() {
    const name  = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const college = document.getElementById("college").value.trim();
    const dept = document.getElementById("dept").value.trim();
    const year = document.getElementById("year").value;
    const food = document.getElementById("food").value;

    if (!name || !phone || !email || !college || !dept || !year || !food) {
        alert("Fill all fields ❌");
        return false;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Invalid phone ❌");
        return false;
    }

    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
        alert("Invalid Gmail ❌");
        return false;
    }

    return true;
}

/* ---------- IMAGE ---------- */
document.getElementById("screenshot").addEventListener("change", function(e) {

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(event) {

        const img = new Image();
        img.src = event.target.result;

        img.onload = function() {

            const canvas = document.createElement("canvas");
            const max = 1000;

            let w = img.width, h = img.height;

            if (w > h && w > max) { h *= max/w; w = max; }
            else if (h > max) { w *= max/h; h = max; }

            canvas.width = w;
            canvas.height = h;

            canvas.getContext("2d").drawImage(img, 0, 0, w, h);

            screenshotBase64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

            document.getElementById("preview").src = canvas.toDataURL("image/jpeg");
            document.getElementById("preview").style.display = "block";
        }
    };

    reader.readAsDataURL(file);
});

/* ---------- EVENT RULES ---------- */
function enforceRules(e) {

    const t = document.querySelectorAll(".tech:checked").length;
    const nt = document.querySelectorAll(".nontech:checked").length;
    const total = t + nt;

    if (t === 0 && nt > 0) {
        e.target.checked = false;
        alert("Select at least 1 Technical ❌");
        return;
    }

    if (t > 2 || nt > 2 || total > 3) {
        e.target.checked = false;
        alert("Max 2 Tech, 2 NonTech, 3 Total ❌");
    }
}
document.querySelectorAll(".tech, .nontech")
.forEach(cb => cb.addEventListener("change", enforceRules));

/* ---------- PAYMENT (QR ONLY — NO UPI APP) ---------- */

document.getElementById("payBtn").onclick = () => {
    
    if (isClosed()) return alert("Registration Closed ❌");
    if (!formValid()) return;

    const upiID = "uvelimman434@oksbi";
    const name = "CCET";
    const amount = "200";

    const upi =
        "upi://pay?pa=" + encodeURIComponent(upiID) +
        "&pn=" + encodeURIComponent(name) +
        "&am=" + amount +
        "&cu=INR";

    // Show payment section
    document.getElementById("paymentArea").style.display = "block";

    // ALWAYS show QR (mobile + laptop)
    document.getElementById("qrBox").style.display = "block";

    // Generate QR
    document.getElementById("upiQR").src =
        "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" +
        encodeURIComponent(upi);

    // IMPORTANT: disable any click navigation
    const qr = document.getElementById("upiQR");
    qr.onclick = null;
    qr.style.pointerEvents = "none";   // prevents tap → no UPI open
};

/* ---------- VERIFY ---------- */
document.getElementById("verifyBtn").onclick = async () => {

    if (isClosed()) return alert("Registration Closed ❌");
    if (!formValid()) return;

    const utr = document.getElementById("utrInput").value.trim();
    if (utr.length < 8) return alert("Enter valid UTR");

    document.getElementById("loader").style.display = "block";

    const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
            check_utr: utr,
            phone: document.getElementById("phone").value.trim(),
            email: document.getElementById("email").value.trim(),
            secret: SECRET
        })
    });

    const text = await res.text();
    document.getElementById("loader").style.display = "none";

    if (text === "OK") {
        isVerified = true;
        document.getElementById("submitBtn").disabled = false;
        alert("Payment Verified ✔");
    }
    else if (text === "DUPLICATE_UTR") alert("UTR already used ❌");
    else if (text === "DUPLICATE_PHONE") alert("Phone already registered ❌");
    else if (text === "DUPLICATE_EMAIL") alert("Email already registered ❌");
    else alert("Verification Failed ❌");
};

/* ---------- SUBMIT ---------- */

let submitting = false;   // prevent double submit

document.getElementById("submitBtn").onclick = async () => {

    if (submitting) return;   // ignore extra clicks
    submitting = true;

    if (isClosed()) {
        submitting = false;
        return alert("Registration Closed ❌");
    }

    if (!formValid()) {
        submitting = false;
        return;
    }

    if (!isVerified || !screenshotBase64) {
        submitting = false;
        return alert("Verify payment & Upload screenshot!");
    }

    document.getElementById("loader").style.display = "block";
    document.getElementById("submitBtn").disabled = true;   // disable button

    const data = {
        name: document.getElementById("name").value,
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value,
        college: document.getElementById("college").value,
        dept: document.getElementById("dept").value,
        year: document.getElementById("year").value,
        food: document.getElementById("food").value,
        tech_events: [...document.querySelectorAll(".tech:checked")].map(x=>x.value).join(","),
        nontech_events: [...document.querySelectorAll(".nontech:checked")].map(x=>x.value).join(","),
        upi_txn_id: document.getElementById("utrInput").value,
        screenshot: screenshotBase64,
        secret: SECRET
    };

    try {

        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(data)
        });

        alert("Registration Successful ✔");
        location.reload();

    } catch (e) {

        alert("Submit Failed ❌");
        document.getElementById("submitBtn").disabled = false;
        submitting = false;
    }
};

/* ---------- DETAILS POPUP ---------- */
window.showPoster = (img) => {

    document.getElementById("posterImg").src = img;
    document.getElementById("descImg").src = img.replace(".png", "_desc.png");

    document.getElementById("posterPage").style.display = "block";
    document.getElementById("descPage").style.display = "none";
    document.getElementById("posterModal").style.display = "flex";
};

function showDesc() {
    document.getElementById("posterPage").style.display = "none";
    document.getElementById("descPage").style.display = "block";
}

function showPosterPage() {
    document.getElementById("posterPage").style.display = "block";
    document.getElementById("descPage").style.display = "none";
}

window.closePoster = () => {
    document.getElementById("posterModal").style.display = "none";
};

/* RUN CLOSE CHECK */
checkClosed();