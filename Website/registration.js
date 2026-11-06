// ── Constants ────────────────────────────────────────────────────────────────
const BLI_WHATSAPP = '2348166330072';
const BLI_EMAIL    = 'bethelearninginstitute@gmail.com';

// ── Year injection (footer copyright) ────────────────────────────────────────
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ── Elements ─────────────────────────────────────────────────────────────────
const form         = document.getElementById('regForm');
const confirmPanel = document.getElementById('confirmPanel');
const confirmName  = document.getElementById('confirmName');
const refCode      = document.getElementById('refCode');

// ── Submit handler ────────────────────────────────────────────────────────────
form.addEventListener('submit', function (e) {
  e.preventDefault();

  // Collect all field values
  const fullName      = document.getElementById('fullName').value.trim();
  const age           = document.getElementById('age').value.trim();
  const email         = document.getElementById('email').value.trim();
  const phone         = document.getElementById('phone').value.trim();
  const guardianName  = document.getElementById('guardianName').value.trim();
  const guardianPhone = document.getElementById('guardianPhone').value.trim();
  const program       = document.getElementById('program').value;
  const schedule      = document.querySelector('input[name="schedule"]:checked')?.value || 'Not specified';
  const experience    = document.getElementById('experience').value;
  const referral      = document.getElementById('referral').value;

  // Generate reference code
  const code      = 'BLI-' + Math.floor(100000 + Math.random() * 900000);
  const firstName = fullName.split(' ')[0] || 'there';

  // ── Build the message ───────────────────────────────────────────────────────
  const guardian = guardianName
    ? `Guardian: ${guardianName} | ${guardianPhone || 'no number given'}`
    : 'Guardian: N/A (adult applicant)';

  const msg =
    `*New BLI Enrollment — ${code}*\n\n` +
    `*Name:* ${fullName}\n` +
    `*Age:* ${age}\n` +
    `*Email:* ${email}\n` +
    `*Phone/WhatsApp:* ${phone}\n` +
    `*${guardian}*\n\n` +
    `*Program:* ${program}\n` +
    `*Schedule:* ${schedule}\n` +
    `*Experience:* ${experience}\n` +
    `*Referral:* ${referral}\n\n` +
    `_Reference: ${code}_`;

  // ── 1. Open WhatsApp with pre-filled message ────────────────────────────────
  const waURL = `https://wa.me/${BLI_WHATSAPP}?text=${encodeURIComponent(msg)}`;
  window.open(waURL, '_blank');

  // ── 2. Open mailto with pre-filled subject + body ──────────────────────────
  const emailSubject = `New Enrollment — ${fullName} (${code})`;
  const emailBody =
    `New BLI Enrollment\n` +
    `Reference: ${code}\n\n` +
    `Name:            ${fullName}\n` +
    `Age:             ${age}\n` +
    `Email:           ${email}\n` +
    `Phone/WhatsApp:  ${phone}\n` +
    `Guardian:        ${guardianName || 'N/A'} ${guardianPhone ? '| ' + guardianPhone : ''}\n\n` +
    `Program:         ${program}\n` +
    `Schedule:        ${schedule}\n` +
    `Experience:      ${experience}\n` +
    `Referral:        ${referral}`;

  // Small delay so browsers don't block two simultaneous opens
  setTimeout(function () {
    window.location.href =
      `mailto:${BLI_EMAIL}` +
      `?subject=${encodeURIComponent(emailSubject)}` +
      `&body=${encodeURIComponent(emailBody)}`;
  }, 400);

  // ── 3. Show confirmation panel ──────────────────────────────────────────────
  confirmName.textContent = `You're on the list, ${firstName}.`;
  refCode.textContent = code;

  form.classList.add('hide');
  confirmPanel.classList.add('show');
});
