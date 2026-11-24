const CATEGORIES = {
  "agentes-ia": { label: "Agentes IA & Skills", color: "var(--cat-agentes-ia)" },
  "3d-cad-bim": { label: "3D, CAD & BIM", color: "var(--cat-3d-cad-bim)" },
  "video-diseno": { label: "Vídeo, Audio & Diseño", color: "var(--cat-video-diseno)" },
  "modelos-llm": { label: "Modelos IA & Local LLM", color: "var(--cat-modelos-llm)" },
  "desarrollo-oss": { label: "Desarrollo & Open Source", color: "var(--cat-desarrollo-oss)" },
  "impresion-3d": { label: "Impresión 3D & Maker", color: "var(--cat-impresion-3d)" },
  "noticias-guias": { label: "Noticias, Guías & Comunidad", color: "var(--cat-noticias-guias)" },
};

const TYPES = {
  all: { label: "Todos" },
  github: { label: "GitHub" },
  web: { label: "Webs & Apps" },
  huggingface: { label: "Hugging Face" },
  x: { label: "Hilos X" },
  favorites: { label: "Favoritos ★" },
};

const state = {
  items: [],
  query: "",
  category: "all",
  type: "all",
  tag: "",
  groupBy: "grid",
  sortBy: "date-desc",
  favorites: new Set(),
};

const cardNodeCache = new Map();

const els = {
  catalogRoot: document.getElementById("catalog-root"),
  emptyState: document.getElementById("empty-state"),
  searchInput: document.getElementById("search-input"),
  searchClear: document.getElementById("search-clear"),
  categoryFilters: document.getElementById("category-filters"),
  typeFilters: document.getElementById("type-filters"),
  activeTagWrap: document.getElementById("active-tag-wrap"),
  activeTagBtn: document.getElementById("active-tag-btn"),
  resultsCount: document.getElementById("results-count"),
  resetFilters: document.getElementById("reset-filters"),
  emptyReset: document.getElementById("empty-reset"),
  sortSelect: document.getElementById("sort-select"),
  reorderStatus: document.getElementById("reorder-status"),
  themeToggle: document.getElementById("theme-toggle"),
  statTotal: document.getElementById("stat-total"),
  statGithub: document.getElementById("stat-github"),
  statWeb: document.getElementById("stat-web"),
  dialog: document.getElementById("detail-dialog"),
  dialogBadges: document.getElementById("dialog-badges"),
  dialogTitle: document.getElementById("dialog-title"),
  dialogDesc: document.getElementById("dialog-desc"),
  dialogAuthor: document.getElementById("dialog-author"),
  dialogDate: document.getElementById("dialog-date"),
  dialogOriginal: document.getElementById("dialog-original"),
  dialogTags: document.getElementById("dialog-tags"),
  dialogLinks: document.getElementById("dialog-links"),
};

/* --- Dark Mode Two-State Toggle (modern-web-guidance: dark-mode-toggle) --- */
function initThemeToggle() {
  const meta = document.querySelector('meta[name="color-scheme"]');
  const getSystemScheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const applyFromStorage = () => {
    try {
      meta.content = localStorage.getItem("color-scheme") ?? "light dark";
    } catch (_) {
      meta.content = "light dark";
    }
  };

  els.themeToggle.addEventListener("click", () => {
    const system = getSystemScheme();
    let stored = null;
    try {
      stored = localStorage.getItem("color-scheme");
    } catch (_) {}
    const current = stored === "light" || stored === "dark" ? stored : system;
    const target = current === "dark" ? "light" : "dark";

    if (target === system) {
      meta.content = "light dark";
      try {
        localStorage.removeItem("color-scheme");
      } catch (_) {}
    } else {
      meta.content = target;
      try {
        localStorage.setItem("color-scheme", target);
      } catch (_) {}
    }
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "color-scheme") applyFromStorage();
  });
}

