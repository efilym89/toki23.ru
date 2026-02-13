import { formatPrice } from "../shared/utils.js";

export function renderDashboard(container, kpi) {
  if (!container) {
    return;
  }

  const topRows = (kpi.topToday || [])
    .map(
      (row) => `
      <tr>
        <td>${row.name}</td>
        <td>${row.qty}</td>
        <td>${formatPrice(row.revenue)}</td>
      </tr>
    `,
    )
    .join("");

  container.innerHTML = `
    <section class="admin-kpi-grid">
      <article class="admin-kpi-card">
        <h3>Новые заказы сегодня</h3>
        <strong>${kpi.newOrdersToday}</strong>
      </article>
      <article class="admin-kpi-card">
        <h3>Выручка сегодня</h3>
        <strong>${formatPrice(kpi.revenueToday)}</strong>
      </article>
      <article class="admin-kpi-card">
        <h3>Топ позиций сегодня</h3>
        <strong>${(kpi.topToday || []).length}</strong>
      </article>
    </section>
    <section class="admin-section">
      <h3>Топ продаж за сегодня</h3>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Позиция</th>
              <th>Кол-во</th>
              <th>Выручка</th>
            </tr>
          </thead>
          <tbody>
            ${topRows || '<tr><td colspan="3">Пока нет оплаченных заказов</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
