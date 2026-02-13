import { escapeHtml, formatDateTime } from "../shared/utils.js";

export function renderLogsSection(container, state) {
  if (!container) {
    return;
  }

  const rows = state.logs.items
    .map(
      (log) => `
      <tr>
        <td>${formatDateTime(log.createdAt)}</td>
        <td>${escapeHtml(log.user || "admin")}</td>
        <td>${escapeHtml(log.action)}</td>
        <td>${escapeHtml(log.entityType)}</td>
        <td>${escapeHtml(log.entityId)}</td>
        <td><code>${escapeHtml(JSON.stringify(log.details || {}))}</code></td>
      </tr>
    `,
    )
    .join("");

  container.innerHTML = `
    <section class="admin-section">
      <h3>Журнал действий</h3>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Время</th>
              <th>Пользователь</th>
              <th>Действие</th>
              <th>Сущность</th>
              <th>ID</th>
              <th>Детали</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="6">Записей пока нет</td></tr>'}
          </tbody>
        </table>
      </div>
      <div data-admin-logs-pager></div>
    </section>
  `;
}
