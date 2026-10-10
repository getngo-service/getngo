(function () {
  "use strict";

  /* ---------- Google Reviews (live, optional) -----------------------------
     The reviews section already shows real, hand-copied reviews from
     GET'N GO's Google Business page, so it looks right with zero setup and
     the "Voir tous les avis" / "Laissez un avis" buttons always point
     straight to the live Google Maps page:
     https://www.google.com/maps/place/Taxi+Rennes+A%C3%A9roport+En+Van+Et+Berline+%7C+GET%E2%80%99N+GO/...

     To make the cards themselves refresh automatically with whatever is
     currently on Google (new reviews, updated rating), plug in the
     Google Places API — a browser can't read Google Maps directly
     (no public, key-less endpoint exists for this), so a Places API key
     is the only supported way to do it:
       1. In Google Cloud Console, create a project and enable "Places API (New)".
       2. Create an API key and restrict it to this website's domain.
       3. Find the Place ID for GET'N GO (search "GET'N GO Rennes" at
          https://developers.google.com/maps/documentation/places/web-service/place-id).
       4. Paste both values below. That's it — every page load (and every
          click on the refresh button) will then pull the live rating,
          review count and latest reviews straight from Google.
  --------------------------------------------------------------------------- */
  var GOOGLE_PLACES_API_KEY = ""; // <-- paste your Places API key here
  var GOOGLE_PLACE_ID = "";       // <-- paste the GET'N GO place id here

  function starString(rating) {
    var full = Math.round(rating);
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  }

  function timeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var days = Math.floor(diff / 86400000);
    if (days <= 0) return "aujourd'hui";
    if (days === 1) return "il y a 1 jour";
    if (days < 30) return "il y a " + days + " jours";
    var months = Math.floor(days / 30);
    if (months < 12) return "il y a " + months + " mois";
    return "il y a " + Math.floor(months / 12) + " an(s)";
  }

  function renderLiveReviews(place) {
    var ratingEl = document.getElementById("gRatingValue");
    var starsEl = document.getElementById("gRatingStars");
    var countEl = document.getElementById("gRatingCount");
    var grid = document.getElementById("reviewsGrid");
    var syncEl = document.getElementById("reviewsSync");
    if (!grid) return;

    if (typeof place.rating === "number" && ratingEl) {
      ratingEl.textContent = place.rating.toFixed(1).replace(".", ",");
      starsEl.textContent = starString(place.rating);
    }
    if (typeof place.userRatingCount === "number" && countEl) {
      countEl.textContent = "(" + place.userRatingCount + " avis)";
    }

    if (Array.isArray(place.reviews) && place.reviews.length) {
      grid.innerHTML = place.reviews.slice(0, 4).map(function (r) {
        var name = (r.authorAttribution && r.authorAttribution.displayName) || "Client GET'N GO";
        var initial = name.trim().charAt(0).toUpperCase() || "G";
        var text = (r.text && r.text.text) || "";
        var when = r.publishTime ? timeAgo(r.publishTime) : "";
        return (
          '<div class="review-card">' +
            '<div class="review-person">' +
              '<span class="review-avatar">' + initial + "</span>" +
              "<div><b>" + name + "</b><small>" + when + "</small></div>" +
            "</div>" +
            '<span class="stars">' + starString(r.rating || 5) + "</span>" +
            "<p>" + text + "</p>" +
          "</div>"
        );
      }).join("");
    }

    if (syncEl) syncEl.textContent = "Avis à jour — actualisé à l'instant depuis Google";
  }

  function loadLiveReviews() {
    if (!GOOGLE_PLACES_API_KEY || !GOOGLE_PLACE_ID) return Promise.resolve();
    var url = "https://places.googleapis.com/v1/places/" + GOOGLE_PLACE_ID +
      "?fields=rating,userRatingCount,reviews&languageCode=fr&key=" + GOOGLE_PLACES_API_KEY;
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Places API " + res.status);
        return res.json();
      })
      .then(renderLiveReviews)
      .catch(function (err) {
        console.warn("Avis Google : bascule sur les avis enregistrés —", err.message);
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadLiveReviews();
    var refreshBtn = document.getElementById("reviewsRefresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        refreshBtn.classList.add("spinning");
        loadLiveReviews().finally(function () {
          setTimeout(function () { refreshBtn.classList.remove("spinning"); }, 500);
        });
      });
    }
  });

  /* ---------- Ambient background slideshow (fade in/out) ---------- */
  var layers = document.querySelectorAll("#ambient .layer");
  if (layers.length > 1) {
    var current = 0;
    setInterval(function () {
      layers[current].classList.remove("active");
      current = (current + 1) % layers.length;
      layers[current].classList.add("active");
    }, 9000);
  }

  /* ---------- Reveal-on-scroll ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var revealEls = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("in"); });
      return;
    }

    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  });

  /* ---------- Floating pill nav: click + scroll highlighting ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var navLinks = document.querySelectorAll(".pill-nav a");
    var sections = document.querySelectorAll("main > section[id]");

    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.forEach(function (l) { l.classList.remove("active"); });
        link.classList.add("active");
      });
    });

    if (!("IntersectionObserver" in window) || sections.length === 0) return;

    // Sections that belong visually to Accueil but aren't separate nav items yet.
    var NAV_ALIAS = { avantages: "home", avis: "home" };

    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute("id");
            var targetId = NAV_ALIAS[id] || id;
            navLinks.forEach(function (link) {
              link.classList.toggle("active", link.getAttribute("href") === "#" + targetId);
            });
          }
        });
      },
      { root: null, rootMargin: "-30% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach(function (section) { navObserver.observe(section); });
  });

  /* ---------- Services -> WhatsApp (copy to clipboard + pre-filled chat) ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var WA_NUMBER = "33223502642";
    var serviceCards = document.querySelectorAll(".service-card");

    serviceCards.forEach(function (card) {
      card.addEventListener("click", function () {
        var service = card.getAttribute("data-service") || card.querySelector("h3").textContent.trim();
        var message = "Bonjour, je suis intéressé(e) par votre service \"" + service + "\". Pourriez-vous me donner plus d'informations ?";

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(message).catch(function () {});
        }

        window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(message), "_blank", "noopener");
      });
    });
  });
})();

/* =========================================================
   RESERVATION WIDGET — Trajet -> Prix & coordonnées -> Résumé
   Free, key-less services so this works out of the box:
     - Adresses  : Nominatim (OpenStreetMap) geocoding/autocomplete
     - Itinéraire: OSRM public demo router (distance + durée + tracé)
     - Carte     : Leaflet + tuiles OpenStreetMap

   TARIFS — à ajuster librement selon vos prix réels :
   ========================================================= */
