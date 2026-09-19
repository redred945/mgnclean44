(function () {
  "use strict";

  var form = document.getElementById("contactForm");
  if (!form) return;

  /* Phone-number based wa.me link so the ?text= prefill is reliably supported
     (the wa.me/message/<id> short links do not reliably accept a text param). */
  var WA_NUMBER = "33768964930";
  var IG_USERNAME = "mgnclean44";

  /* TODO: replace with the real Web3Forms access key before going live.
     Get one free, no account needed: https://web3forms.com/ — enter the
     email that should receive the quote requests, they email you a key
     instantly. Swap it in below. */
  var WEB3FORMS_ACCESS_KEY = "YOUR_WEB3FORMS_ACCESS_KEY";

  var totalEl = document.querySelector("#cf-total b");
  var noteEl = document.getElementById("cf-note");
  var noteDefault = noteEl ? noteEl.textContent : "";
  var noteTimer;

  function serviceInputs() {
    return Array.prototype.slice.call(
      form.querySelectorAll("#cf-formule input, #cf-options input")
    );
  }

  function updateHighlight(input) {
    var row = input.closest(".svc-radio, .svc-check");
    if (!row) return;
    if (input.type === "radio") {
      Array.prototype.slice.call(row.parentElement.querySelectorAll(".svc-radio")).forEach(function (r) {
        r.classList.remove("is-checked");
      });
    }
    row.classList.toggle("is-checked", input.checked);
  }

  function computeTotal() {
    var total = 0;
    var hasDevis = false;
    serviceInputs().forEach(function (input) {
      if (!input.checked) return;
      if (input.dataset.devis === "1") hasDevis = true;
      else total += parseInt(input.dataset.price || "0", 10);
    });
    if (totalEl) {
      totalEl.textContent = total + "€" + (hasDevis ? " + devis" : "");
    }
    return { total: total, hasDevis: hasDevis };
  }

  serviceInputs().forEach(function (input) {
    updateHighlight(input);
    input.addEventListener("change", function () {
      updateHighlight(input);
      computeTotal();
    });
  });
  computeTotal();

  function buildMessage() {
    var formule = form.querySelector("#cf-formule input:checked");
    var options = Array.prototype.slice.call(form.querySelectorAll("#cf-options input:checked"));
    var totals = computeTotal();
    var nom = (form.nom && form.nom.value || "").trim();
    var tel = (form.telephone && form.telephone.value || "").trim();
    var message = (form.message && form.message.value || "").trim();
    var pickup = form.pickup && form.pickup.checked;

    var lines = ["Bonjour MGNclean, je souhaite un devis :", ""];

    if (formule && formule.value) {
      var price = formule.dataset.price;
      lines.push("Formule : " + formule.value + (price && price !== "0" ? " — " + price + "€" : ""));
    } else {
      lines.push("Formule : à définir");
    }

    if (options.length) {
      var optTxt = options.map(function (o) {
        return o.dataset.devis === "1" ? o.value + " (sur devis)" : o.value + " (" + o.dataset.price + "€)";
      }).join(", ");
      lines.push("Options : " + optTxt);
    }

    lines.push("Total estimé : " + totals.total + "€" + (totals.hasDevis ? " (+ prestations sur devis)" : ""));

    if (nom) lines.push("Nom : " + nom);
    if (tel) lines.push("Téléphone : " + tel);
    if (pickup) lines.push("Souhaite le service de récupération / restitution du véhicule");
    if (message) {
      lines.push("");
      lines.push(message);
    }

    return lines.join("\n");
  }

  function flashNote(text) {
    if (!noteEl) return;
    clearTimeout(noteTimer);
    noteEl.textContent = text;
    noteTimer = setTimeout(function () { noteEl.textContent = noteDefault; }, 6000);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = encodeURIComponent(buildMessage());
    var url = "https://wa.me/" + WA_NUMBER + "?text=" + text;
    window.open(url, "_blank", "noopener");
  });

  var igBtn = document.getElementById("cf-instagram");
  if (igBtn) {
    igBtn.addEventListener("click", function () {
      var text = buildMessage();

      function openIg(copied) {
        window.open("https://ig.me/m/" + IG_USERNAME, "_blank", "noopener");
        flashNote(
          copied
            ? "Message copié — collez-le (Ctrl+V) dans la conversation Instagram qui vient de s'ouvrir."
            : "Instagram s'ouvre dans un nouvel onglet — il ne reste plus qu'à nous écrire votre demande là-bas."
        );
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { openIg(true); },
          function () { openIg(false); }
        );
      } else {
        openIg(false);
      }
    });
  }

  var siteBtn = document.getElementById("cf-site");
  var siteStatus = document.getElementById("cf-site-status");
  var siteBtnLabel = siteBtn ? siteBtn.innerHTML : "";

  function setSiteStatus(text, kind) {
    if (!siteStatus) return;
    siteStatus.textContent = text;
    siteStatus.className = "field-status" + (kind ? " is-" + kind : "");
  }

  if (siteBtn) {
    siteBtn.addEventListener("click", function () {
      var nom = (form.nom && form.nom.value || "").trim();
      var tel = (form.telephone && form.telephone.value || "").trim();

      if (!nom || !tel) {
        setSiteStatus("Merci de renseigner votre nom et votre téléphone avant d'envoyer.", "error");
        (nom ? form.telephone : form.nom).focus();
        return;
      }

      if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === "YOUR_WEB3FORMS_ACCESS_KEY") {
        setSiteStatus("Envoi direct pas encore configuré — utilisez WhatsApp ou Instagram ci-dessus pour le moment.", "error");
        return;
      }

      siteBtn.disabled = true;
      siteBtn.innerHTML = "Envoi en cours…";
      setSiteStatus("", "pending");

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: "Nouvelle demande de devis — MGNclean",
          from_name: nom,
          phone: tel,
          message: buildMessage()
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          siteBtn.disabled = false;
          siteBtn.innerHTML = siteBtnLabel;
          if (data && data.success) {
            setSiteStatus("Message envoyé ✓ — nous revenons vers vous rapidement.", "ok");
            form.reset();
            computeTotal();
            serviceInputs().forEach(updateHighlight);
          } else {
            setSiteStatus("Échec de l'envoi — utilisez WhatsApp ou Instagram ci-dessus.", "error");
          }
        })
        .catch(function () {
          siteBtn.disabled = false;
          siteBtn.innerHTML = siteBtnLabel;
          setSiteStatus("Échec de l'envoi — utilisez WhatsApp ou Instagram ci-dessus.", "error");
        });
    });
  }
})();
