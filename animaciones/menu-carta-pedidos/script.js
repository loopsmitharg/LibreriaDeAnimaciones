/**
 * Carta con filtros de dos niveles, modal de opciones y panel de pedido.
 * Base: María Paula Confitería, js/main.js → secciones 5 (filtros), 6 (pedido),
 * 7 (modal de opciones) y 8 (delegación de eventos).
 *
 * Cambios respecto del original: nombres y opciones se insertan con textContent
 * (el original armaba innerHTML con el nombre del producto) y la clave de
 * localStorage es configurable.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "libreria_demo_pedido"; // cambiar por proyecto
  const money = (n) => "$" + Number(n || 0).toLocaleString("es-AR");

  /* ---- Toast ------------------------------------------------------------ */
  let toastTimeout = null;
  function showToast(message, duration = 2000, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle("is-error", type === "error");
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), duration);
  }

  /* ---- 5. Filtros de la carta ------------------------------------------ */
  let filterRafId = null;

  // Agrupa el filtrado en un frame: muchos clics seguidos = un solo recorrido.
  function filterItems(categories) {
    if (filterRafId) cancelAnimationFrame(filterRafId);
    filterRafId = requestAnimationFrame(() => {
      const isAll = categories.includes("all");
      document.querySelectorAll(".menu-card-rich").forEach((item) => {
        const match = isAll || categories.some((cat) => item.classList.contains("category-" + cat));
        item.classList.toggle("hidden", !match);
      });
      filterRafId = null;
    });
  }

  // Lleva la grilla bajo el header para que el filtrado se vea.
  function scrollToMenu() {
    const container = document.querySelector(".filter-sticky-container");
    if (!container) return;
    const header = document.getElementById("site-header");
    const target = container.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 70);
    if (Math.abs(window.scrollY - target) > 25) window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }

  const centerPill = (btn) => btn?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" });

  function filterMenu(category, isSubmenu, clickedBtn) {
    const mainFilters = document.querySelectorAll(".main-filter");
    const subFilters = document.querySelectorAll(".sub-filter");
    scrollToMenu();

    // Entrar a un submenú: se ocultan los principales y se muestran los de ese grupo.
    if (isSubmenu) {
      mainFilters.forEach((el) => el.classList.add("hidden"));
      subFilters.forEach((el) => { el.classList.add("hidden"); el.classList.remove("active"); });
      document.querySelectorAll(".sub-" + category).forEach((el) => el.classList.remove("hidden"));
      filterItems([category]);
      const allOfGroup = document.querySelector(`.sub-${category}[data-filter-category="${category}"]`);
      allOfGroup?.classList.add("active");
      centerPill(allOfGroup);
      return;
    }

    // Volver al nivel principal.
    if (category === "back") {
      subFilters.forEach((el) => { el.classList.add("hidden"); el.classList.remove("active"); });
      mainFilters.forEach((el) => el.classList.remove("hidden"));
      document.querySelectorAll(".filter-pill").forEach((btn) => btn.classList.remove("active"));
      const allBtn = document.querySelector('.filter-pill[data-filter-category="all"]');
      allBtn?.classList.add("active");
      centerPill(allBtn);
      filterItems(["all"]);
      return;
    }

    document.querySelectorAll(".filter-pill").forEach((btn) => btn.classList.remove("active"));
    clickedBtn?.classList.add("active");
    centerPill(clickedBtn);
    filterItems([category]);
  }

  /* ---- 6. Estado del pedido (en memoria, nunca leído del DOM) ----------- */
  let currentOrder = [];

  function saveOrder() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOrder)); } catch (_) {}
  }

  function loadOrder() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      // Se sanea todo lo que vuelve de localStorage: tipos y mínimos.
      currentOrder = Array.isArray(parsed) ? parsed.map((item) => ({
        id: String(item.id || "item_" + Date.now()),
        name: String(item.name || "").trim(),
        price: Math.max(0, Number(item.price) || 0),
        qty: Math.max(1, parseInt(item.qty, 10) || 1),
      })) : [];
    } catch (_) {
      currentOrder = [];
    }
    renderOrder();
  }

  function updateBadge() {
    const badge = document.getElementById("orderBadge");
    if (!badge) return;
    const total = currentOrder.reduce((acc, item) => acc + item.qty, 0);
    badge.textContent = String(total);
    badge.classList.toggle("hidden", total === 0);
  }

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function renderOrder() {
    const container = document.getElementById("orderItemsContainer");
    const totalEl = document.getElementById("orderTotal");
    if (!container || !totalEl) return;
    container.replaceChildren();
    let total = 0;

    if (!currentOrder.length) {
      const empty = el("div", "empty-state");
      empty.append("Tu pedido está vacío.", document.createElement("br"), "¡Agregá algo delicioso!");
      container.append(empty);
    }

    currentOrder.forEach((item) => {
      const subtotal = item.price * item.qty;
      total += subtotal;

      const remove = el("button", "btn-remove");
      remove.dataset.action = "remove-from-order";
      remove.dataset.itemId = item.id;
      remove.setAttribute("aria-label", "Eliminar " + item.name);
      remove.append(el("span", "material-icons-round", "delete"));

      const qtyBtn = (delta, label) => {
        const b = el("button", "qty-btn", delta > 0 ? "+" : "−");
        b.dataset.action = "update-quantity";
        b.dataset.itemId = item.id;
        b.dataset.delta = String(delta);
        b.setAttribute("aria-label", label);
        return b;
      };
      const qty = el("div", "qty-controls");
      qty.append(qtyBtn(-1, "Restar cantidad"), el("span", "qty-value", String(item.qty)), qtyBtn(1, "Sumar cantidad"));

      const head = el("div", "order-item-header");
      head.append(el("span", "item-name", item.name), remove);
      const body = el("div", "order-item-body");
      body.append(el("span", "item-price", money(subtotal)), qty);
      const row = el("div", "order-item");
      row.append(head, body);
      container.append(row);
    });

    totalEl.textContent = money(total);
    updateBadge();
  }

  function addToOrder(name, price) {
    const cleanName = String(name || "").trim();
    const existing = currentOrder.find((item) => item.name === cleanName);
    if (existing) existing.qty += 1;
    else currentOrder.push({ id: "item_" + Date.now() + "_" + Math.floor(Math.random() * 1e6), name: cleanName, price: Math.max(0, Number(price) || 0), qty: 1 });
    renderOrder();
    saveOrder();
    showToast("¡Agregado al pedido!");
  }

  function removeFromOrder(id) {
    currentOrder = currentOrder.filter((item) => item.id !== id);
    renderOrder();
    saveOrder();
  }

  function updateQuantity(id, delta) {
    const item = currentOrder.find((i) => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) return removeFromOrder(id);
    renderOrder();
    saveOrder();
  }

  function toggleOrderPanel(force) {
    const panel = document.getElementById("orderPanel");
    if (!panel) return;
    const isOpen = panel.classList.toggle("open", force);
    document.querySelector(".fab-order")?.setAttribute("aria-expanded", String(isOpen));
  }

  /* ---- 7. Modal de opciones -------------------------------------------- */
  let selectingProduct = null;
  let selectingOptions = [];

  function openOptionsModal(name, options) {
    selectingProduct = name;
    selectingOptions = options;
    document.getElementById("modalProductTitle").textContent = name;
    const container = document.getElementById("modalOptionsContainer");
    container.replaceChildren(...options.map((opt, index) => {
      const label = el("label", "option-label" + (index === 0 ? " selected" : ""));
      const info = el("div", "option-info");
      info.append(el("span", "option-name", opt.name));
      const radio = document.createElement("input");
      Object.assign(radio, { type: "radio", name: "productOption", value: String(index), checked: index === 0 });
      label.append(info, el("span", "option-price", money(opt.price)), radio);
      return label;
    }));
    document.getElementById("optionsModal").classList.add("active");
    container.querySelector("input")?.focus({ preventScroll: true });
  }

  function closeOptionsModal() {
    document.getElementById("optionsModal")?.classList.remove("active");
    selectingProduct = null;
    selectingOptions = [];
  }

  function confirmOptionsSelection() {
    const radio = document.querySelector('input[name="productOption"]:checked');
    const opt = radio && selectingOptions[parseInt(radio.value, 10)];
    if (!opt) return;
    const finalName = selectingOptions.length > 1 && opt.name !== "Única" ? `${selectingProduct} (${opt.name})` : selectingProduct;
    addToOrder(finalName, opt.price);
    closeOptionsModal();
  }

  function handleCardAddClick(btn) {
    const card = btn.closest(".menu-card-rich");
    const name = card?.querySelector(".card-title")?.textContent.trim() || "Producto";
    let options;
    try { options = JSON.parse(btn.dataset.options || "[]"); } catch (_) { options = []; }
    if (options.length > 1) openOptionsModal(name, options);
    else if (options.length === 1) addToOrder(name, options[0].price);
    else showToast("El producto no tiene precio cargado.", 3000, "error");
  }

  /* ---- 8. Delegación global de eventos --------------------------------- */
  document.addEventListener("click", (e) => {
    const filterBtn = e.target.closest(".filter-pill[data-filter-category]");
    if (filterBtn) return filterMenu(filterBtn.dataset.filterCategory, filterBtn.dataset.filterIsSub === "true", filterBtn);

    if (e.target.closest('[data-action="toggle-order"]')) return toggleOrderPanel();
    if (e.target.closest('[data-action="close-options-modal"]')) return closeOptionsModal();
    if (e.target.id === "optionsModal") return closeOptionsModal(); // clic en el fondo
    if (e.target.closest('[data-action="confirm-options"]')) return confirmOptionsSelection();

    const addBtn = e.target.closest(".btn-icon-only[data-options]");
    if (addBtn) return handleCardAddClick(addBtn);

    const removeBtn = e.target.closest('[data-action="remove-from-order"]');
    if (removeBtn) return removeFromOrder(removeBtn.dataset.itemId);

    const qtyBtn = e.target.closest('[data-action="update-quantity"]');
    if (qtyBtn) return updateQuantity(qtyBtn.dataset.itemId, parseInt(qtyBtn.dataset.delta, 10) || 0);
  });

  // La opción elegida en el modal se resalta.
  document.addEventListener("change", (e) => {
    const radio = e.target.closest('input[name="productOption"]');
    if (!radio) return;
    document.querySelectorAll(".option-label").forEach((lbl) => lbl.classList.toggle("selected", lbl.contains(radio)));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeOptionsModal();
    toggleOrderPanel(false);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadOrder);
  else loadOrder();
})();