(function () {
  "use strict";

  var root = document.getElementById("reservation");
  if (!root) return;

  var RES_CONFIG = {
    whatsappNumber: "33223502642", // sans le +, format wa.me
    business: { lat: 48.0808273, lon: -1.6917605, label: "GET'N GO — Rennes" },
    pricing: {
      baseFare: 15,            // € — prise en charge
      perKm: 1.8,               // € / km
      minFare: 25,               // € — tarif plancher
      roundTripMultiplier: 1.85, // aller-retour = 1.85x l'aller (au lieu de 2x)
      hourlyRate: 45,             // € / heure — mise à disposition
      minHours: 2                 // durée minimum mise à disposition
    }
  };

  var els = {
    tabs: root.querySelectorAll(".res-tab"),
    modeFields: root.querySelectorAll("[data-mode-field]"),
    steps: root.querySelectorAll(".res-step"),
    panels: root.querySelectorAll("[data-step-panel]"),
    date: document.getElementById("resDate"),
    time: document.getElementById("resTime"),
    from: document.getElementById("resFrom"),
    fromSug: document.getElementById("resFromSuggestions"),
    to: document.getElementById("resTo"),
    toSug: document.getElementById("resToSuggestions"),
    tripType: document.getElementById("resTripType"),
    duration: document.getElementById("resDuration"),
    pax: document.getElementById("resPax"),
    step1Error: document.getElementById("resStep1Error"),
    toStep2Btn: document.getElementById("resToStep2"),
    distanceOut: document.getElementById("resDistanceOut"),
    durationOut: document.getElementById("resDurationOut"),
    priceValue: document.getElementById("resPriceValue"),
    name: document.getElementById("resName"),
    phone: document.getElementById("resPhone"),
    notes: document.getElementById("resNotes"),
    step2Error: document.getElementById("resStep2Error"),
    toStep3Btn: document.getElementById("resToStep3"),
    summary: document.getElementById("resSummary"),
    whatsappBtn: document.getElementById("resWhatsappBtn"),
    backBtns: root.querySelectorAll("[data-res-back]")
  };

  var state = {
    mode: "transfert",
    distanceKm: 0,
    durationMin: 0,
    price: 0
  };

  var leafletMap = null;
  var leafletLayerGroup = null;

  /* ---------- helpers ---------- */
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function fmtKm(km) {
    return (Math.round(km * 10) / 10).toLocaleString("fr-FR") + " km";
  }
  function fmtDuration(mins) {
    mins = Math.round(mins);
    var h = Math.floor(mins / 60), m = mins % 60;
    return h + " h " + m + " m";
  }
  function fmtPrice(v) {
    return Math.round(v).toLocaleString("fr-FR") + " €";
  }
  function todayISO() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  if (els.date) els.date.min = todayISO();

  /* ---------- Stepper / panel navigation ---------- */
  function goToStep(n) {
    els.steps.forEach(function (s) {
      var sn = Number(s.getAttribute("data-step"));
      s.classList.toggle("is-active", sn === n);
      s.classList.toggle("is-done", sn < n);
    });
    els.panels.forEach(function (p) {
      p.hidden = Number(p.getAttribute("data-step-panel")) !== n;
    });
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  els.backBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      goToStep(Number(btn.getAttribute("data-res-back")));
    });
  });

  /* ---------- Tabs (Transfert / Mise à disposition) ---------- */
  function setMode(mode) {
    state.mode = mode;
    els.tabs.forEach(function (t) {
      var active = t.getAttribute("data-mode") === mode;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    els.modeFields.forEach(function (f) {
      f.hidden = f.getAttribute("data-mode-field") !== mode;
    });
  }
  els.tabs.forEach(function (t) {
    t.addEventListener("click", function () { setMode(t.getAttribute("data-mode")); });
  });

  /* ---------- Address autocomplete (Nominatim) ---------- */
  function setupAutocomplete(input, box) {
    if (!input || !box) return;

    function hide() { box.hidden = true; box.innerHTML = ""; }

    function renderResults(results) {
      box.innerHTML = "";
      if (!results.length) {
        var empty = document.createElement("div");
        empty.className = "res-suggestion-empty";
        empty.textContent = "Aucune adresse trouvée";
        box.appendChild(empty);
        box.hidden = false;
        return;
      }
      results.forEach(function (r) {
        var item = document.createElement("div");
        item.className = "res-suggestion";
        item.textContent = r.display_name;
        item.addEventListener("mousedown", function (e) {
          e.preventDefault();
          input.value = r.display_name;
          input.dataset.lat = r.lat;
          input.dataset.lon = r.lon;
          hide();
        });
        box.appendChild(item);
      });
      box.hidden = false;
    }

    var search = debounce(function (q) {
      if (!q || q.length < 3) { hide(); return; }
      var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=6&countrycodes=fr&q=" + encodeURIComponent(q);
      fetch(url, { headers: { "Accept-Language": "fr" } })
        .then(function (res) { return res.json(); })
        .then(renderResults)
        .catch(function () { hide(); });
    }, 380);

    input.addEventListener("input", function () {
      delete input.dataset.lat;
      delete input.dataset.lon;
      search(input.value.trim());
    });
    input.addEventListener("focus", function () {
      if (input.value.trim().length >= 3 && box.children.length) box.hidden = false;
    });
    document.addEventListener("click", function (e) {
      if (e.target !== input) hide();
    });
  }
  setupAutocomplete(els.from, els.fromSug);
  setupAutocomplete(els.to, els.toSug);

  function geocode(query) {
    var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=1&countrycodes=fr&q=" + encodeURIComponent(query);
    return fetch(url, { headers: { "Accept-Language": "fr" } })
      .then(function (res) { return res.json(); })
      .then(function (results) {
        if (!results.length) return null;
        return { lat: Number(results[0].lat), lon: Number(results[0].lon), label: results[0].display_name };
      })
      .catch(function () { return null; });
  }

  function resolveAddress(input) {
    if (input.dataset.lat && input.dataset.lon) {
      return Promise.resolve({ lat: Number(input.dataset.lat), lon: Number(input.dataset.lon), label: input.value.trim() });
    }
    var q = input.value.trim();
    if (!q) return Promise.resolve(null);
    return geocode(q).then(function (place) {
      if (place) {
        input.dataset.lat = place.lat;
        input.dataset.lon = place.lon;
      }
      return place;
    });
  }

  /* ---------- Map ---------- */
  function goldPin(letter) {
    var svg =
      '<svg class="res-pin" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M13 0C5.8 0 0 5.8 0 13c0 9.5 13 21 13 21s13-11.5 13-21C26 5.8 20.2 0 13 0Z" fill="#c9a25a"/>' +
      '<circle cx="13" cy="13" r="7.5" fill="#08090b"/>' +
      (letter ? '<text x="13" y="17.5" text-anchor="middle" font-family="Jost, sans-serif" font-size="11" font-weight="600" fill="#e6c988">' + letter + "</text>" : "") +
      "</svg>";
    return L.divIcon({
      html: svg,
      className: "",
      iconSize: [26, 34],
      iconAnchor: [13, 34],
      popupAnchor: [0, -30]
    });
  }

  function ensureMap() {
    if (leafletMap || typeof L === "undefined") return leafletMap;
    try {
      leafletMap = L.map("resMap", { zoomControl: false, attributionControl: true, scrollWheelZoom: false })
        .setView([RES_CONFIG.business.lat, RES_CONFIG.business.lon], 13);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap &copy; CARTO"
      }).addTo(leafletMap);
      leafletLayerGroup = L.layerGroup().addTo(leafletMap);
      L.marker([RES_CONFIG.business.lat, RES_CONFIG.business.lon], { icon: goldPin() })
        .addTo(leafletLayerGroup)
        .bindPopup(RES_CONFIG.business.label);

      // Le conteneur peut être mesuré avant que la mise en page (polices, etc.)
      // ne soit stabilisée : on force Leaflet à recalculer sa taille juste après.
      setTimeout(function () { leafletMap.invalidateSize(); }, 120);
      setTimeout(function () { leafletMap.invalidateSize(); }, 500);
      window.addEventListener("resize", debounce(function () {
        if (leafletMap) leafletMap.invalidateSize();
      }, 200));
    } catch (e) { leafletMap = null; }
    return leafletMap;
  }

  function setMapFrame(url) {
    var f = document.getElementById("resMapFrame");
    if (f && f.getAttribute("src") !== url) f.setAttribute("src", url);
  }
  function drawSingleMarker(point) {
    setMapFrame("https://www.google.com/maps?q=" + point.lat + "," + point.lon + "&hl=fr&z=14&output=embed");
  }
  function drawRoute(fromPt, toPt) {
    setMapFrame("https://www.google.com/maps?saddr=" + fromPt.lat + "," + fromPt.lon +
      "&daddr=" + toPt.lat + "," + toPt.lon + "&hl=fr&output=embed");
  }

  function fetchRoute(fromPt, toPt) {
    var url = "https://router.project-osrm.org/route/v1/driving/" +
      fromPt.lon + "," + fromPt.lat + ";" + toPt.lon + "," + toPt.lat +
      "?overview=full&geometries=geojson";
    return fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.routes || !data.routes.length) return null;
        var r = data.routes[0];
        return { distanceKm: r.distance / 1000, durationMin: r.duration / 60, geometry: r.geometry };
      })
      .catch(function () { return null; });
  }

  function haversineKm(a, b) {
    var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
    var la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  /* ---------- Pricing ---------- */
  function calcPrice() {
    var p = RES_CONFIG.pricing;
    if (state.mode === "disposition") {
      var hours = Math.max(p.minHours, Number(els.duration.value) || p.minHours);
      return Math.round(p.hourlyRate * hours);
    }
    var fare = p.baseFare + state.distanceKm * p.perKm;
    fare = Math.max(fare, p.minFare);
    if (els.tripType.value === "retour") fare *= p.roundTripMultiplier;
    return Math.round(fare);
  }

  /* ---------- Step 1 -> Step 2 ---------- */
  function showStep1Error(msg) {
    els.step1Error.textContent = msg;
    els.step1Error.hidden = false;
  }
  function clearStep1Error() { els.step1Error.hidden = true; els.step1Error.textContent = ""; }

  function setButtonLoading(btn, loading, labelDefault) {
    btn.disabled = loading;
    btn.style.opacity = loading ? "0.65" : "";
    btn.childNodes[0].nodeValue = loading ? "Calcul en cours…" : labelDefault;
  }

  els.toStep2Btn.addEventListener("click", function () {
    clearStep1Error();
    if (!els.date.value || !els.time.value) return showStep1Error("Merci d'indiquer la date et l'heure de départ.");
    if (!els.from.value.trim()) return showStep1Error("Merci d'indiquer le lieu de départ.");
    if (state.mode === "transfert" && !els.to.value.trim()) return showStep1Error("Merci d'indiquer le lieu d'arrivée.");

    setButtonLoading(els.toStep2Btn, true, "Voir le prix");

    resolveAddress(els.from).then(function (fromPt) {
      if (!fromPt) {
        setButtonLoading(els.toStep2Btn, false, "Voir le prix");
        return showStep1Error("Adresse de départ introuvable, merci de la préciser.");
      }

      if (state.mode === "disposition") {
        state.distanceKm = 0;
        state.durationMin = Number(els.duration.value) * 60;
        drawSingleMarker(fromPt);
        els.distanceOut.textContent = "—";
        els.durationOut.textContent = els.duration.value + " h 0 m";
        state.price = calcPrice();
        els.priceValue.textContent = fmtPrice(state.price);
        setButtonLoading(els.toStep2Btn, false, "Voir le prix");
        goToStep(2);
        return;
      }

      resolveAddress(els.to).then(function (toPt) {
        if (!toPt) {
          setButtonLoading(els.toStep2Btn, false, "Voir le prix");
          return showStep1Error("Adresse d'arrivée introuvable, merci de la préciser.");
        }

        fetchRoute(fromPt, toPt).then(function (route) {
          if (!route) {
            // Repli si le service d'itinéraire est indisponible : distance à vol d'oiseau x 1.35
            var km = haversineKm(fromPt, toPt) * 1.35;
            route = { distanceKm: km, durationMin: km * 1.3, geometry: null };
          }
          state.distanceKm = route.distanceKm;
          state.durationMin = route.durationMin;
          drawRoute(fromPt, toPt, route.geometry);

          var displayKm = route.distanceKm * (els.tripType.value === "retour" ? 2 : 1);
          var displayMin = route.durationMin * (els.tripType.value === "retour" ? 2 : 1);
          els.distanceOut.textContent = fmtKm(displayKm);
          els.durationOut.textContent = fmtDuration(displayMin);

          state.price = calcPrice();
          els.priceValue.textContent = fmtPrice(state.price);

          setButtonLoading(els.toStep2Btn, false, "Voir le prix");
          goToStep(2);
        });
      });
    });
  });

  /* ---------- Step 2 -> Step 3 ---------- */
  function showStep2Error(msg) { els.step2Error.textContent = msg; els.step2Error.hidden = false; }
  function clearStep2Error() { els.step2Error.hidden = true; els.step2Error.textContent = ""; }

  function buildSummaryRow(label, value) {
    return '<div class="res-summary-row"><span>' + label + "</span><span>" + value + "</span></div>";
  }

  els.toStep3Btn.addEventListener("click", function () {
    clearStep2Error();
    if (!els.name.value.trim()) return showStep2Error("Merci d'indiquer votre nom.");
    if (!els.phone.value.trim()) return showStep2Error("Merci d'indiquer votre numéro de téléphone.");

    var rows = "";
    rows += buildSummaryRow("Date & heure", els.date.value.split("-").reverse().join("/") + " à " + els.time.value);
    rows += buildSummaryRow(state.mode === "transfert" ? "Type" : "Prestation",
      state.mode === "transfert" ? (els.tripType.options[els.tripType.selectedIndex].text) : "Mise à disposition");
    rows += buildSummaryRow("Lieu de départ", els.from.value.trim());
    if (state.mode === "transfert") {
      rows += buildSummaryRow("Lieu d'arrivée", els.to.value.trim());
      rows += buildSummaryRow("Distance estimée", els.distanceOut.textContent);
    } else {
      rows += buildSummaryRow("Durée", els.duration.value + " heure(s)");
    }
    rows += buildSummaryRow("Passagers", els.pax.value);
    rows += buildSummaryRow("Nom", els.name.value.trim());
    rows += buildSummaryRow("Téléphone", els.phone.value.trim());
    if (els.notes.value.trim()) rows += buildSummaryRow("Remarques", els.notes.value.trim());
    rows += '<div class="res-summary-row res-summary-total"><span>Prix estimé</span><span>' + fmtPrice(state.price) + "</span></div>";
    els.summary.innerHTML = rows;

    els.whatsappBtn.href = "https://wa.me/" + RES_CONFIG.whatsappNumber + "?text=" + encodeURIComponent(buildWhatsappMessage());

    goToStep(3);
  });

  function buildWhatsappMessage() {
    var lines = [];
    lines.push("🚐 *Nouvelle demande de réservation — GET'N GO*");
    lines.push("");
    lines.push("📅 Date : " + els.date.value.split("-").reverse().join("/") + " à " + els.time.value);
    lines.push("🧭 " + (state.mode === "transfert" ? "Type : " + els.tripType.options[els.tripType.selectedIndex].text : "Prestation : Mise à disposition"));
    lines.push("📍 Départ : " + els.from.value.trim());
    if (state.mode === "transfert") {
      lines.push("🏁 Arrivée : " + els.to.value.trim());
      lines.push("📏 Distance estimée : " + els.distanceOut.textContent);
      lines.push("⏱️ Durée estimée : " + els.durationOut.textContent);
    } else {
      lines.push("⏱️ Durée : " + els.duration.value + " heure(s)");
    }
    lines.push("👥 Passagers : " + els.pax.value);
    lines.push("💶 Prix estimé : " + fmtPrice(state.price));
    lines.push("");
    lines.push("👤 Nom : " + els.name.value.trim());
    lines.push("📞 Téléphone : " + els.phone.value.trim());
    if (els.notes.value.trim()) lines.push("📝 Remarques : " + els.notes.value.trim());
    lines.push("");
    lines.push("Merci de confirmer ma réservation 🙏");
    return lines.join("\n");
  }

  /* ---------- Contact form -> WhatsApp (pre-filled message) ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contactForm");
    if (!form) return;

    var errorEl = document.getElementById("contactFormError");
    var WA_NUMBER = "33223502642";

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var phone = form.phone.value.trim();
      var subject = form.subject.value.trim();
      var message = form.message.value.trim();

      if (!name || !email || !message) {
        if (errorEl) {
          errorEl.textContent = "Merci de renseigner votre nom, votre email et votre message.";
          errorEl.hidden = false;
        }
        return;
      }
      if (errorEl) errorEl.hidden = true;

      var lines = [];
      lines.push("✉️ *Nouveau message — Formulaire de contact GET'N GO*");
      lines.push("");
      lines.push("👤 Nom : " + name);
      lines.push("📧 Email : " + email);
      if (phone) lines.push("📞 Téléphone : " + phone);
      if (subject) lines.push("📝 Sujet : " + subject);
      lines.push("");
      lines.push("💬 Message :");
      lines.push(message);

      window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
      form.reset();
    });
  });

  /* ---------- Galerie véhicule (van + berline : miniatures, flèches, plein écran) ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var galleries = Array.prototype.slice.call(document.querySelectorAll(".vehicle-gallery"));
    if (!galleries.length) return;

    var lightbox = document.getElementById("vehicleLightbox");
    var lightboxImage = document.getElementById("vehicleLightboxImage");
    var lightboxClose = document.getElementById("vehicleLightboxClose");
    var lightboxPrev = document.querySelector(".vehicle-lightbox-prev");
    var lightboxNext = document.querySelector(".vehicle-lightbox-next");
    var active = null; // galerie actuellement ouverte dans la lightbox

    function lightboxOpen() { return lightbox && !lightbox.hidden; }

    function openLightbox(g) {
      if (!lightbox) return;
      active = g;
      lightboxImage.src = g.slides[g.current].src;
      lightboxImage.alt = g.slides[g.current].alt;
      lightbox.hidden = false;
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function closeLightbox() {
      if (!lightbox) return;
      lightbox.hidden = true;
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    galleries.forEach(function (root) {
      var mainImage = root.querySelector(".vehicle-main-image > img");
      var thumbs = Array.prototype.slice.call(root.querySelectorAll(".vehicle-thumb"));
      if (!mainImage || !thumbs.length) return;

      var countEl = root.querySelector(".vehicle-image-count");
      var prevBtn = root.querySelector(".vehicle-gallery-prev");
      var nextBtn = root.querySelector(".vehicle-gallery-next");
      var expandBtn = root.querySelector(".vehicle-expand");

      var g = {
        current: 0,
        slides: thumbs.map(function (thumb) {
          return { src: thumb.getAttribute("data-image"), alt: thumb.getAttribute("data-alt") || "" };
        })
      };

      g.render = function () {
        var slide = g.slides[g.current];
        mainImage.src = slide.src;
        mainImage.alt = slide.alt;
        if (countEl) countEl.textContent = (g.current + 1) + " / " + g.slides.length;
        thumbs.forEach(function (thumb, i) {
          thumb.classList.toggle("is-active", i === g.current);
        });
        if (lightboxOpen() && active === g) {
          lightboxImage.src = slide.src;
          lightboxImage.alt = slide.alt;
        }
      };
      g.goTo = function (index) {
        g.current = (index + g.slides.length) % g.slides.length;
        g.render();
      };

      thumbs.forEach(function (thumb, i) {
        thumb.addEventListener("click", function () { g.goTo(i); });
      });
      if (prevBtn) prevBtn.addEventListener("click", function () { g.goTo(g.current - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { g.goTo(g.current + 1); });
      if (expandBtn) expandBtn.addEventListener("click", function () { openLightbox(g); });
      mainImage.addEventListener("click", function () { openLightbox(g); });

      g.render();
    });

    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener("click", function () { if (active) active.goTo(active.current - 1); });
    if (lightboxNext) lightboxNext.addEventListener("click", function () { if (active) active.goTo(active.current + 1); });
    if (lightbox) {
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) closeLightbox();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (!lightboxOpen() || !active) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") active.goTo(active.current - 1);
      if (e.key === "ArrowRight") active.goTo(active.current + 1);
    });
  });

  /* init */
  setMode("transfert");
})();


