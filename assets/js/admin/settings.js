import { escapeHtml } from "../shared/utils.js";

export function renderSettingsSection(container, state) {
  if (!container) return;
  const settings = state.site || {};
  const address = settings.address || {};
  const working = settings.workingHours || {};

  container.innerHTML = `
    <section class="admin-section admin-section--split">
      <div>
        <h3>Основные данные</h3>
        <form class="admin-form" data-settings-form>
          <label>
            Бренд
            <input name="brand" value="${escapeHtml(settings.brand || "ТОКИ23")}" required />
          </label>
          <label>
            Город
            <input name="city" value="${escapeHtml(settings.city || "Краснодар")}" required />
          </label>
          <label>
            Телефон
            <input name="phone" value="${escapeHtml(settings.phone || "")}" required />
          </label>
          <label>
            Улица
            <input name="street" value="${escapeHtml(address.street || "")}" />
          </label>
          <label>
            Дом
            <input name="house" value="${escapeHtml(address.house || "")}" />
          </label>
          <label>
            Время работы с
            <input name="workFrom" value="${escapeHtml(working.from || "11:00")}" />
          </label>
          <label>
            Время работы до
            <input name="workTo" value="${escapeHtml(working.to || "22:45")}" />
          </label>
          <label>
            Текст футера
            <textarea name="footerText" rows="3">${escapeHtml(settings.footerText || "Доставка роллов и суши в Краснодаре.")}</textarea>
          </label>
          <div class="admin-form-actions">
            <button class="btn" type="submit">Сохранить</button>
          </div>
        </form>
      </div>
      <aside>
        <h3>Медиа</h3>
        <div class="admin-form">
          <label>
            Главное изображение (hero)
            <input name="heroImage" value="${escapeHtml(settings.heroImage || "")}" placeholder="https://..." />
          </label>
          <label>
            Загрузить hero
            <input type="file" accept="image/*" data-settings-hero-file />
          </label>
          <div class="preview-image-wrap">
            ${settings.heroImage ? `<img src="${escapeHtml(settings.heroImage)}" alt="hero" />` : '<div class="muted">Превью появится после загрузки</div>'}
          </div>
          <label>
            Фон блока акций
            <input name="promoBackground" value="${escapeHtml(settings.promoBackground || "")}" placeholder="https://..." />
          </label>
          <label>
            Загрузить фон акций
            <input type="file" accept="image/*" data-settings-promo-file />
          </label>
          <div class="preview-image-wrap">
            ${settings.promoBackground ? `<img src="${escapeHtml(settings.promoBackground)}" alt="promo" />` : '<div class="muted">Превью появится после загрузки</div>'}
          </div>
        </div>
      </aside>
    </section>
  `;
}

export function readSettingsForm(form) {
  const data = new FormData(form);
  return {
    brand: (data.get("brand") || "").toString().trim(),
    city: (data.get("city") || "").toString().trim(),
    phone: (data.get("phone") || "").toString().trim(),
    address: {
      street: (data.get("street") || "").toString().trim(),
      house: (data.get("house") || "").toString().trim(),
    },
    workingHours: {
      from: (data.get("workFrom") || "").toString().trim(),
      to: (data.get("workTo") || "").toString().trim(),
    },
    footerText: (data.get("footerText") || "").toString().trim(),
    heroImage: (data.get("heroImage") || "").toString().trim(),
    promoBackground: (data.get("promoBackground") || "").toString().trim(),
  };
}