/* --- Dialog Light-Dismiss Fallback (modern-web-guidance: light-dismiss-a-dialog) --- */
function initDialogFallback() {
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    els.dialog.addEventListener("click", (event) => {
      if (event.target !== els.dialog) return;
      const rect = els.dialog.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInside) els.dialog.close();
    });
  }
}

/* --- Favorites Persistence --- */
function loadFavorites() {
  try {
    const raw = localStorage.getItem("x-reposts-favorites");
    if (raw) state.favorites = new Set(JSON.parse(raw));
  } catch (_) {}
}

function saveFavorites() {
  try {
    localStorage.setItem("x-reposts-favorites", JSON.stringify([...state.favorites]));
  } catch (_) {}
}

/* --- Dynamic Sort DOM Reorder (modern-web-guidance: dynamic-sort) --- */
function reorderContainer(container, orderedNodes) {
  const supportsMoveBefore = Object.hasOwn(Element.prototype, "moveBefore");
  for (const node of orderedNodes) {
    // moveBefore() requires the node to already be connected in the same document tree
    if (supportsMoveBefore && node.isConnected && node.getRootNode() === container.getRootNode()) {
      container.moveBefore(node, null);
    } else {
      container.append(node);
    }
  }
}

function reorderWithTransition(container, orderedNodes) {
  const update = () => reorderContainer(container, orderedNodes);
  // Skip expensive transitions on large lists (> 120 items)
  if (orderedNodes.length > 120) {
    update();
    return;
  }
  if (container.startViewTransition) {
    container.startViewTransition(update);
  } else if (document.startViewTransition) {
    document.startViewTransition(update);
  } else {
    update();
  }
}

/* --- Helpers --- */
function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function typeLabel(type) {
  if (type === "github") return "GitHub";
  if (type === "huggingface") return "Hugging Face";
  if (type === "web") return "Web";
  return "X";
}

function primaryCtaLabel(type) {
  if (type === "github") return "GitHub ↗";
  if (type === "huggingface") return "Modelo ↗";
  if (type === "web") return "Abrir web ↗";
  return "Ver en X ↗";
}

function buildCardElement(item) {
  const cat = CATEGORIES[item.category] || { label: item.category, color: "var(--accent)" };
  const article = document.createElement("article");
  article.className = "card";
  article.dataset.id = item.id;
  article.style.setProperty("--card-accent", cat.color);

  const isFav = state.favorites.has(item.id);

  article.innerHTML = `
    <div class="card-top">
      <div class="card-badges">
        <span class="cat-badge">${cat.label}</span>
        <span class="type-badge">${typeLabel(item.type)}</span>
      </div>
      <button type="button" class="fav-btn" aria-label="Guardar en favoritos" aria-pressed="${isFav}">
        ${isFav ? "★" : "☆"}
      </button>
    </div>
    <h3 class="card-title">
      <a href="${item.primaryUrl}" target="_blank" rel="noopener noreferrer"></a>
    </h3>
    <p class="card-desc"></p>
    <div class="card-tags"></div>
    <div class="card-footer">
      <div class="card-meta">
        <span class="card-handle"></span>
        <span class="card-date">${formatDate(item.date)}</span>
      </div>
      <div class="card-actions">
        <button type="button" class="btn-ghost detail-trigger">Detalles</button>
        <a class="btn-link" href="${item.primaryUrl}" target="_blank" rel="noopener noreferrer">${primaryCtaLabel(item.type)}</a>
      </div>
    </div>
  `;

  article.querySelector(".card-title a").textContent = item.title;
  article.querySelector(".card-desc").textContent = item.description;
  article.querySelector(".card-handle").textContent = item.handle || item.author;

  const tagsWrap = article.querySelector(".card-tags");
  for (const tag of item.tags || []) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-pill";
    btn.textContent = `#${tag}`;
    btn.addEventListener("click", () => {
      state.tag = state.tag === tag ? "" : tag;
      render();
    });
    tagsWrap.append(btn);
  }

  const favBtn = article.querySelector(".fav-btn");
  favBtn.addEventListener("click", () => {
    if (state.favorites.has(item.id)) {
      state.favorites.delete(item.id);
    } else {
      state.favorites.add(item.id);
    }
    saveFavorites();
    const nowFav = state.favorites.has(item.id);
    favBtn.setAttribute("aria-pressed", String(nowFav));
    favBtn.textContent = nowFav ? "★" : "☆";
    renderTypePills();
    if (state.type === "favorites") render();
  });

  article.querySelector(".detail-trigger").addEventListener("click", () => openDetailModal(item));
  return article;
}