/* ---------- Cartes (Nos avantages) : agrandissement au clic ---------- */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var items = Array.prototype.slice.call(document.querySelectorAll(".card-deck-item[data-card]"));
    var lb = document.getElementById("cardLightbox");
    var img = document.getElementById("cardLbImage");
    if (!items.length || !lb || !img) return;

    var slides = items.map(function (el) {
      var i = el.querySelector("img");
      return { src: i.getAttribute("src"), alt: i.getAttribute("alt") || "" };
    });
    var current = 0;

    function show() {
      img.src = slides[current].src;
      img.alt = slides[current].alt;
    }
    function open(i) {
      current = i;
      show();
      lb.hidden = false;
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function close() {
      lb.hidden = true;
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
    function go(d) {
      current = (current + d + slides.length) % slides.length;
      show();
    }

    items.forEach(function (el, i) {
      el.addEventListener("click", function () { open(i); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
      });
    });
    document.getElementById("cardLbClose").addEventListener("click", close);
    document.getElementById("cardLbPrev").addEventListener("click", function () { go(-1); });
    document.getElementById("cardLbNext").addEventListener("click", function () { go(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    });
  });
})();


/* ---------- Lien TPMR -> pré-remplit le sujet du formulaire de contact ---------- */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var subject = document.getElementById("contactSubject");
    if (!subject) return;
    document.querySelectorAll("[data-prefill-subject]").forEach(function (link) {
      link.addEventListener("click", function () {
        if (!subject.value.trim()) subject.value = link.getAttribute("data-prefill-subject");
      });
    });
  });
})();


