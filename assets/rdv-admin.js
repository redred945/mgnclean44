(function () {
  "use strict";

  var listEl = document.getElementById("rdvAdminList");
  var emptyEl = document.getElementById("rdvAdminEmpty");
  var countEl = document.getElementById("rdvAdminCount");
  var clearBtn = document.getElementById("rdvAdminClear");
  if (!listEl) return;

  var STORAGE_KEY = "mgnclean_rdv_bookings";
  var DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  var MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  function loadBookings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveBookings(all) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function formatDateHuman(dateKey) {
    var d = new Date(dateKey + "T00:00:00");
    return DAY_NAMES[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
  }

  function render() {
    var all = loadBookings();
    all.sort(function (a, b) {
      return (a.date + a.slotId).localeCompare(b.date + b.slotId);
    });

    countEl.textContent = all.length + (all.length > 1 ? " rendez-vous" : " rendez-vous");
    listEl.innerHTML = "";
    emptyEl.hidden = all.length > 0;
    clearBtn.hidden = all.length === 0;

    all.forEach(function (b, i) {
      var row = document.createElement("div");
      row.className = "rdv-admin-row";
      row.innerHTML =
        '<div class="rdv-admin-when">' +
          '<b>' + formatDateHuman(b.date) + '</b>' +
          '<span class="rdv-admin-badge">' + (b.slotLabel || "") + (b.slotHours ? " · " + b.slotHours : "") + '</span>' +
        '</div>' +
        '<div class="rdv-admin-info">' +
          '<span class="rdv-admin-nom">' + escapeHtml(b.nom || "—") + '</span>' +
          '<a class="rdv-admin-tel" href="tel:' + escapeHtml((b.telephone || "").replace(/\s+/g, "")) + '">' + escapeHtml(b.telephone || "—") + '</a>' +
        '</div>' +
        '<div class="rdv-admin-meta">' +
          '<span>' + escapeHtml(b.prestation || "—") + '</span>' +
          '<span>' + escapeHtml(b.lieu || "—") + '</span>' +
        '</div>' +
        '<button type="button" class="rdv-admin-del" data-i="' + i + '" aria-label="Supprimer ce rendez-vous">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>' +
        '</button>';
      listEl.appendChild(row);
    });

    Array.prototype.forEach.call(listEl.querySelectorAll(".rdv-admin-del"), function (btn) {
      btn.addEventListener("click", function () {
        var idx = Number(btn.dataset.i);
        var all = loadBookings();
        all.sort(function (a, b) { return (a.date + a.slotId).localeCompare(b.date + b.slotId); });
        all.splice(idx, 1);
        saveBookings(all);
        render();
      });
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  clearBtn.addEventListener("click", function () {
    if (!confirm("Supprimer tous les rendez-vous enregistrés sur cet appareil ?")) return;
    saveBookings([]);
    render();
  });

  render();
})();
