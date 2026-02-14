import { ORDER_METHOD_LABELS, ORDER_STATUS_LABELS } from "../shared/constants.js";
import { escapeHtml, formatDateTime, formatPrice } from "../shared/utils.js";

export function renderOrdersSection(container, state) {
  if (!container) {
    return;
  }

  const statusOptions = Object.entries(ORDER_STATUS_LABELS)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");

  const rows = state.orders.items
    .map(
      (order) => `
      <tr>
        <td><button class="link-btn" data-open-order="${order.id}">${escapeHtml(order.number)}</button></td>
        <td>${escapeHtml(order.customerName)}</td>
        <td>${escapeHtml(order.phone)}</td>
        <td>${ORDER_METHOD_LABELS[order.method] || order.method}</td>
        <td>${ORDER_STATUS_LABELS[order.status] || order.status}</td>
        <td>${order.isPaid ? "Да" : "Нет"}</td>
        <td>${formatPrice(order.total)}</td>
        <td>${formatDateTime(order.createdAt)}</td>
      </tr>
    `,
    )
    .join("");

  const detail = state.activeOrder
    ? `
      <aside class="admin-order-detail">
        <h3>Заказ ${escapeHtml(state.activeOrder.number)}</h3>
        <div class="grid-two">
          <div>
            <p><strong>Клиент:</strong> ${escapeHtml(state.activeOrder.customerName)}</p>
            <p><strong>Телефон:</strong> ${escapeHtml(state.activeOrder.phone)}</p>
            <p><strong>Метод:</strong> ${ORDER_METHOD_LABELS[state.activeOrder.method] || state.activeOrder.method}</p>
            <p><strong>Адрес:</strong> ${escapeHtml(state.activeOrder.address || "-")}</p>
            <p><strong>Комментарий:</strong> ${escapeHtml(state.activeOrder.comment || "-")}</p>
          </div>
          <div>
            <label>
              Статус
              <select data-order-status>
                ${Object.entries(ORDER_STATUS_LABELS)
                  .map(
                    ([value, label]) =>
                      `<option value="${value}" ${state.activeOrder.status === value ? "selected" : ""}>${label}</option>`,
                  )
                  .join("")}
              </select>
            </label>
            <label class="inline-checkbox">
              <input type="checkbox" data-order-paid ${state.activeOrder.isPaid ? "checked" : ""} />
              Оплачен
            </label>
            <button class="btn" data-save-order-state>Сохранить изменения</button>
            <button class="btn btn--ghost" data-print-order>Печать</button>
          </div>
        </div>
        <h4>Позиции</h4>
        <ul class="order-items-list">
          ${state.activeOrder.items
            .map(
              (item) => `<li>${escapeHtml(item.nameSnapshot)} x ${item.qty} — ${formatPrice(item.priceAtOrderTime * item.qty)}</li>`,
            )
            .join("")}
        </ul>
        <p class="order-total"><strong>Итого:</strong> ${formatPrice(state.activeOrder.total)}</p>
      </aside>
    `
    : `<aside class="admin-order-detail"><h3>Карточка заказа</h3><p class="muted">Выберите заказ из таблицы.</p></aside>`;

  container.innerHTML = `
    <section class="admin-section admin-section--split">
      <div>
        <h3>Заказы</h3>
        <div class="admin-toolbar">
          <input type="text" placeholder="Поиск: номер, клиент, телефон" value="${escapeHtml(state.search)}" data-orders-search />
          <select data-orders-status-filter>
            <option value="">Все статусы</option>
            ${Object.entries(ORDER_STATUS_LABELS)
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${state.statusFilter === value ? "selected" : ""}>${label}</option>`,
              )
              .join("")}
          </select>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>№</th>
                <th>Клиент</th>
                <th>Телефон</th>
                <th>Метод</th>
                <th>Статус</th>
                <th>Оплата</th>
                <th>Сумма</th>
                <th>Время</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="8">Нет заказов</td></tr>'}
            </tbody>
          </table>
        </div>
        <div data-admin-orders-pager></div>
      </div>
      ${detail}
    </section>
  `;
}
