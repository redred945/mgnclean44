(function () {
  "use strict";

  var root = document.querySelector("[data-wipe]");
  if (!root) return;

  var canvas = root.querySelector(".wipe-canvas");
  var status = root.querySelector(".wipe-status");
  var resetBtn = root.querySelector("[data-wipe-reset]");
  var skipBtn = root.querySelector("[data-wipe-skip]");
  var ctx = canvas.getContext("2d");

  var COLS = 36;
  var ROWS = 48;
  var TOTAL = COLS * ROWS;
  var DONE_AT = 0.8;

  var W = 0;
  var H = 0;
  var dpr = 1;
  var cells = new Uint8Array(TOTAL);
  var cleaned = 0;
  var done = false;
  var drawing = false;
  var last = null;

  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function blob(x, y, r, rgb, a, hard) {
    if (hard) {
      ctx.fillStyle = "rgba(" + rgb + "," + a + ")";
    } else {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(" + rgb + "," + a + ")");
      g.addColorStop(1, "rgba(" + rgb + ",0)");
      ctx.fillStyle = g;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintDirt() {
    var rand = rng(27);
    var s = W / 400;
    var i;

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    ctx.clearRect(0, 0, W, H);

    var film = ctx.createLinearGradient(0, 0, 0, H);
    film.addColorStop(0, "rgba(132,118,98,.42)");
    film.addColorStop(0.55, "rgba(116,100,80,.58)");
    film.addColorStop(1, "rgba(92,76,58,.74)");
    ctx.fillStyle = film;
    ctx.fillRect(0, 0, W, H);

    for (i = 0; i < 700; i++) {
      var y = (0.12 + 0.88 * Math.pow(rand(), 0.7)) * H;
      var a = 0.05 + rand() * 0.14;
      blob(rand() * W, y, (4 + rand() * 22) * s, rand() < 0.5 ? "70,56,40" : "190,178,158", a * 1.4);
    }

    for (i = 0; i < 90; i++) {
      blob(rand() * W, (0.55 + 0.45 * rand()) * H, (0.8 + rand() * 3.2) * s, "58,46,34", 0.35 + rand() * 0.4, true);
    }

    for (i = 0; i < 28; i++) {
      ctx.fillStyle = "rgba(205,196,180," + (0.1 + rand() * 0.12) + ")";
      ctx.fillRect(rand() * W, rand() * H * 0.6, (1 + rand() * 2.2) * s, (40 + rand() * 180) * s);
    }

    ctx.fillStyle = "rgba(190,180,165,.1)";
    ctx.fillRect(0, 0, W, H);
  }

  function measure() {
    var b = canvas.getBoundingClientRect();
    W = b.width;
    H = b.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function brush() {
    return Math.max(34, W * 0.13);
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function finish() {
    if (done) return;
    done = true;
    drawing = false;
    root.classList.add("is-clean");
    resetBtn.hidden = false;
    setStatus(status.getAttribute("data-done"));
  }

  function update() {
    var pct = Math.round((cleaned / TOTAL) * 100);
    if (cleaned / TOTAL >= DONE_AT) {
      finish();
    } else if (pct > 0) {
      setStatus("Propre à " + pct + " %");
    }
  }

  function mark(a, b) {
    var br = brush() * 0.45;
    var dist = Math.hypot(b.x - a.x, b.y - a.y);
    var steps = Math.max(1, Math.ceil(dist / (br * 0.6)));

    for (var i = 0; i <= steps; i++) {
      var x = a.x + ((b.x - a.x) * i) / steps;
      var y = a.y + ((b.y - a.y) * i) / steps;
      var c0 = Math.max(0, Math.floor(((x - br) / W) * COLS));
      var c1 = Math.min(COLS - 1, Math.floor(((x + br) / W) * COLS));
      var r0 = Math.max(0, Math.floor(((y - br) / H) * ROWS));
      var r1 = Math.min(ROWS - 1, Math.floor(((y + br) / H) * ROWS));

      for (var r = r0; r <= r1; r++) {
        for (var c = c0; c <= c1; c++) {
          var k = r * COLS + c;
          if (cells[k]) continue;
          var dx = ((c + 0.5) / COLS) * W - x;
          var dy = ((r + 0.5) / ROWS) * H - y;
          if (dx * dx + dy * dy <= br * br) {
            cells[k] = 1;
            cleaned++;
          }
        }
      }
    }
    update();
  }

  function wipe(a, b) {
    if (!W || !H) return;
    var size = brush();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;
    ctx.strokeStyle = "#000";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = size * 0.3 * dpr;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x + 0.01, b.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    mark(a, b);
  }

  function pos(e) {
    var b = canvas.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }

  function reset() {
    cells.fill(0);
    cleaned = 0;
    done = false;
    drawing = false;
    root.classList.remove("is-clean", "is-started");
    resetBtn.hidden = true;
    setStatus(status.getAttribute("data-idle"));
    paintDirt();
  }

  canvas.addEventListener("pointerdown", function (e) {
    if (done) return;
    drawing = true;
    last = pos(e);
    root.classList.add("is-started");
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {}
    wipe(last, last);
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!drawing || done) return;
    var p = pos(e);
    wipe(last, p);
    last = p;
  });

  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) {
    canvas.addEventListener(name, function () {
      drawing = false;
    });
  });

  resetBtn.addEventListener("click", reset);

  skipBtn.addEventListener("click", function () {
    cells.fill(1);
    cleaned = TOTAL;
    root.classList.add("is-started");
    finish();
  });

  var lastWidth = 0;
  function layout() {
    var w = canvas.getBoundingClientRect().width;
    if (!w || w === lastWidth) return;
    lastWidth = w;
    measure();
    if (!done) {
      cells.fill(0);
      cleaned = 0;
      setStatus(status.getAttribute("data-idle"));
      paintDirt();
    }
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(layout).observe(root);
  } else {
    window.addEventListener("resize", layout);
  }
  layout();
})();
