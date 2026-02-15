import { ORDER_METHOD_LABELS, NUTRITION_KEYS } from "../shared/constants.js";
import { escapeHtml, formatPrice } from "../shared/utils.js";

export function renderSiteInfo(site = {}) {
  const brandNodes = document.querySelectorAll("[data-site-brand]");
  const phoneNodes = document.querySelectorAll("[data-site-phone]");
  const addressNode = document.querySelector("[data-site-address]");
  const workNode = document.querySelector("[data-site-working-hours]");

  for (const node of brandNodes) {
    node.textContent = site.brand || "ТОКИ23";
  }

  for (const node of phoneNodes) {
    node.textContent = site.phone || "+7 (800) 200-65-59";
    if (node.tagName === "A") {
      node.href = `tel:${(site.phone || "+78002006559").replace(/[^\d+]/g, "")}`;
    }
  }

  if (addressNode) {
    const address = site.address || {};
    addressNode.textContent = `${site.city || "Краснодар"}, ${address.street || "Бабушкина"}, ${address.house || "252"}`;
  }

  if (workNode) {
    const work = site.workingHours || { from: "11:00", to: "22:45" };
    workNode.textContent = `${work.from} - ${work.to}`;
  }

  const footerTextNode = document.querySelector("[data-site-footer-text]");
  if (footerTextNode) {
    footerTextNode.textContent = site.footerText || "Доставка роллов и суши в Краснодаре.";
  }
}

