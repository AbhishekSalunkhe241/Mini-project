/* ==========================================================================
   ResQConnect — main.js
   Shared behavior for every page: navigation, theme, popovers, modal,
   validation, and small progressive-enhancement niceties.
   Loaded on every page BEFORE dashboard.js (dashboard.js only runs its own
   code if dashboard-only elements exist on the page).
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     0. Utilities
     ------------------------------------------------------------------ */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ------------------------------------------------------------------
     1. THEME (dark mode toggle) — persisted for the session only
        (no localStorage assumptions broken; uses a simple in-memory
        + documentElement attribute so a reload defaults back to light
        unless the user's OS prefers dark).
     ------------------------------------------------------------------ */
  function initTheme() {
    const root = document.documentElement;
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) root.setAttribute("data-theme", "dark");

    const toggle = $("#themeToggle");
    if (!toggle) return;

    const syncIcon = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      toggle.setAttribute("aria-pressed", String(isDark));
      toggle.innerHTML = isDark
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    };

    toggle.addEventListener("click", () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      root.setAttribute("data-theme", isDark ? "light" : "dark");
      syncIcon();
    });
    syncIcon();
  }

  /* ------------------------------------------------------------------
     2. MOBILE MENU TOGGLE
     ------------------------------------------------------------------ */
  function initMobileMenu() {
    const btn = $("#menuToggle");
    const nav = $("#navLinks");
    if (!btn || !nav) return;

    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });

    // Close menu when a link is tapped (mobile)
    $$("a", nav).forEach((a) => a.addEventListener("click", () => {
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }));
  }

  /* ------------------------------------------------------------------
     3. ACTIVE NAV HIGHLIGHTING
        Compares the current filename against each nav link's href.
     ------------------------------------------------------------------ */
  function highlightActiveNav() {
    const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $$(".nav-links a, .sidebar-nav a").forEach((a) => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (href === current || (current === "" && href === "index.html")) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
      }
    });
  }

  /* ------------------------------------------------------------------
     4. GENERIC DROPDOWN / POPOVER (notification bell, user menu)
        Any element with [data-popover-trigger] toggles the sibling
        element referenced by its data-target attribute (an id).
     ------------------------------------------------------------------ */
  function initPopovers() {
    $$("[data-popover-trigger]").forEach((trigger) => {
      const targetId = trigger.getAttribute("data-target");
      const panel = document.getElementById(targetId);
      if (!panel) return;

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !panel.classList.contains("open");
        $$(".popover.open").forEach((p) => p.classList.remove("open"));
        panel.classList.toggle("open", willOpen);
      });
    });

    // Click outside closes all open popovers
    document.addEventListener("click", (e) => {
      $$(".popover.open").forEach((p) => {
        if (!p.contains(e.target)) p.classList.remove("open");
      });
    });

    // Escape closes popovers
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") $$(".popover.open").forEach((p) => p.classList.remove("open"));
    });
  }

  /* ------------------------------------------------------------------
     5. MODAL
        Trigger:  <button data-modal-open="modalId">
        Close:    <button data-modal-close> or .modal-overlay itself
     ------------------------------------------------------------------ */
  function initModals() {
    $$("[data-modal-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modal = document.getElementById(btn.getAttribute("data-modal-open"));
        if (modal) {
          modal.classList.add("open");
          document.body.style.overflow = "hidden";
          const focusable = modal.querySelector("input, button, textarea, select");
          if (focusable) focusable.focus();
        }
      });
    });

    $$(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal(overlay);
      });
      $$("[data-modal-close]", overlay).forEach((btn) =>
        btn.addEventListener("click", () => closeModal(overlay))
      );
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") $$(".modal-overlay.open").forEach(closeModal);
    });

    function closeModal(overlay) {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
    }
  }

  /* ------------------------------------------------------------------
     6. SMOOTH SCROLL for in-page anchor links (e.g. "#how-it-works")
     ------------------------------------------------------------------ */
  function initSmoothScroll() {
    $$('a[href^="#"]:not([href="#"])').forEach((a) => {
      a.addEventListener("click", (e) => {
        const target = document.getElementById(a.getAttribute("href").slice(1));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ------------------------------------------------------------------
     7. FORM VALIDATION
        Any <form data-validate> is intercepted on submit. Each field's
        wrapping .field gets an "error" class + shows .error-msg when
        invalid. Rules read from the input's native attributes
        (required, type=email, minlength, pattern) — no extra markup
        needed beyond a .error-msg element per field.
     ------------------------------------------------------------------ */
  function initFormValidation() {
    $$("form[data-validate]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        let valid = true;

        $$(".field", form).forEach((field) => {
          const input = field.querySelector(".input, .select, .textarea");
          if (!input) return;
          const ok = input.checkValidity();
          field.classList.toggle("error", !ok);
          if (!ok) valid = false;
        });

        if (!valid) {
          e.preventDefault();
          const firstError = form.querySelector(".field.error .input, .field.error .select, .field.error .textarea");
          if (firstError) firstError.focus();
          return;
        }

        // No backend wired up in this static prototype — show a success
        // state instead of actually submitting, unless the form opts out.
        if (!form.hasAttribute("data-allow-submit")) {
          e.preventDefault();
          showFormSuccess(form);
        }
      });

      // Live-clear error state as the user fixes a field
      $$(".input, .select, .textarea", form).forEach((input) => {
        input.addEventListener("input", () => {
          const field = input.closest(".field");
          if (field && input.checkValidity()) field.classList.remove("error");
        });
      });
    });
  }

  function showFormSuccess(form) {
    let note = form.querySelector(".form-success");
    if (!note) {
      note = document.createElement("div");
      note.className = "callout callout-info form-success";
      note.style.marginTop = "16px";
      note.innerHTML = "<p><strong>Submitted.</strong> This is a static prototype, so no data was sent — in production this would POST to the ResQConnect API.</p>";
      form.appendChild(note);
    }
    note.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ------------------------------------------------------------------
     8. SCROLL REVEAL — fades/raises .reveal elements into view
     ------------------------------------------------------------------ */
  function initScrollReveal() {
    const items = $$(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     9. ALERT RIBBON — the site's signature severity ticker.
        Content lives here so every page shows the same live list
        without duplicating markup 33 times.
     ------------------------------------------------------------------ */
  const ACTIVE_ALERTS = [
    { id: "DA-2026-0142", sev: "critical", label: "CRITICAL", text: "Mumbai — Coastal flooding, Andheri & Bandra low-lying zones" },
    { id: "DA-2026-0139", sev: "warning",  label: "WARNING",  text: "Odisha Coast — Cyclone Biparjoy tracking north, landfall in 36h" },
    { id: "DA-2026-0137", sev: "watch",    label: "WATCH",    text: "Uttarakhand — Forest fire risk elevated, Nainital district" },
    { id: "DA-2026-0135", sev: "advisory", label: "ADVISORY", text: "Chennai — Heatwave advisory, avoid outdoor activity 12–4 PM" },
  ];

  function renderAlertRibbon() {
    const track = $("#ribbonTrack");
    if (!track) return;
    const items = ACTIVE_ALERTS.map(
      (a) => `<li class="alert-ribbon__item"><span class="alert-ribbon__sev sev-${a.sev}">${a.label}</span><span class="mono">${a.id}</span> — ${a.text}</li>`
    ).join("");
    // Duplicate the list once so the CSS keyframe (-50%) loops seamlessly.
    track.querySelector("ul").innerHTML = items + items;

    const countEl = $("#ribbonCount");
    if (countEl) countEl.textContent = String(ACTIVE_ALERTS.length);
  }

  /* ------------------------------------------------------------------
     10. Footer year auto-fill
     ------------------------------------------------------------------ */
  function initFooterYear() {
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initMobileMenu();
    highlightActiveNav();
    initPopovers();
    initModals();
    initSmoothScroll();
    initFormValidation();
    initScrollReveal();
    renderAlertRibbon();
    initFooterYear();
  });
})();
