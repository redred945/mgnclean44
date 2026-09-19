(function () {
  "use strict";

  /* Always land on the hero on a fresh visit. Clicking an in-page nav
     link (Tarifs, Avis…) updates the URL with a #hash without reloading,
     so that hash lingers in the address bar/history — browsers then
     restore that scroll position (or jump straight to the hash target)
     the next time the tab reloads or is reopened, which reads as "the
     site doesn't open on the hero anymore". These hashes are only used
     for same-page nav here, never as shared deep links, so it's safe to
     always reset to top rather than honor them on (re)load. */
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  if (window.location.hash) {
    /* Strip the hash outright — otherwise the browser re-applies its own
       native scroll-to-fragment once the hero image finishes loading and
       the page's final height is known, which happens AFTER this script
       runs and silently undoes a plain scrollTo(0,0) below. */
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  window.scrollTo(0, 0);
  /* Mobile Safari/Chrome restore the page from cache (bfcache) — with its
     old scroll position intact — when the visitor switches app/tab and
     comes back, or taps the browser's back button. That restore doesn't
     re-run this script, so it needs its own listener. */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      window.scrollTo(0, 0);
    }
  });

  /* Header scroll state */
  var hd = document.getElementById("hd");
  function onScroll() {
    if (window.scrollY > 12) hd.classList.add("scrolled");
    else hd.classList.remove("scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile nav */
  var burger = document.getElementById("burger");
  var mnav = document.getElementById("mnav");
  function closeMnav() {
    mnav.classList.remove("open");
    mnav.inert = true;
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }
  function openMnav() {
    mnav.classList.add("open");
    mnav.inert = false;
    burger.classList.add("open");
    burger.setAttribute("aria-expanded", "true");
  }
  burger.addEventListener("click", function () {
    if (mnav.classList.contains("open")) closeMnav();
    else openMnav();
  });
  mnav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeMnav);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && mnav.classList.contains("open")) closeMnav();
  });

  /* Reveal on scroll */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* Hero background crossfade */
  var heroBgs = Array.prototype.slice.call(document.querySelectorAll(".hero-bg"));
  if (heroBgs.length > 1) {
    var reduceMotionHero = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotionHero) {
      var heroIdx = 0;
      setInterval(function () {
        heroBgs[heroIdx].classList.remove("is-active");
        heroIdx = (heroIdx + 1) % heroBgs.length;
        heroBgs[heroIdx].classList.add("is-active");
      }, 7000);
    }
  }

  /* Before / After slider(s) — supports multiple instances (tabs) */
  document.querySelectorAll("[data-ba-slider]").forEach(function (slider) {
    var after = slider.querySelector(".ba-after");
    var handle = slider.querySelector(".ba-handle");
    if (!after || !handle) return;
    var dragging = false;

    function setPos(clientX) {
      var rect = slider.getBoundingClientRect();
      var x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      var pct = (x / rect.width) * 100;
      after.style.clipPath = "inset(0 0 0 " + pct + "%)";
      handle.style.left = pct + "%";
    }

    function start(e) {
      dragging = true;
      slider.style.cursor = "ew-resize";
      move(e);
    }
    function move(e) {
      if (!dragging) return;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      setPos(clientX);
    }
    function end() {
      dragging = false;
      slider.style.cursor = "";
    }

    handle.addEventListener("mousedown", start);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);

    handle.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);

    slider.addEventListener("click", function (e) {
      if (e.target.closest(".ba-grip")) return;
      setPos(e.clientX);
    });

    /* gentle auto demo sweep on first view (skipped for reduced motion) */
    var reduceMotionBa = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ("IntersectionObserver" in window && !reduceMotionBa) {
      var demoed = false;
      var ioBa = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !demoed) {
              demoed = true;
              var t = 0;
              var timer = setInterval(function () {
                t += 1;
                var pct = 50 + Math.sin(t / 8) * 22;
                after.style.clipPath = "inset(0 0 0 " + pct + "%)";
                handle.style.left = pct + "%";
                if (t > 60) clearInterval(timer);
              }, 30);
              ioBa.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      ioBa.observe(slider);
    }
  });

  /* Before / After tabs (extérieur / intérieur) */
  var baTabs = document.querySelectorAll(".ba-tab");
  if (baTabs.length) {
    baTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-ba-tab");
        baTabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle("active", active);
          t.setAttribute("aria-selected", String(active));
        });
        document.querySelectorAll("[data-ba-panel]").forEach(function (panel) {
          var show = panel.getAttribute("data-ba-panel") === target;
          panel.classList.toggle("active", show);
          panel.hidden = !show;
        });
      });
    });
  }

  /* Reviews carousel */
  var track = document.getElementById("reviewTrack");
  if (track) {
    var cards = Array.prototype.slice.call(track.children);
    var prevBtn = document.getElementById("reviewPrev");
    var nextBtn = document.getElementById("reviewNext");
    var dotsWrap = document.getElementById("reviewDots");

    cards.forEach(function (card, i) {
      var dot = document.createElement("button");
      dot.className = "review-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", "Voir l'avis " + (i + 1));
      dot.addEventListener("click", function () { goTo(i); });
      dotsWrap.appendChild(dot);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);

    function cardStep() {
      var card = cards[0];
      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || 0) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    function activeIndex() {
      var step = cardStep();
      return Math.round(track.scrollLeft / step);
    }

    function updateDots() {
      var idx = Math.min(cards.length - 1, Math.max(0, activeIndex()));
      dots.forEach(function (d, i) { d.classList.toggle("active", i === idx); });
    }

    function goTo(i) {
      var idx = Math.min(cards.length - 1, Math.max(0, i));
      track.scrollTo({ left: idx * cardStep(), behavior: "smooth" });
    }

    prevBtn.addEventListener("click", function () { goTo(activeIndex() - 1); });
    nextBtn.addEventListener("click", function () { goTo(activeIndex() + 1); });
    track.addEventListener("scroll", function () {
      window.requestAnimationFrame(updateDots);
    }, { passive: true });
    window.addEventListener("resize", updateDots);
    updateDots();

    /* gentle autoplay, pauses on interaction/hover, respects reduced motion */
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion && cards.length > 1) {
      var autoplayTimer;
      function scheduleAutoplay() {
        clearInterval(autoplayTimer);
        autoplayTimer = setInterval(function () {
          var next = activeIndex() + 1;
          if (next > cards.length - 1) next = 0;
          goTo(next);
        }, 5500);
      }
      function pauseAutoplay() { clearInterval(autoplayTimer); }
      track.addEventListener("mouseenter", pauseAutoplay);
      track.addEventListener("mouseleave", scheduleAutoplay);
      track.addEventListener("touchstart", pauseAutoplay, { passive: true });
      track.addEventListener("touchend", scheduleAutoplay, { passive: true });
      scheduleAutoplay();
    }
  }

  /* Gallery lightbox */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxCap = document.getElementById("lightboxCap");
  var lightboxClose = document.getElementById("lightboxClose");

  if (lightbox && lightboxImg && lightboxCap && lightboxClose) {
    var lightboxTrigger = null;
    document.querySelectorAll(".gal-item").forEach(function (item) {
      item.addEventListener("click", function (e) {
        var href = item.getAttribute("href") || "";
        if (href.indexOf("instagram.com") === -1) return;
        var img = item.querySelector("img");
        var cap = item.getAttribute("data-cap") || (img ? img.alt : "");
        if (img) {
          e.preventDefault();
          lightboxTrigger = item;
          lightboxImg.src = img.src;
          lightboxImg.alt = img.alt;
          lightboxCap.textContent = cap;
          lightbox.inert = false;
          lightbox.classList.add("open");
          lightboxClose.focus();
        }
      });
    });
    var closeLightbox = function () {
      lightbox.classList.remove("open");
      lightbox.inert = true;
      if (lightboxTrigger) { lightboxTrigger.focus(); lightboxTrigger = null; }
    };
    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("open")) closeLightbox();
    });
  }

  /* Footer year */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
