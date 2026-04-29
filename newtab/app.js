let allTabData = {};
let allCategories = [];
let allNameMap = {};   // { rawKey → displayName }
let searchQuery = "";
let fireworks = null;

const CATEGORY_META = {
  Other: { icon: "📌", color: "#8b8fa8" }
};

// Deterministic color from a string (so same hostname always gets same color)
function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  const hue = ((h >>> 0) % 360);
  return `hsl(${hue}, 55%, 58%)`;
}

function getFavicon(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return null;
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function highlight(text, query) {
  if (!query) return escHtml(text);
  const re = new RegExp(`(${escRe(query)})`, "gi");
  return escHtml(text).replace(re, "<mark>$1</mark>");
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCategoryMeta(name) {
  const found = allCategories.find(c => c.name === name);
  if (found) return found;
  if (CATEGORY_META[name]) return CATEGORY_META[name];
  // Auto-generate icon + color for hostname-based groups (e.g. "km.sankuai.com")
  return { icon: "🌐", color: hashColor(name), name };
}

function buildGroupCard(category, tabs, q) {
  const meta = getCategoryMeta(category);
  const groupId = `group-${category.replace(/[^a-zA-Z0-9]/g, "-")}`;

  // Icon: use favicon of first tab, fall back to meta.icon emoji
  const firstFavicon = tabs[0]?.favIconUrl || (tabs[0]?.url ? getFavicon(tabs[0].url) : null);
  const iconHtml = firstFavicon
    ? `<img src="${escHtml(firstFavicon)}" alt="" onerror="this.style.display='none'">`
    : meta.icon;

  // rawKey: the original hostname/category key before custom renaming
  const rawKey = tabs[0]?.rawKey || category;

  const tabCardsHtml = tabs.map(tab => {
    const favicon = tab.favIconUrl || getFavicon(tab.url);
    const domain = getDomain(tab.url);
    const titleHtml = highlight(tab.title || "Untitled", q);
    const domainHtml = highlight(domain, q);

    return `
      <div class="tab-card ${tab.active ? "active-tab" : ""}"
           data-tab-id="${tab.id}"
           data-window-id="${tab.windowId}"
           data-url="${escHtml(tab.url || "")}"
           data-title="${escHtml(tab.title || "")}">
        ${favicon
          ? `<img class="tab-favicon" src="${escHtml(favicon)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ""}
        <div class="tab-favicon-placeholder" ${favicon ? 'style="display:none"' : ""}>
          ${(tab.title || "?")[0].toUpperCase()}
        </div>
        <div class="tab-info">
          <div class="tab-title">${titleHtml}</div>
          <div class="tab-url">${domainHtml}</div>
        </div>
        <div class="tab-actions">
          <button class="tab-bookmark" data-bookmark-url="${escHtml(tab.url || "")}" title="Bookmark this tab">☆</button>
          <button class="tab-close" data-close-id="${tab.id}" title="Close tab">✕</button>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="group-card" id="${groupId}" data-raw-key="${escHtml(rawKey)}">
      <div class="group-header">
        <span class="group-chevron" data-toggle="${groupId}">▾</span>
        <span class="group-icon">${iconHtml}</span>
        <span class="group-name-wrap">
          <span class="group-name"
                style="color:${meta.color}"
                data-edit-name="${escHtml(category)}"
                data-raw-key="${escHtml(rawKey)}">${escHtml(category)}</span>
          <span class="group-name-edit-btn" data-edit-trigger="${escHtml(rawKey)}" title="Rename">✎</span>
        </span>
        <span class="group-count">${tabs.length}</span>
        <button class="group-close-all" data-close-group="${escHtml(category)}" title="Close all in group">
          Close all
        </button>
      </div>
      <div class="group-body">${tabCardsHtml}</div>
    </div>
  `;
}

function getColumnCount() {
  const w = document.getElementById("tabGroups").offsetWidth;
  if (w < 500) return 1;
  if (w < 820) return 2;
  if (w < 1100) return 3;
  return 4;
}

function renderGroups() {
  const container = document.getElementById("tabGroups");
  const emptyState = document.getElementById("emptyState");
  const q = searchQuery.toLowerCase().trim();

  // Build list of [category, filteredTabs] to render
  const groups = [];
  let totalTabs = 0;

  for (const category of getOrderedCategories(allTabData)) {
    const tabs = allTabData[category];
    if (!tabs || tabs.length === 0) continue;
    const filtered = q
      ? tabs.filter(t =>
          (t.title || "").toLowerCase().includes(q) ||
          (t.url || "").toLowerCase().includes(q)
        )
      : tabs;
    if (filtered.length === 0) continue;
    totalTabs += filtered.length;
    groups.push({ category, tabs: filtered });
  }

  if (groups.length === 0) {
    container.innerHTML = "";
    emptyState.classList.remove("hidden");
    document.getElementById("tabStats").textContent = "0 tabs";
    renderLegend();
    return;
  }

  emptyState.classList.add("hidden");

  // Greedy waterfall: assign each group to the shortest column
  const colCount = getColumnCount();
  const cols = Array.from({ length: colCount }, () => ({ height: 0, cards: [] }));

  for (const { category, tabs } of groups) {
    // Estimate height: header (~42px) + each tab row (~38px), min 1 item shown
    const estimatedH = 42 + tabs.length * 38;
    const shortest = cols.reduce((min, c, i) => c.height < cols[min].height ? i : min, 0);
    cols[shortest].cards.push(buildGroupCard(category, tabs, q));
    cols[shortest].height += estimatedH;
  }

  container.innerHTML = cols
    .map(col => `<div class="waterfall-col">${col.cards.join("")}</div>`)
    .join("");

  document.getElementById("tabStats").textContent =
    `${totalTabs} tab${totalTabs !== 1 ? "s" : ""}`;

  renderLegend();
  checkBookmarkStates();
}

function getOrderedCategories(data) {
  // Sort all categories by tab count descending
  return Object.keys(data).sort((a, b) => (data[b]?.length || 0) - (data[a]?.length || 0));
}

function checkBookmarkStates() {
  const btns = document.querySelectorAll(".tab-bookmark");
  const urls = [...new Set([...btns].map(b => b.dataset.bookmarkUrl).filter(Boolean))];
  if (!urls.length) return;
  chrome.runtime.sendMessage({ type: "CHECK_BOOKMARKS", urls }, ({ bookmarked }) => {
    const set = new Set(bookmarked);
    btns.forEach(btn => {
      const isBookmarked = set.has(btn.dataset.bookmarkUrl);
      btn.textContent = isBookmarked ? "★" : "☆";
      btn.classList.toggle("bookmarked", isBookmarked);
      btn.title = isBookmarked ? "Remove bookmark" : "Bookmark this tab";
    });
  });
}

function toggleBookmark(btn) {
  const url = btn.dataset.bookmarkUrl;
  const card = btn.closest(".tab-card");
  const title = card?.dataset.title || url;

  if (btn.classList.contains("bookmarked")) {
    // Already bookmarked → open edit popover
    openBookmarkPopover(btn, url);
  } else {
    // Not bookmarked → add
    btn.disabled = true;
    chrome.runtime.sendMessage({ type: "TOGGLE_BOOKMARK", url, title }, ({ bookmarked }) => {
      btn.disabled = false;
      btn.textContent = bookmarked ? "★" : "☆";
      btn.classList.toggle("bookmarked", bookmarked);
      btn.title = bookmarked ? "Remove bookmark" : "Bookmark this tab";
      showToast("Bookmarked!");
      if (bookmarked) openBookmarkPopover(btn, url);
    });
  }
}

let bmCurrentId = null;
let bmCurrentBtn = null;

function openBookmarkPopover(btn, url) {
  const popover = document.getElementById("bookmarkPopover");
  bmCurrentBtn = btn;

  // Position popover near the button
  const rect = btn.getBoundingClientRect();
  const pw = 280;
  let left = rect.right + 8;
  if (left + pw > window.innerWidth - 12) left = rect.left - pw - 8;
  popover.style.left = `${Math.max(8, left)}px`;
  popover.style.top  = `${Math.min(rect.top, window.innerHeight - 200)}px`;
  popover.classList.remove("hidden");

  // Fetch bookmark info + folder list in parallel
  chrome.runtime.sendMessage({ type: "GET_BOOKMARK_INFO", url }, (info) => {
    if (!info) { popover.classList.add("hidden"); return; }
    bmCurrentId = info.id;
    document.getElementById("bmTitle").value = info.title;

    chrome.runtime.sendMessage({ type: "GET_BOOKMARK_FOLDERS" }, ({ folders }) => {
      const sel = document.getElementById("bmFolder");
      sel.innerHTML = folders.map(f => {
        const indent = "  ".repeat(Math.max(0, getDepth(f, folders) - 1));
        return `<option value="${escHtml(f.id)}" ${f.id === info.parentId ? "selected" : ""}>${indent}${escHtml(f.title || "Bookmarks bar")}</option>`;
      }).join("");
    });
  });
}

function getDepth(folder, all, depth = 0) {
  if (!folder.parentId || depth > 8) return depth;
  const parent = all.find(f => f.id === folder.parentId);
  return parent ? getDepth(parent, all, depth + 1) : depth;
}

function initBookmarkPopover() {
  const popover = document.getElementById("bookmarkPopover");

  document.getElementById("bmClose").addEventListener("click", () => {
    popover.classList.add("hidden");
  });

  document.getElementById("bmSave").addEventListener("click", () => {
    if (!bmCurrentId) return;
    const title    = document.getElementById("bmTitle").value.trim();
    const parentId = document.getElementById("bmFolder").value;
    chrome.runtime.sendMessage({ type: "UPDATE_BOOKMARK", id: bmCurrentId, title, parentId }, () => {
      popover.classList.add("hidden");
      showToast("Bookmark saved");
    });
  });

  document.getElementById("bmRemove").addEventListener("click", () => {
    if (!bmCurrentId) return;
    chrome.runtime.sendMessage({ type: "REMOVE_BOOKMARK", id: bmCurrentId }, () => {
      popover.classList.add("hidden");
      if (bmCurrentBtn) {
        bmCurrentBtn.textContent = "☆";
        bmCurrentBtn.classList.remove("bookmarked");
        bmCurrentBtn.title = "Bookmark this tab";
      }
      bmCurrentId = null;
      bmCurrentBtn = null;
      showToast("Bookmark removed");
    });
  });

  // Enter key saves
  document.getElementById("bmTitle").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("bmSave").click();
    if (e.key === "Escape") popover.classList.add("hidden");
    e.stopPropagation();
  });

  // Click outside closes
  document.addEventListener("click", (e) => {
    if (!popover.classList.contains("hidden") &&
        !popover.contains(e.target) &&
        !e.target.closest(".tab-bookmark")) {
      popover.classList.add("hidden");
    }
  });
}

function renderLegend() {
  const container = document.getElementById("legendItems");
  const ordered = getOrderedCategories(allTabData);
  container.innerHTML = ordered
    .filter(k => allTabData[k]?.length)
    .map(k => {
      const tabs = allTabData[k];
      const meta = getCategoryMeta(k);
      // Use first tab's favicon; fall back to color dot
      const favicon = tabs[0]?.favIconUrl || (tabs[0]?.url ? getFavicon(tabs[0].url) : null);
      const iconHtml = favicon
        ? `<img class="legend-item-icon" src="${escHtml(favicon)}" alt=""
               onerror="this.style.display='none';this.nextElementSibling.style.display='inline-block'"
           ><span class="legend-dot" style="background:${meta.color};display:none"></span>`
        : `<span class="legend-dot" style="background:${meta.color}"></span>`;

      return `
        <div class="legend-item" data-scroll-to="${escHtml(k)}">
          ${iconHtml}
          <span class="legend-item-name">${escHtml(k)}</span>
          <span class="legend-count">${tabs.length}</span>
        </div>
      `;
    }).join("");

  // Click → scroll + highlight group card
  container.querySelectorAll(".legend-item").forEach(item => {
    item.addEventListener("click", () => {
      const cat = item.dataset.scrollTo;
      const groupId = `group-${cat.replace(/[^a-zA-Z0-9]/g, "-")}`;
      const card = document.getElementById(groupId);
      if (!card) return;

      // Legend item active state
      container.querySelectorAll(".legend-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      // Expand if collapsed
      card.classList.remove("collapsed");

      // Highlight the card
      document.querySelectorAll(".group-card.legend-highlight")
        .forEach(c => c.classList.remove("legend-highlight"));
      card.classList.add("legend-highlight");

      card.scrollIntoView({ behavior: "smooth", block: "start" });

      // Remove both highlights after 2s
      setTimeout(() => {
        item.classList.remove("active");
        card.classList.remove("legend-highlight");
      }, 2000);
    });
  });
}

function loadTabs() {
  const btn = document.getElementById("refreshBtn");
  btn.classList.add("spinning");
  chrome.runtime.sendMessage({ type: "GET_TABS" }, (resp) => {
    if (resp) {
      allTabData = resp.tabs || {};
      allCategories = resp.categories || [];
      allNameMap = resp.nameMap || {};
      // Reverse-sort each group by tab open order (newest first)
      for (const cat of Object.keys(allTabData)) {
        allTabData[cat].sort((a, b) => b.index - a.index);
      }
    }
    renderGroups();
    btn.classList.remove("spinning");
  });
}

function focusTab(tabId, windowId) {
  chrome.runtime.sendMessage({ type: "FOCUS_TAB", tabId, windowId });
}

function closeTabById(event, tabId) {
  event.stopPropagation();
  chrome.runtime.sendMessage({ type: "CLOSE_TAB", tabId }, () => {
    for (const cat of Object.keys(allTabData)) {
      allTabData[cat] = allTabData[cat].filter(t => t.id !== tabId);
      if (allTabData[cat].length === 0) delete allTabData[cat];
    }
    renderGroups();
    shootFireworks(1);
    showToast("Tab closed");
  });
}

function closeGroupByName(event, category) {
  event.stopPropagation();
  const tabs = allTabData[category];
  if (!tabs || tabs.length === 0) return;

  if (tabs.length === 1) {
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage({ type: "CLOSE_TAB", tabId }, () => {
      delete allTabData[category];
      renderGroups();
      shootFireworks(1);
      showToast(`Closed 1 tab`);
    });
    return;
  }

  showConfirm(
    `Close all ${tabs.length} tabs in "${category}"?`,
    () => {
      const ids = tabs.map(t => t.id);
      chrome.runtime.sendMessage({ type: "CLOSE_TABS", tabIds: ids }, () => {
        delete allTabData[category];
        renderGroups();
        shootFireworks(Math.min(ids.length, 5));
        showToast(`Closed ${ids.length} tabs`);
      });
    }
  );
}

function toggleGroup(groupId) {
  const card = document.getElementById(groupId);
  if (card) card.classList.toggle("collapsed");
}

function shootFireworks(count = 1) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // First burst near center
  fireworks.launch(w * (0.35 + Math.random() * 0.3), h * (0.3 + Math.random() * 0.3));
  for (let i = 1; i < count; i++) {
    setTimeout(() => {
      fireworks.launch(w * (0.2 + Math.random() * 0.6), h * (0.2 + Math.random() * 0.5));
    }, i * 130);
  }
}

function closeDuplicates() {
  const seen = new Map();
  const toClose = [];
  for (const tabs of Object.values(allTabData)) {
    for (const tab of tabs) {
      const key = tab.url;
      if (seen.has(key)) {
        toClose.push(tab.id);
      } else {
        seen.set(key, tab.id);
      }
    }
  }
  if (toClose.length === 0) {
    showToast("No duplicates found!");
    return;
  }
  showConfirm(`Close ${toClose.length} duplicate tab${toClose.length > 1 ? "s" : ""}?`, () => {
    chrome.runtime.sendMessage({ type: "CLOSE_TABS", tabIds: toClose }, () => {
      loadTabs();
      shootFireworks(Math.min(toClose.length, 5));
      showToast(`Closed ${toClose.length} duplicate${toClose.length > 1 ? "s" : ""}`);
    });
  });
}

function showConfirm(text, onYes) {
  const modal = document.getElementById("confirmModal");
  document.getElementById("confirmText").textContent = text;
  modal.classList.remove("hidden");

  const yesBtn = document.getElementById("confirmYes");
  const noBtn = document.getElementById("confirmNo");

  const cleanup = () => {
    modal.classList.add("hidden");
    yesBtn.removeEventListener("click", onYesClick);
    noBtn.removeEventListener("click", onNoClick);
  };
  const onYesClick = () => { cleanup(); onYes(); };
  const onNoClick = () => cleanup();

  yesBtn.addEventListener("click", onYesClick);
  noBtn.addEventListener("click", onNoClick);
  modal.addEventListener("click", (e) => { if (e.target === modal) cleanup(); }, { once: true });
}

function startRename(nameEl) {
  if (nameEl.querySelector("input")) return; // already editing
  const currentName = nameEl.dataset.editName;
  const rawKey = nameEl.dataset.rawKey;
  const color = nameEl.style.color;

  const input = document.createElement("input");
  input.className = "group-name-input";
  input.value = currentName;
  input.style.color = color;
  input.setAttribute("data-renaming", "true");

  // Swap span content for input
  nameEl.textContent = "";
  nameEl.appendChild(input);
  input.focus();
  input.select();

  // Stop chevron toggle while editing
  const chevronEl = nameEl.closest(".group-header")?.querySelector("[data-toggle]");
  chevronEl?.setAttribute("data-toggle-paused", "true");

  const commit = () => {
    const newName = input.value.trim();
    chevronEl?.removeAttribute("data-toggle-paused");

    if (!newName || newName === currentName) {
      // Restore original display without saving
      nameEl.textContent = currentName;
      nameEl.dataset.editName = currentName;
      return;
    }

    chrome.runtime.sendMessage({ type: "RENAME_CATEGORY", rawKey, newName }, () => {
      showToast(`Renamed to "${newName}"`);
      loadTabs();
    });
  };

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.value = currentName; input.blur(); }
    e.stopPropagation();
  });
  // Prevent header click-to-toggle while typing
  input.addEventListener("click", (e) => e.stopPropagation());
}

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 2200);
}

function init() {
  const canvas = document.getElementById("fireworksCanvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
  fireworks = new FireworksEngine(canvas);
  initBookmarkPopover();

  loadTabs();

  document.getElementById("refreshBtn").addEventListener("click", loadTabs);
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderGroups();
  });

  document.getElementById("collapseAll").addEventListener("click", () => {
    document.querySelectorAll(".group-card").forEach(c => c.classList.add("collapsed"));
  });

  document.getElementById("expandAll").addEventListener("click", () => {
    document.querySelectorAll(".group-card").forEach(c => c.classList.remove("collapsed"));
  });

  document.getElementById("closeDuplicates").addEventListener("click", closeDuplicates);

  // Event delegation for tab cards (replaces inline onclick/ondragstart)
  const tabGroupsEl = document.getElementById("tabGroups");
  tabGroupsEl.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-close-id]");
    if (closeBtn) {
      e.stopPropagation();
      closeTabById(e, parseInt(closeBtn.dataset.closeId, 10));
      return;
    }
    const closeGroupBtn = e.target.closest("[data-close-group]");
    if (closeGroupBtn) {
      e.stopPropagation();
      closeGroupByName(e, closeGroupBtn.dataset.closeGroup);
      return;
    }
    // Click the edit-pen icon → rename
    const editBtn = e.target.closest("[data-edit-trigger]");
    if (editBtn) {
      e.stopPropagation();
      const nameEl = editBtn.closest(".group-name-wrap").querySelector("[data-edit-name]");
      if (nameEl) startRename(nameEl);
      return;
    }
    // Click the group name text → rename
    const nameEl = e.target.closest("[data-edit-name]");
    if (nameEl) {
      e.stopPropagation();
      startRename(nameEl);
      return;
    }
    // Click bookmark button
    const bookmarkBtn = e.target.closest(".tab-bookmark");
    if (bookmarkBtn) {
      e.stopPropagation();
      toggleBookmark(bookmarkBtn);
      return;
    }
    // Click the chevron → toggle collapse
    const chevron = e.target.closest("[data-toggle]");
    if (chevron && !chevron.hasAttribute("data-toggle-paused")) {
      toggleGroup(chevron.dataset.toggle);
      return;
    }
    const card = e.target.closest(".tab-card");
    if (card) {
      const tabId = parseInt(card.dataset.tabId, 10);
      const windowId = parseInt(card.dataset.windowId, 10);
      focusTab(tabId, windowId);
    }
  });

  // Single-click or double-click on group name → rename
  tabGroupsEl.addEventListener("dblclick", (e) => {
    const nameEl = e.target.closest("[data-edit-name]");
    if (!nameEl) return;
    e.stopPropagation();
    startRename(nameEl);
  });


  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      document.getElementById("searchInput").focus();
    }
    if (e.key === "Escape") {
      const search = document.getElementById("searchInput");
      if (document.activeElement === search && search.value) {
        search.value = "";
        searchQuery = "";
        renderGroups();
      } else {
        search.blur();
      }
    }
  });

  chrome.tabs.onUpdated.addListener(() => loadTabs());
  chrome.tabs.onRemoved.addListener(() => loadTabs());
  chrome.tabs.onCreated.addListener(() => loadTabs());

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderGroups(), 120);
  });
}

document.addEventListener("DOMContentLoaded", init);
