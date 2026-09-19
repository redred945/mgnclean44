(function () {
  "use strict";

  var form = document.getElementById("contactForm");
  if (!form) return;

  /* Phone-number based wa.me link so the ?text= prefill is reliably supported
     (the wa.me/message/<id> short links do not reliably accept a text param). */
  var WA_NUMBER = "33768964930";

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var prestationEl = form.querySelector("#cf-prestation");
    var prestation = prestationEl && prestationEl.selectedIndex > -1
      ? prestationEl.options[prestationEl.selectedIndex].text
      : "";
    var nom = (form.nom && form.nom.value || "").trim();
    var tel = (form.telephone && form.telephone.value || "").trim();
    var message = (form.message && form.message.value || "").trim();
    var pickup = form.pickup && form.pickup.checked;

    var lines = ["Bonjour MGNclean, je souhaite un devis :", ""];
    lines.push("Prestation : " + (prestation || "à préciser"));
    if (nom) lines.push("Nom : " + nom);
    if (tel) lines.push("Téléphone : " + tel);
    if (pickup) lines.push("Souhaite le service de récupération / restitution du véhicule");
    if (message) {
      lines.push("");
      lines.push(message);
    }

    var text = encodeURIComponent(lines.join("\n"));
    var url = "https://wa.me/" + WA_NUMBER + "?text=" + text;
    window.open(url, "_blank", "noopener");
  });
})();