export function renderBanners(banners = []) {
  const container = document.querySelector("[data-banners]");
  if (!container) {
    return;
  }

  const limit = typeof window !== "undefined" && window.innerWidth < 640 ? 4 : 6;
  const list = banners.filter((banner) => banner.image).slice(0, limit);
  if (!list.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = list
    .map(
      (banner, index) => `
      <article class="banner-card" style="--stagger:${index}">
        <img src="${escapeHtml(banner.image)}" alt="${escapeHtml(banner.title || "Акция")}" loading="lazy" />
      </article>
    `,
    )
    .join("");
}

export function renderCategories(categories = [], activeCode = "") {
  const container = document.querySelector("[data-categories]");
  if (!container) {
    return;
  }

  container.innerHTML = [
    `<button class="category-chip ${activeCode ? "" : "is-active"}" data-category="">Все</button>`,
    ...categories.map(
      (category) =>
        `<button class="category-chip ${category.code === activeCode ? "is-active" : ""}" data-category="${escapeHtml(category.code)}">${escapeHtml(category.name)}</button>`,
    ),
  ].join("");
}

export function renderProducts(result = { items: [], pagination: null }) {
  const container = document.querySelector("[data-products]");
  if (!container) {
    return;
  }

  if (!result.items.length) {
    container.innerHTML = `<div class="empty-state"><h3>Ничего не найдено</h3><p>Попробуйте изменить фильтр или строку поиска.</p></div>`;
    return;
  }

  container.innerHTML = result.items
    .map((product, index) => {
      const tags = (product.tags || []).slice(0, 2);
      return `
      <article class="product-card" style="--stagger:${index}" data-open-product="${escapeHtml(product.code)}">
        <div class="product-card__image-wrap">
          <img class="product-card__image" src="${escapeHtml(product.imageUrl || "")}" alt="${escapeHtml(product.name)}" loading="lazy" />
          ${!product.isAvailable ? '<span class="product-card__badge">Недоступно</span>' : ""}
        </div>
        <div class="product-card__body">
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description || "Описание отсутствует")}</p>
          <div class="product-card__meta">
            <strong>${formatPrice(product.price)}</strong>
            ${product.weight ? `<span>${escapeHtml(String(product.weight))} г</span>` : ""}
          </div>
          <div class="product-card__footer">
            <div class="tag-row">${tags
              .map((tag) => `<span class="tag">${escapeHtml(tag.text || tag.code)}</span>`)
              .join("")}</div>
            <button class="btn btn--small" data-add-product="${escapeHtml(product.code)}" ${product.isAvailable ? "" : "disabled"}>В корзину</button>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

export function renderPagination(containerSelector, pagination, target = "list") {
  const container = document.querySelector(containerSelector);
  if (!container) {
    return;
  }

  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const pages = [];
  for (let i = 1; i <= pagination.totalPages; i += 1) {
    pages.push(
      `<button class="pager-btn ${i === pagination.page ? "is-active" : ""}" data-page="${i}" data-page-target="${target}">${i}</button>`,
    );
  }

  container.innerHTML = `<div class="pager">${pages.join("")}</div>`;
}

export function renderCart(cartItems = [], total = 0) {
  const list = document.querySelector("[data-cart-items]");
  const totalNode = document.querySelector("[data-cart-total]");
  const checkoutButton = document.querySelector("[data-checkout-submit]");

  if (!list || !totalNode) {
    return;
  }

  if (!cartItems.length) {
    list.innerHTML = `<li class="cart-empty">Корзина пуста</li>`;
  } else {
    list.innerHTML = cartItems
      .map(
        (item) => `
        <li class="cart-item" data-cart-key="${escapeHtml(item.key)}">
          <img src="${escapeHtml(item.imageUrl || "")}" alt="${escapeHtml(item.name)}" loading="lazy" />
          <div class="cart-item__content">
            <h4>${escapeHtml(item.name)}</h4>
            <p>${formatPrice(item.price)}</p>
            <div class="qty-control">
              <button data-cart-dec="${escapeHtml(item.key)}">-</button>
              <span>${item.qty}</span>
              <button data-cart-inc="${escapeHtml(item.key)}">+</button>
              <button class="qty-control__remove" data-cart-remove="${escapeHtml(item.key)}">Удалить</button>
            </div>
          </div>
        </li>
      `,
      )
      .join("");
  }

  totalNode.textContent = formatPrice(total);
  if (checkoutButton) {
    checkoutButton.disabled = !cartItems.length;
  }
}

export function renderOrderMethods(active = "pickup") {
  const container = document.querySelector("[data-order-methods]");
  if (!container) {
    return;
  }

  container.innerHTML = Object.entries(ORDER_METHOD_LABELS)
    .map(
      ([code, label]) =>
        `<button type="button" class="method-btn ${active === code ? "is-active" : ""}" data-order-method="${code}">${label}</button>`,
    )
    .join("");
}

export function setDeliveryAddressVisibility(method = "pickup") {
  const wrapper = document.querySelector("[data-address-wrapper]");
  if (!wrapper) {
    return;
  }
  wrapper.hidden = method !== "delivery";
}

export function openProductModal(product, options = {}) {
  const modal = document.querySelector("[data-product-modal]");
  if (!modal || !product) {
    return;
  }

  const { qty = 0, selectedModification = null } = options;
  const image = modal.querySelector("[data-product-image]");
  const name = modal.querySelector("[data-product-name]");
  const description = modal.querySelector("[data-product-description]");
  const price = modal.querySelector("[data-product-price]");
  const addButton = modal.querySelector("[data-product-add]");
  const weight = modal.querySelector("[data-product-weight]");
  const tagsWrap = modal.querySelector("[data-product-tags]");
  const modsWrap = modal.querySelector("[data-product-modifications]");
  const modsList = modal.querySelector("[data-modifications-list]");
  const nutritionWrap = modal.querySelector("[data-product-nutrition]");
  const nutritionList = modal.querySelector("[data-nutrition-list]");

  if (image) {
    image.src = product.imageUrl || "";
    image.alt = product.name;
  }
  if (name) {
    name.textContent = product.name;
  }
  if (description) {
    description.textContent = product.description || "Описание отсутствует";
  }
  if (weight) {
    weight.textContent = product.weight ? `${product.weight} г` : "";
    weight.hidden = !product.weight;
  }
  if (tagsWrap) {
    const tags = (product.tags || []).slice(0, 3);
    tagsWrap.innerHTML = tags.length
      ? tags.map((tag) => `<span class="tag">${escapeHtml(tag.text || tag.code || "")}</span>`).join("")
      : "";
  }

  const modifications = product.modifications || [];
  const activeMod = selectedModification || modifications[0]?.name || "";
  if (modsWrap && modsList) {
    modsWrap.hidden = modifications.length === 0;
    if (modifications.length) {
      modsList.innerHTML = modifications
        .map(
          (mod) =>
            `<button type="button" class="pill-btn ${mod.name === activeMod ? "is-active" : ""}" data-modification-btn="${escapeHtml(mod.name || mod.mealCode || "")}">${escapeHtml(mod.name || mod.mealCode || "")}</button>`,
        )
        .join("");
      modal.dataset.selectedModification = activeMod;
    } else {
      modal.dataset.selectedModification = "";
      modsList.innerHTML = "";
    }
  }

  if (nutritionWrap && nutritionList) {
    const rows = NUTRITION_KEYS.filter((row) => product[row.key]).map(
      (row) => `<div class="nutrition-cell"><strong>${escapeHtml(String(product[row.key]))}</strong>${row.label}</div>`,
    );
    nutritionWrap.hidden = rows.length === 0;
    nutritionList.innerHTML = rows.join("");
  }
  if (price) {
    price.textContent = formatPrice(product.price);
  }
  if (addButton) {
    addButton.dataset.productCode = product.code;
    addButton.disabled = !product.isAvailable;
    addButton.textContent = product.isAvailable ? (qty ? `В корзине: ${qty}` : "Добавить в корзину") : "Недоступно";
  }

  hideSuccessOverlay();
  animateOverlay(modal);
  modal.hidden = false;
  document.body.classList.add("is-modal-open");
}

export function closeProductModal() {
  const modal = document.querySelector("[data-product-modal]");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  modal.classList.remove("is-entering");
  document.body.classList.remove("is-modal-open");
}

export function updateCartCounter(count) {
  const nodes = document.querySelectorAll("[data-cart-count]");
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    node.textContent = String(count);
    node.classList.remove("is-bump");
    void node.offsetWidth;
    node.classList.add("is-bump");
  }
}

export function openCartDrawer() {
  const drawer = document.querySelector("[data-cart-drawer]");
  if (!drawer) {
    return;
  }
  animateOverlay(drawer);
  drawer.hidden = false;
  document.body.classList.add("is-cart-open");
}

export function closeCartDrawer() {
  const drawer = document.querySelector("[data-cart-drawer]");
  if (!drawer) {
    return;
  }
  drawer.hidden = true;
  drawer.classList.remove("is-entering");
  document.body.classList.remove("is-cart-open");
}

export function showSuccessOverlay(orderNumber) {
  const overlay = document.querySelector("[data-success-overlay]");
  if (!overlay) {
    return;
  }
  // Success screen should be the single active layer after checkout.
  closeProductModal();
  closeCartDrawer();
  overlay.querySelector("[data-success-order]").textContent = orderNumber;
  animateOverlay(overlay);
  overlay.hidden = false;
  document.body.classList.add("is-success-open");
}

export function hideSuccessOverlay() {
  const overlay = document.querySelector("[data-success-overlay]");
  if (!overlay) {
    return;
  }
  overlay.hidden = true;
  overlay.classList.remove("is-entering");
  document.body.classList.remove("is-success-open");
}

export function isProductModalOpen() {
  const modal = document.querySelector("[data-product-modal]");
  return Boolean(modal && !modal.hidden);
}

export function isCartDrawerOpen() {
  const drawer = document.querySelector("[data-cart-drawer]");
  return Boolean(drawer && !drawer.hidden);
}

export function isSuccessOverlayOpen() {
  const overlay = document.querySelector("[data-success-overlay]");
  return Boolean(overlay && !overlay.hidden);
}

function animateOverlay(element) {
  element.classList.remove("is-entering");
  void element.offsetWidth;
  element.classList.add("is-entering");
}