function getCardNode(item) {
  let node = cardNodeCache.get(item.id);
  if (!node) {
    node = buildCardElement(item);
    cardNodeCache.set(item.id, node);
  }
  const favBtn = node.querySelector(".fav-btn");
  const isFav = state.favorites.has(item.id);
  favBtn.setAttribute("aria-pressed", String(isFav));
  favBtn.textContent = isFav ? "★" : "☆";
  return node;
}

function openDetailModal(item) {
  const cat = CATEGORIES[item.category] || { label: item.category, color: "var(--accent)" };
  els.dialogBadges.innerHTML = "";

  const catSpan = document.createElement("span");
  catSpan.className = "cat-badge";
  catSpan.style.setProperty("--card-accent", cat.color);
  catSpan.textContent = cat.label;

  const typeSpan = document.createElement("span");
  typeSpan.className = "type-badge";
  typeSpan.textContent = `${typeLabel(item.type)} · ${item.domain}`;

  els.dialogBadges.append(catSpan, typeSpan);

  els.dialogTitle.textContent = item.title;
  els.dialogDesc.textContent = item.description;
  els.dialogAuthor.textContent = `${item.author} (${item.handle})`;
  els.dialogDate.textContent = formatDate(item.date);
  els.dialogOriginal.textContent = item.originalText;

  els.dialogTags.innerHTML = "";
  for (const tag of item.tags || []) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-pill";
    btn.textContent = `#${tag}`;
    btn.addEventListener("click", () => {
      state.tag = tag;
      els.dialog.close();
      render();
    });
    els.dialogTags.append(btn);
  }

  els.dialogLinks.innerHTML = "";
  const primary = document.createElement("a");
  primary.className = "btn-primary";
  primary.href = item.primaryUrl;
  primary.target = "_blank";
  primary.rel = "noopener noreferrer";
  primary.textContent = primaryCtaLabel(item.type);
  els.dialogLinks.append(primary);

  if (item.tweetUrl && item.tweetUrl !== item.primaryUrl) {
    const tweetLink = document.createElement("a");
    tweetLink.className = "btn-ghost";
    tweetLink.href = item.tweetUrl;
    tweetLink.target = "_blank";
    tweetLink.rel = "noopener noreferrer";
    tweetLink.textContent = "Ver tweet original en X ↗";
    els.dialogLinks.append(tweetLink);
  }

  for (const extra of item.extraUrls || []) {
    const a = document.createElement("a");
    a.className = "btn-ghost";
    a.href = extra;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    try {
      a.textContent = `${new URL(extra).hostname.replace("www.", "")} ↗`;
    } catch (_) {
      a.textContent = "Enlace adicional ↗";
    }
    els.dialogLinks.append(a);
  }

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "btn-ghost";
  copyBtn.textContent = "Copiar enlace";
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(item.primaryUrl);
      copyBtn.textContent = "¡Copiado!";
      setTimeout(() => (copyBtn.textContent = "Copiar enlace"), 1600);
    } catch (_) {}
  });
  els.dialogLinks.append(copyBtn);

  els.dialog.showModal();
}

