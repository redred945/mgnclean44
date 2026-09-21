(function () {
  "use strict";

  var daysEl = document.getElementById("rdvDays");
  var slotsEl = document.getElementById("rdvSlots");
  var formWrap = document.getElementById("rdvFormWrap");
  var form = document.getElementById("rdvForm");
  var recapEl = document.getElementById("rdvRecap");
  var confirmedEl = document.getElementById("rdvConfirmed");
  var confirmedTextEl = document.getElementById("rdvConfirmedText");
  var whatsappBtn = document.getElementById("rdvWhatsappBtn");
  var anotherBtn = document.getElementById("rdvAnother");
  if (!daysEl) return;

  var WA_LINK = "https://wa.me/message/XT7KCCNUZB6QK1";
  var STORAGE_KEY = "mgnclean_rdv_bookings";
  var DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  var DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  var MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  var selectedDate = null; // "YYYY-MM-DD"
  var selectedSlot = null; // slot object {id, label, hours}

  /* ---------- storage (demo only: this device's browser, not shared) ---------- */
  function loadBookings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveBooking(entry) {
    var all = loadBookings();
    all.push(entry);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  /* ---------- deterministic "already booked" demo slots ----------
     No backend here, so we simulate a realistic partial calendar:
     a pseudo-random (but stable) subset of slots per day looks
     "already taken", on top of whatever this browser has booked
     itself via localStorage. */
  function seedFromString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }
  function isDeterministicallyBooked(dateStr, slotId) {
    var seed = seedFromString(dateStr + slotId);
    return seed % 4 === 0; // ~25% of half-days pre-filled, for a realistic-looking demo calendar
  }

  function fmtDateKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* Each service takes a half-day, so slots are morning/afternoon, not hourly. */
  var SLOT_MATIN = { id: "matin", label: "Matin", hours: "9h – 13h" };
  var SLOT_APREM = { id: "apresmidi", label: "Après-midi", hours: "14h – 18h" };

  function slotsForDay(dow) {
    if (dow === 0) return []; // Sunday closed
    if (dow === 6) return [SLOT_MATIN]; // Saturday: morning only
    return [SLOT_MATIN, SLOT_APREM];
  }

  /* ---------- render the next 21 days ---------- */
  function buildDays() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var frag = document.createDocumentFragment();
    var firstAvailable = null;

    for (var i = 0; i < 21; i++) {
      var d = new Date(today);
      d.setDate(d.getDate() + i);
      var dow = d.getDay();
      var key = fmtDateKey(d);
      var closed = dow === 0;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rdv-day" + (closed ? " is-closed" : "");
      btn.disabled = closed;
      btn.dataset.date = key;
      btn.innerHTML =
        '<span class="rdv-day-dow">' + DAY_SHORT[dow] + "</span>" +
        '<span class="rdv-day-num">' + d.getDate() + "</span>" +
        '<span class="rdv-day-month">' + MONTHS[d.getMonth()] + "</span>";
      if (!closed) {
        btn.addEventListener("click", function () {
          selectDay(this.dataset.date);
        });
        if (!firstAvailable) firstAvailable = key;
      }
      frag.appendChild(btn);
    }
    daysEl.appendChild(frag);
    if (firstAvailable) selectDay(firstAvailable);
  }

  function selectDay(dateKey) {
    selectedDate = dateKey;
    selectedSlot = null;
    Array.prototype.forEach.call(daysEl.querySelectorAll(".rdv-day"), function (btn) {
      btn.classList.toggle("active", btn.dataset.date === dateKey);
    });
    renderSlots();
    hideForm();
  }

  function renderSlots() {
    var d = new Date(selectedDate + "T00:00:00");
    var dow = d.getDay();
    var available = slotsForDay(dow);
    var bookedByMe = loadBookings()
      .filter(function (b) { return b.date === selectedDate; })
      .map(function (b) { return b.slotId; });

    slotsEl.innerHTML = "";
    if (!available.length) {
      slotsEl.innerHTML = '<p class="rdv-hint">Fermé ce jour-là — choisissez une autre date.</p>';
      return;
    }

    available.forEach(function (slot) {
      var taken = isDeterministicallyBooked(selectedDate, slot.id) || bookedByMe.indexOf(slot.id) !== -1;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rdv-slot" + (taken ? " is-taken" : "");
      btn.disabled = taken;
      btn.innerHTML =
        '<span class="rdv-slot-label">' + slot.label + "</span>" +
        '<span class="rdv-slot-hours">' + (taken ? "Complet" : slot.hours) + "</span>";
      if (!taken) {
        btn.addEventListener("click", function () {
          selectSlot(slot, btn);
        });
      }
      slotsEl.appendChild(btn);
    });
  }

  function selectSlot(slot, btnEl) {
    selectedSlot = slot;
    Array.prototype.forEach.call(slotsEl.querySelectorAll(".rdv-slot"), function (b) {
      b.classList.toggle("active", b === btnEl);
    });
    showForm();
  }

  function formatDateHuman(dateKey) {
    var d = new Date(dateKey + "T00:00:00");
    return DAY_NAMES[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
  }

  function showForm() {
    formWrap.hidden = false;
    updateRecap();
    formWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function hideForm() {
    formWrap.hidden = true;
  }

  function updateRecap() {
    if (!selectedDate || !selectedSlot) return;
    recapEl.innerHTML =
      "Créneau sélectionné : <b>" + formatDateHuman(selectedDate) + "</b> — <b>" + selectedSlot.label +
      "</b> (" + selectedSlot.hours + ")";
  }

  form.addEventListener("input", updateRecap);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nom = form.nom.value.trim();
    var tel = form.telephone.value.trim();
    if (!nom || !tel) {
      form.nom.focus();
      return;
    }
    var prestation = form.prestation.value;
    var lieu = form.lieu.value;

    saveBooking({
      date: selectedDate,
      slotId: selectedSlot.id,
      slotLabel: selectedSlot.label,
      slotHours: selectedSlot.hours,
      nom: nom,
      telephone: tel,
      prestation: prestation,
      lieu: lieu,
      createdAt: new Date().toISOString(),
    });

    var dateHuman = formatDateHuman(selectedDate);
    var message =
      "Bonjour, je souhaite un rendez-vous MGNclean le " + dateHuman + " (" + selectedSlot.label +
      ", " + selectedSlot.hours + ") pour : " + prestation + " — " + lieu +
      ".\nNom : " + nom + "\nTéléphone : " + tel;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).catch(function () {});
    }
    whatsappBtn.href = WA_LINK;

    confirmedTextEl.textContent =
      "Rendez-vous demandé pour le " + dateHuman + " (" + selectedSlot.label + ", " + selectedSlot.hours +
      "). Votre message est copié : collez-le (Ctrl+V) dans WhatsApp pour confirmer le créneau.";
    formWrap.hidden = true;
    confirmedEl.hidden = false;
    confirmedEl.scrollIntoView({ behavior: "smooth", block: "start" });
    renderSlots();
  });

  anotherBtn.addEventListener("click", function () {
    confirmedEl.hidden = true;
    selectedSlot = null;
    form.reset();
    if (selectedDate) selectDay(selectedDate);
  });

  buildDays();
})();
