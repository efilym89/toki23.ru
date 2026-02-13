import { escapeHtml, formatPrice } from "../shared/utils.js";

export function renderMenuSection(container, state) {
  if (!container) {
    return;
  }

  const categoryOptions = state.categories
    .map(
      (category) => `<option value="${escapeHtml(category.code)}" ${state.form.categoryCode === category.code ? "selected" : ""}>${escapeHtml(category.name)}</option>`,
    )
    .join("");

  const productRows = state.products.items
    .map(
      (product) => `
      <tr>
        <td>
          <div class="admin-product-cell">
            <img src="${escapeHtml(product.imageUrl || "")}" alt="${escapeHtml(product.name)}" />
            <div>
              <strong>${escapeHtml(product.name)}</strong>
              <div class="muted">${escapeHtml(product.code)}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(product.categoryCode)}</td>
        <td>${formatPrice(product.price)}</td>
        <td>${product.isAvailable ? "Да" : "Нет"}</td>
        <td>${product.sortOrder}</td>
        <td>
          <button class="btn btn--small btn--ghost" data-edit-product="${product.id}">Редактировать</button>
          <button class="btn btn--small btn--danger" data-delete-product="${product.id}">Удалить</button>
        </td>
      </tr>
    `,
    )
    .join("");

  container.innerHTML = `
    <section class="admin-section admin-section--split">
      <div>
        <h3>Товары</h3>
        <div class="admin-toolbar">
          <input type="text" name="menuSearch" value="${escapeHtml(state.search)}" placeholder="Поиск по названию/коду" data-menu-search />
          <select data-menu-category>
            <option value="">Все категории</option>
            ${state.categories.map((category) => `<option value="${escapeHtml(category.code)}" ${state.categoryFilter === category.code ? "selected" : ""}>${escapeHtml(category.name)}</option>`).join("")}
          </select>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Товар</th>
                <th>Категория</th>
                <th>Цена</th>
                <th>Доступен</th>
                <th>Сорт.</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${productRows || '<tr><td colspan="6">Нет товаров</td></tr>'}
            </tbody>
          </table>
        </div>
        <div data-admin-menu-pager></div>
      </div>
      <aside>
        <h3>${state.form.id ? "Редактировать товар" : "Новый товар"}</h3>
        <form data-menu-form class="admin-form">
          <input type="hidden" name="id" value="${escapeHtml(state.form.id || "")}" />
          <label>
            Код
            <input name="code" required value="${escapeHtml(state.form.code || "")}" />
          </label>
          <label>
            Название
            <input name="name" required value="${escapeHtml(state.form.name || "")}" />
          </label>
          <label>
            Описание
            <textarea name="description" rows="4">${escapeHtml(state.form.description || "")}</textarea>
          </label>
          <label>
            Категория
            <select name="categoryCode" required>
              ${categoryOptions}
            </select>
          </label>
          <label>
            Цена (₽)
            <input type="number" min="1" step="1" name="price" required value="${escapeHtml(String(state.form.price || ""))}" />
          </label>
          <label>
            Сортировка
            <input type="number" min="1" step="1" name="sortOrder" required value="${escapeHtml(String(state.form.sortOrder || 999))}" />
          </label>
          <label>
            URL изображения
            <input name="imageUrl" value="${escapeHtml(state.form.imageUrl || "")}" placeholder="https://..." />
          </label>
          <label>
            Загрузить изображение
            <input type="file" accept="image/*" name="imageFile" data-menu-image-file />
          </label>
          <label class="inline-checkbox">
            <input type="checkbox" name="isAvailable" ${state.form.isAvailable ? "checked" : ""} />
            Доступен для заказа
          </label>
          <div class="preview-image-wrap">
            ${state.form.imageUrl ? `<img src="${escapeHtml(state.form.imageUrl)}" alt="preview" data-menu-image-preview />` : '<div class="muted">Превью появится после выбора изображения</div>'}
          </div>
          <div class="admin-form-actions">
            <button class="btn" type="submit">Сохранить</button>
            <button class="btn btn--ghost" type="button" data-reset-product-form>Сбросить</button>
          </div>
        </form>
      </aside>
    </section>
  `;
}

export function readProductForm(form) {
  const data = new FormData(form);
  return {
    id: (data.get("id") || "").toString().trim() || undefined,
    code: (data.get("code") || "").toString().trim(),
    name: (data.get("name") || "").toString().trim(),
    description: (data.get("description") || "").toString().trim(),
    categoryCode: (data.get("categoryCode") || "").toString().trim(),
    price: Number(data.get("price") || 0),
    sortOrder: Number(data.get("sortOrder") || 999),
    imageUrl: (data.get("imageUrl") || "").toString().trim(),
    isAvailable: data.get("isAvailable") === "on",
  };
}

export function getInitialProductForm(categories = []) {
  return {
    id: "",
    code: "",
    name: "",
    description: "",
    categoryCode: categories[0]?.code || "",
    price: 0,
    imageUrl: "",
    isAvailable: true,
    sortOrder: 999,
  };
}