/* --- Filtering & Sorting --- */
function getFilteredItems() {
  const q = state.query.trim().toLowerCase();
  const filtered = state.items.filter((item) => {
    if (state.category !== "all" && item.category !== state.category) return false;
    if (state.type === "favorites") {
      if (!state.favorites.has(item.id)) return false;
    } else if (state.type !== "all" && item.type !== state.type) {
      return false;
    }
    if (state.tag && !(item.tags || []).includes(state.tag)) return false;
    if (q) {
      const hay = [
        item.title,
        item.description,
        item.originalText,
        item.author,
        item.handle,
        item.domain,
        ...(item.tags || []),
        CATEGORIES[item.category]?.label || "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (state.sortBy === "date-asc") return (a.date || "").localeCompare(b.date || "");
    if (state.sortBy === "title-asc") return a.title.localeCompare(b.title, "es");
    if (state.sortBy === "github-first") {
      const pa = a.type === "github" ? 0 : a.type === "huggingface" ? 1 : a.type === "web" ? 2 : 3;
      const pb = b.type === "github" ? 0 : b.type === "huggingface" ? 1 : b.type === "web" ? 2 : 3;
      if (pa !== pb) return pa - pb;
    }
    return (b.date || "").localeCompare(a.date || "");
  });

  return filtered;
}

function renderCategoryPills() {
  const counts = {};
  for (const item of state.items) {
    counts[item.category] = (counts[item.category] || 0) + 1;
  }

  els.categoryFilters.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `filter-pill ${state.category === "all" ? "is-active" : ""}`;
  allBtn.setAttribute("aria-pressed", String(state.category === "all"));
  allBtn.innerHTML = `<span>Todas</span><span class="pill-count">${state.items.length}</span>`;
  allBtn.addEventListener("click", () => {
    state.category = "all";
    render();
  });
  els.categoryFilters.append(allBtn);

  for (const [key, meta] of Object.entries(CATEGORIES)) {
    const count = counts[key] || 0;
    if (!count) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `filter-pill ${state.category === key ? "is-active" : ""}`;
    btn.setAttribute("aria-pressed", String(state.category === key));
    btn.innerHTML = `<span class="pill-dot" style="background:${meta.color}"></span><span>${meta.label}</span><span class="pill-count">${count}</span>`;
    btn.addEventListener("click", () => {
      state.category = state.category === key ? "all" : key;
      render();
    });
    els.categoryFilters.append(btn);
  }
}

function renderTypePills() {
  const counts = { all: state.items.length, favorites: state.favorites.size };
  for (const item of state.items) {
    counts[item.type] = (counts[item.type] || 0) + 1;
  }

  els.typeFilters.innerHTML = "";
  for (const [key, meta] of Object.entries(TYPES)) {
    const count = counts[key] || 0;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `filter-pill ${state.type === key ? "is-active" : ""}`;
    btn.setAttribute("aria-pressed", String(state.type === key));
    btn.innerHTML = `<span>${meta.label}</span><span class="pill-count">${count}</span>`;
    btn.addEventListener("click", () => {
      state.type = state.type === key ? "all" : key;
      render();
    });
    els.typeFilters.append(btn);
  }
}

function render(isSortOnly = false) {
  const filtered = getFilteredItems();

  renderCategoryPills();
  renderTypePills();

  const hasActiveFilters =
    Boolean(state.query.trim()) ||
    state.category !== "all" ||
    state.type !== "all" ||
    Boolean(state.tag);

  els.resetFilters.hidden = !hasActiveFilters;
  els.searchClear.hidden = !state.query.length;
  els.activeTagWrap.hidden = !state.tag;
  if (state.tag) els.activeTagBtn.textContent = `#${state.tag} ×`;

  els.resultsCount.textContent = `${filtered.length} de ${state.items.length} recursos`;

  if (filtered.length === 0) {
    els.catalogRoot.innerHTML = "";
    els.emptyState.hidden = false;
    return;
  }
  els.emptyState.hidden = true;

  const nodes = filtered.map((item, idx) => {
    const node = getCardNode(item);
    // Apply content-visibility: auto strictly to below-the-fold cards (index >= 9)
    node.classList.toggle("deferred-card", idx >= 9);
    return node;
  });

  if (state.groupBy === "grid") {
    let grid = els.catalogRoot.querySelector(":scope > .cards-grid");
    if (!grid) {
      els.catalogRoot.innerHTML = "";
      grid = document.createElement("div");
      grid.className = "cards-grid";
      els.catalogRoot.append(grid);
    }

    // Remove nodes no longer in filtered set
    const activeSet = new Set(nodes);
    for (const child of [...grid.children]) {
      if (!activeSet.has(child)) child.remove();
    }

    if (isSortOnly) {
      reorderWithTransition(grid, nodes);
      const sortLabel = els.sortSelect.options[els.sortSelect.selectedIndex]?.text || "";
      els.reorderStatus.textContent = `Ordenado por ${sortLabel}, ${nodes.length} recursos`;
    } else {
      reorderContainer(grid, nodes);
    }
    return;
  }

  // Grouped views (by category or by type)
  els.catalogRoot.innerHTML = "";
  const groups = new Map();
  for (const item of filtered) {
    const key = state.groupBy === "category" ? item.category : item.type;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const orderedKeys =
    state.groupBy === "category"
      ? Object.keys(CATEGORIES).filter((k) => groups.has(k))
      : ["github", "web", "huggingface", "x"].filter((k) => groups.has(k));

  let globalIndex = 0;
  for (const key of orderedKeys) {
    const groupItems = groups.get(key);
    const title =
      state.groupBy === "category" ? CATEGORIES[key]?.label || key : TYPES[key]?.label || key;
    const dotColor = state.groupBy === "category" ? CATEGORIES[key]?.color : "var(--accent)";

    const details = document.createElement("details");
    details.className = "group-section";
    details.open = true;

    details.innerHTML = `
      <summary class="group-summary">
        <div class="group-title-wrap">
          <span class="pill-dot" style="background:${dotColor}; width:10px; height:10px;"></span>
          <h2 class="group-title">${title}</h2>
          <span class="group-count">${groupItems.length}</span>
        </div>
        <svg class="group-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </summary>
      <div class="cards-grid"></div>
    `;

    const grid = details.querySelector(".cards-grid");
    for (const item of groupItems) {
      const node = getCardNode(item);
      node.classList.toggle("deferred-card", globalIndex >= 9);
      grid.append(node);
      globalIndex++;
    }
    els.catalogRoot.append(details);
  }
}

function resetAllFilters() {
  state.query = "";
  state.category = "all";
  state.type = "all";
  state.tag = "";
  els.searchInput.value = "";
  render();
}

async function loadData() {
  if (Array.isArray(window.PROJECTS_DATA) && window.PROJECTS_DATA.length) {
    return window.PROJECTS_DATA;
  }
  const res = await fetch("./data/projects.json");
  if (!res.ok) throw new Error("No se pudo cargar data/projects.json");
  return res.json();
}

async function init() {
  initThemeToggle();
  initDialogFallback();
  loadFavorites();

  try {
    state.items = await loadData();
  } catch (err) {
    els.catalogRoot.innerHTML = `<p style="color:var(--text-muted)">Error cargando el catálogo: ${err.message}</p>`;
    return;
  }

  els.statTotal.textContent = state.items.length;
  els.statGithub.textContent = state.items.filter((i) => i.type === "github").length;
  els.statWeb.textContent = state.items.filter((i) => i.type === "web" || i.type === "huggingface").length;

  els.searchInput.addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });

  els.searchClear.addEventListener("click", () => {
    state.query = "";
    els.searchInput.value = "";
    els.searchInput.focus();
    render();
  });

  els.activeTagBtn.addEventListener("click", () => {
    state.tag = "";
    render();
  });

  els.resetFilters.addEventListener("click", resetAllFilters);
  els.emptyReset.addEventListener("click", resetAllFilters);

  els.sortSelect.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    render(true);
  });

  document.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".seg-btn").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-pressed", String(b === btn));
      });
      state.groupBy = btn.dataset.group;
      render();
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== els.searchInput && !els.dialog.open) {
      e.preventDefault();
      els.searchInput.focus();
    } else if (e.key === "Escape" && document.activeElement === els.searchInput && state.query) {
      state.query = "";
      els.searchInput.value = "";
      render();
    }
  });

  render();
}

init();
