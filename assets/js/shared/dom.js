export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function show(element) {
  if (!element) {
    return;
  }
  element.hidden = false;
}

export function hide(element) {
  if (!element) {
    return;
  }
  element.hidden = true;
}

export function setLoading(button, loading, label = "Сохранить") {
  if (!button) {
    return;
  }
  if (!button.dataset.originalLabel) {
    button.dataset.originalLabel = button.textContent || label;
  }
  button.disabled = Boolean(loading);
  button.textContent = loading ? "Загрузка..." : button.dataset.originalLabel;
}

export function toast(message, type = "info") {
  const container = document.querySelector("[data-toast-container]") || createToastContainer();
  const item = document.createElement("div");
  item.className = `toast toast--${type}`;
  item.textContent = message;
  container.append(item);
  setTimeout(() => {
    item.classList.add("toast--hidden");
    setTimeout(() => item.remove(), 250);
  }, 2400);
}

function createToastContainer() {
  const container = document.createElement("div");
  container.dataset.toastContainer = "true";
  container.className = "toast-container";
  document.body.append(container);
  return container;
}
