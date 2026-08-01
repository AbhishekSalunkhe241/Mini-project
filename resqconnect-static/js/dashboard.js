/* ==========================================================================
   ResQConnect — dashboard.js
   Behavior scoped to the 23 dashboard pages (citizen / volunteer / ngo /
   rescue / admin). Loaded AFTER main.js. Every function checks for its
   target elements first, so this file is safe to include even on pages
   that only use some of these components.
   ========================================================================== */

(function () {
  "use strict";

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ------------------------------------------------------------------
     1. SIDEBAR TOGGLE (mobile) — opens the fixed sidebar + scrim
     ------------------------------------------------------------------ */
  function initSidebarToggle() {
    const btn = $("#sidebarToggle");
    const sidebar = $("#dashSidebar");
    const scrim = $("#sidebarScrim");
    if (!btn || !sidebar) return;

    const open = () => {
      sidebar.classList.add("open");
      if (scrim) scrim.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      sidebar.classList.remove("open");
      if (scrim) scrim.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };

    btn.addEventListener("click", () => {
      sidebar.classList.contains("open") ? close() : open();
    });
    if (scrim) scrim.addEventListener("click", close);
    $$("a", sidebar).forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  /* ------------------------------------------------------------------
     2. TABS — generic tab switcher.
        Structure:
        <div class="tabs">
          <button data-tab="tab1" class="active">One</button>
          <button data-tab="tab2">Two</button>
        </div>
        <div data-tab-panel="tab1">...</div>
        <div data-tab-panel="tab2" hidden>...</div>
     ------------------------------------------------------------------ */
  function initTabs() {
    $$(".tabs").forEach((tabGroup) => {
      const buttons = $$("button[data-tab]", tabGroup);
      if (!buttons.length) return;

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = btn.getAttribute("data-tab");
          buttons.forEach((b) => b.classList.toggle("active", b === btn));

          // Panels can live anywhere in the same dashboard section
          const scope = tabGroup.closest(".dash-content") || document;
          $$("[data-tab-panel]", scope).forEach((panel) => {
            panel.hidden = panel.getAttribute("data-tab-panel") !== target;
          });
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     3. ANIMATED STAT COUNTERS
        <b data-count-to="1284">0</b>
     ------------------------------------------------------------------ */
  function animateCount(el) {
    const to = parseInt(el.getAttribute("data-count-to"), 10);
    if (Number.isNaN(to)) return;
    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      el.textContent = Math.round(to * eased).toLocaleString("en-IN");
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initStatCounters() {
    const counters = $$("[data-count-to]");
    if (!counters.length) return;

    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateCount);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((c) => io.observe(c));
  }

  /* ------------------------------------------------------------------
     4. PROGRESS BAR FILL ANIMATION
        <div class="progress"><div class="progress__fill" data-fill="72"></div></div>
     ------------------------------------------------------------------ */
  function initProgressBars() {
    $$(".progress__fill[data-fill]").forEach((bar) => {
      const pct = Math.max(0, Math.min(100, parseInt(bar.getAttribute("data-fill"), 10) || 0));
      requestAnimationFrame(() => { bar.style.width = pct + "%"; });
      if (pct < 25) bar.classList.add("low");
      else if (pct < 60) bar.classList.add("mid");
    });
  }

  /* ------------------------------------------------------------------
     5. TABLE / LIST SEARCH FILTER
        <input data-filter-target="#usersTable">
        Filters row text against the input value on every keystroke.
     ------------------------------------------------------------------ */
  function initTableFilters() {
    $$("[data-filter-target]").forEach((input) => {
      const target = $(input.getAttribute("data-filter-target"));
      if (!target) return;
      const rows = () => $$("tbody tr, .list-row, .task-card", target);

      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        rows().forEach((row) => {
          const match = row.textContent.toLowerCase().includes(q);
          row.style.display = match ? "" : "none";
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     6. STATUS FILTER PILLS
        <button data-status-filter="active" class="badge active">Active</button>
        Filters elements with [data-status] within the same dash-content.
     ------------------------------------------------------------------ */
  function initStatusFilters() {
    $$("[data-status-filter]").forEach((pill) => {
      pill.addEventListener("click", () => {
        const group = pill.closest("[data-filter-group]");
        if (!group) return;
        $$("[data-status-filter]", group).forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");

        const value = pill.getAttribute("data-status-filter");
        const scope = group.closest(".dash-content") || document;
        $$("[data-status]", scope).forEach((item) => {
          item.style.display = value === "all" || item.getAttribute("data-status") === value ? "" : "none";
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     7. SOS CONFIRM (citizen-sos.html) — press-and-hold style confirm
        to avoid accidental triggers, using a simple two-step click.
     ------------------------------------------------------------------ */
  function initSosButton() {
    const btn = $("#sosButton");
    const status = $("#sosStatus");
    if (!btn) return;

    let armed = false;
    btn.addEventListener("click", () => {
      if (!armed) {
        armed = true;
        btn.textContent = "Tap again to confirm SOS";
        btn.classList.add("btn-emergency");
        setTimeout(() => {
          if (armed) {
            armed = false;
            btn.textContent = "Send Emergency SOS";
          }
        }, 4000);
        return;
      }
      armed = false;
      btn.textContent = "SOS Sent — Help is on the way";
      btn.disabled = true;
      if (status) {
        status.hidden = false;
        status.textContent = "Your location and details have been shared with the nearest rescue team (ref: SOS-2026-88231).";
      }
    });
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    initSidebarToggle();
    initTabs();
    initStatCounters();
    initProgressBars();
    initTableFilters();
    initStatusFilters();
    initSosButton();
  });
})();