/* ---------- Destinations -> pré-remplit la réservation (départ = aéroport, arrivée = ville) ---------- */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var links = document.querySelectorAll(".dest-link[data-dest]");
    var panel = document.getElementById("reservation");
    if (!links.length || !panel) return;

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        // revenir à l'étape 1 si le visiteur était plus loin dans le formulaire
        for (var i = 0; i < 3; i++) {
          var back = panel.querySelector("[data-step-panel]:not([hidden]) [data-res-back]");
          if (!back) break;
          back.click();
        }
        var tab = panel.querySelector('.res-tab[data-mode="transfert"]');
        if (tab) tab.click();

        var from = document.getElementById("resFrom");
        var to = document.getElementById("resTo");
        if (from && !from.value.trim()) {
          from.value = "Aéroport de Rennes-Bretagne";
          from.dataset.lat = "48.0808273";
          from.dataset.lon = "-1.6917605";
        }
        if (to) {
          to.value = link.getAttribute("data-dest");
          delete to.dataset.lat;
          delete to.dataset.lon;
        }
      });
    });
  });
})();


/* ---------- À propos : photos du chauffeur, 7 s chacune, fondu enchaîné ---------- */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var slides = Array.prototype.slice.call(document.querySelectorAll(".about-photo-wrap .about-photo"));
    if (slides.length < 2) return;

    // Précharge toutes les photos pour que le fondu ne dépende pas du chargement
    slides.forEach(function (img) {
      img.loading = "eager";
      var pre = new Image();
      pre.src = img.currentSrc || img.src;
    });

    var current = 0;
    setInterval(function () {
      var prev = slides[current];
      current = (current + 1) % slides.length;
      var next = slides[current];

      // l'ancienne reste opaque dessous, la nouvelle apparaît en fondu dessus
      slides.forEach(function (s) { if (s !== prev && s !== next) s.classList.remove("is-prev", "is-active"); });
      prev.classList.remove("is-active");
      prev.classList.add("is-prev");
      void next.offsetWidth; // force le navigateur à enregistrer l'état opacity:0 avant la transition
      next.classList.add("is-active");

      setTimeout(function () { prev.classList.remove("is-prev"); }, 1900);
    }, 7000);
  });
})();
