(function () {
  "use strict";

  var form = document.getElementById("contactForm");
  if (!form) return;

  /* Verified WhatsApp Business click-to-chat short link (same one used
     site-wide in the header/footer). A direct wa.me/<number>?text= link
     would let us prefill the message automatically, but the number shown
     on the site (07 68 96 49 20) isn't registered on WhatsApp under that
     account, so we fall back to copy-to-clipboard + open, same as Instagram. */
  var WA_LINK = "https://wa.me/message/XT7KCCNUZB6QK1";
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

  /* Auto-drafted message: written from the selected formule/options, but
     never overwrites what the visitor typed themselves — it only refreshes
     while the field still matches the last auto-generated text (i.e. the
     visitor hasn't touched it yet, or hasn't diverged from it). */
  var messageEl = form.message;
  var lastAutoMessage = "";

  function autoMessageText() {
    var formule = form.querySelector("#cf-formule input:checked");
    var options = Array.prototype.slice.call(form.querySelectorAll("#cf-options input:checked"));
    var totals = computeTotal();
    var hasFormule = !!(formule && formule.value);

    if (!hasFormule && !options.length) return "";

    var sentence = hasFormule
      ? "Je souhaite une prestation " + formule.value + (formule.dataset.price !== "0" ? " (" + formule.dataset.price + "€)" : "")
      : "Je souhaite un devis";

    if (options.length) {
      var optTxt = options.map(function (o) {
        return o.dataset.devis === "1" ? o.value + " (sur devis)" : o.value + " (" + o.dataset.price + "€)";
      }).join(", ");
      sentence += (hasFormule ? " avec les options suivantes : " : " avec ") + optTxt;
    }

    sentence += ". Total estimé : " + totals.total + "€" + (totals.hasDevis ? " (+ prestations sur devis)" : "") + ".";
    return sentence;
  }

  function refreshAutoMessage() {
    if (!messageEl) return;
    if (messageEl.value === "" || messageEl.value === lastAutoMessage) {
      lastAutoMessage = autoMessageText();
      messageEl.value = lastAutoMessage;
    }
  }

  serviceInputs().forEach(function (input) {
    updateHighlight(input);
    input.addEventListener("change", function () {
      updateHighlight(input);
      computeTotal();
      refreshAutoMessage();
    });
  });
  computeTotal();
  refreshAutoMessage();

  function buildMessage() {
    var nom = (form.nom && form.nom.value || "").trim();
    var tel = (form.telephone && form.telephone.value || "").trim();
    var message = (form.message && form.message.value || "").trim();
    var pickup = form.pickup && form.pickup.checked;

    var lines = ["Bonjour,", ""];
    lines.push("Je souhaite un devis pour une prestation MGNclean.");
    lines.push("");
    lines.push(message || "Je vous laisse me conseiller sur la prestation la plus adaptée.");
    lines.push("");
    if (nom) lines.push("Nom : " + nom);
    if (tel) lines.push("Téléphone : " + tel);
    if (pickup) lines.push("Souhaite le service de récupération / restitution du véhicule");
    lines.push("");
    lines.push(nom ? "Cordialement, " + nom : "Cordialement");

    return lines.join("\n");
  }

  function flashNote(text) {
    if (!noteEl) return;
    clearTimeout(noteTimer);
    noteEl.textContent = text;
    noteTimer = setTimeout(function () { noteEl.textContent = noteDefault; }, 6000);
  }

  /* Shared nom/téléphone check for every send channel — `report` receives
     the error text so each button can surface it in its own status area. */
  function requireContactFields(report) {
    var nom = (form.nom && form.nom.value || "").trim();
    var tel = (form.telephone && form.telephone.value || "").trim();
    if (!nom || !tel) {
      report("Merci de renseigner votre nom et votre téléphone avant d'envoyer.");
      (nom ? form.telephone : form.nom).focus();
      return false;
    }
    return true;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!requireContactFields(flashNote)) return;
    var text = buildMessage();

    function openWa(copied) {
      window.open(WA_LINK, "_blank", "noopener");
      flashNote(
        copied
          ? "Message copié — collez-le (Ctrl+V) dans la conversation WhatsApp qui vient de s'ouvrir."
          : "WhatsApp s'ouvre dans un nouvel onglet — il ne reste plus qu'à nous écrire votre demande là-bas."
      );
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { openWa(true); },
        function () { openWa(false); }
      );
    } else {
      openWa(false);
    }
  });

  var igBtn = document.getElementById("cf-instagram");
  if (igBtn) {
    igBtn.addEventListener("click", function () {
      if (!requireContactFields(flashNote)) return;
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
  var siteDivider = document.getElementById("cf-site-divider");
  var siteStatus = document.getElementById("cf-site-status");
  var web3formsReady = WEB3FORMS_ACCESS_KEY && WEB3FORMS_ACCESS_KEY !== "YOUR_WEB3FORMS_ACCESS_KEY";

  function setSiteStatus(text, kind) {
    if (!siteStatus) return;
    siteStatus.textContent = text;
    siteStatus.className = "field-status" + (kind ? " is-" + kind : "");
  }

  if (siteBtn && !web3formsReady) {
    /* Not configured yet: hide the whole "or send from the site" block
       rather than leave a button that always fails once deployed. */
    siteBtn.style.display = "none";
    if (siteDivider) siteDivider.style.display = "none";
    if (siteStatus) siteStatus.style.display = "none";
  } else if (siteBtn) {
    var siteBtnLabel = siteBtn.innerHTML;

    siteBtn.addEventListener("click", function () {
      if (!requireContactFields(function (msg) { setSiteStatus(msg, "error"); })) return;

      var nom = (form.nom && form.nom.value || "").trim();
      var tel = (form.telephone && form.telephone.value || "").trim();

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
            lastAutoMessage = "";
            refreshAutoMessage();
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
