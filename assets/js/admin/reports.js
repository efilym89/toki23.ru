import { escapeHtml, formatDateTime, formatPrice } from "../shared/utils.js";

export function renderReportsSection(container, state) {
  if (!container) {
    return;
  }

  const topRows = (state.report?.topItems || [])
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.qty}</td>
        <td>${formatPrice(item.revenue)}</td>
      </tr>
    `,
    )
    .join("");

  const ordersRows = (state.report?.orders || [])
    .slice(0, 30)
    .map(
      (order) => `
      <tr>
        <td>${escapeHtml(order.number)}</td>
        <td>${formatDateTime(order.createdAt)}</td>
        <td>${escapeHtml(order.customerName)}</td>
        <td>${order.isPaid ? "Да" : "Нет"}</td>
        <td>${formatPrice(order.total)}</td>
      </tr>
    `,
    )
    .join("");

  const kpi = state.report?.kpi || { ordersTotal: 0, paidOrders: 0, revenue: 0 };

  container.innerHTML = `
    <section class="admin-section">
      <h3>Отчёты по продажам</h3>
      <form class="admin-toolbar" data-reports-form>
        <button type="button" class="btn btn--small ${state.period === "today" ? "" : "btn--ghost"}" data-report-period="today">День</button>
        <button type="button" class="btn btn--small ${state.period === "week" ? "" : "btn--ghost"}" data-report-period="week">Неделя</button>
        <button type="button" class="btn btn--small ${state.period === "month" ? "" : "btn--ghost"}" data-report-period="month">Месяц</button>
        <button type="button" class="btn btn--small ${state.period === "custom" ? "" : "btn--ghost"}" data-report-period="custom">Период</button>
        <label>
          C
          <input type="date" name="from" value="${escapeHtml(state.from || "")}" ${state.period === "custom" ? "" : "disabled"} />
        </label>
        <label>
          По
          <input type="date" name="to" value="${escapeHtml(state.to || "")}" ${state.period === "custom" ? "" : "disabled"} />
        </label>
        <button class="btn btn--small" type="submit">Обновить</button>
        <button class="btn btn--small btn--ghost" type="button" data-export-report>CSV</button>
      </form>

      <div class="admin-kpi-grid">
        <article class="admin-kpi-card"><h4>Заказов</h4><strong>${kpi.ordersTotal}</strong></article>
        <article class="admin-kpi-card"><h4>Оплачено</h4><strong>${kpi.paidOrders}</strong></article>
        <article class="admin-kpi-card"><h4>Выручка</h4><strong>${formatPrice(kpi.revenue)}</strong></article>
      </div>

      <div class="admin-two-cols">
        <div>
          <h4>Топ продаж</h4>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Позиция</th><th>Кол-во</th><th>Выручка</th></tr>
              </thead>
              <tbody>
                ${topRows || '<tr><td colspan="3">Нет данных</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h4>Последние заказы в периоде</h4>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>№</th><th>Дата</th><th>Клиент</th><th>Оплачен</th><th>Сумма</th></tr>
              </thead>
              <tbody>
                ${ordersRows || '<tr><td colspan="5">Нет заказов</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
}
