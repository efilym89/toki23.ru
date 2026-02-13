import { initRepository, getRepository } from "../data/repository.js";
import { createCartStore } from "./cart.js";
import { debounce } from "../shared/utils.js";
import { toast } from "../shared/dom.js";
import { validateCheckout } from "../shared/validation.js";
import {
  closeCartDrawer,
  closeProductModal,
  hideSuccessOverlay,
  openCartDrawer,
  openProductModal,
  renderBanners,
  renderCart,
  renderCategories,
  renderOrderMethods,
  renderPagination,
  renderProducts,
  renderSiteInfo,
  setDeliveryAddressVisibility,
  showSuccessOverlay,
  updateCartCounter,
} from "./ui.js";

const state = {
  categories: [],
  productsPage: null,
  categoryCode: "",
  search: "",
  onlyAvailable: false,
  page: 1,
  method: "pickup",
};

const cart = createCartStore();

async function boot() {
  await initRepository();
  const repo = getRepository();

  const snapshot = await repo.getSiteSnapshot();
  renderSiteInfo(snapshot.site || {});
  renderBanners(snapshot.banners || []);

  state.categories = await repo.getCategories();
  renderCategories(state.categories, state.categoryCode);
  renderOrderMethods(state.method);
  setDeliveryAddressVisibility(state.method);

  await loadProducts();
  refreshCart();
  bindEvents();
  handleProductFromUrl();
}

async function loadProducts() {
  const repo = getRepository();
  const result = await repo.getProducts({
    page: state.page,
    pageSize: 18,
    categoryCode: state.categoryCode,
    search: state.search,
    onlyAvailable: state.onlyAvailable,
  });

  state.productsPage = result;
  renderProducts(result);
  renderPagination("[data-products-pager]", result.pagination, "products");
}

function refreshCart() {
  const items = cart.getItems();
  renderCart(items, cart.getTotal());
  updateCartCounter(cart.getCount());
}

function bindEvents() {
  document.addEventListener("click", onDocumentClick);

  const searchInput = document.querySelector("[data-search]");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(async (event) => {
        state.search = event.target.value;
        state.page = 1;
        await loadProducts();
      }, 220),
    );
  }

  const availableToggle = document.querySelector("[data-available-toggle]");
  if (availableToggle) {
    availableToggle.addEventListener("change", async (event) => {
      state.onlyAvailable = Boolean(event.target.checked);
      state.page = 1;
      await loadProducts();
    });
  }

  const checkoutForm = document.querySelector("[data-checkout-form]");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", onCheckoutSubmit);
  }
}

async function onDocumentClick(event) {
  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    state.categoryCode = categoryButton.dataset.category || "";
    state.page = 1;
    renderCategories(state.categories, state.categoryCode);
    await loadProducts();
    return;
  }

  const pagerButton = event.target.closest("[data-page][data-page-target='products']");
  if (pagerButton) {
    state.page = Number(pagerButton.dataset.page || 1);
    await loadProducts();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const openProductNode = event.target.closest("[data-open-product], [data-add-product]");
  if (openProductNode) {
    const code = openProductNode.dataset.openProduct || openProductNode.dataset.addProduct;
    const product = await getRepository().getProductByCode(code);
    if (!product) {
      return;
    }

    if (openProductNode.dataset.addProduct) {
      if (!product.isAvailable) {
        toast("Товар временно недоступен", "warning");
        return;
      }
      cart.add(product, 1);
      refreshCart();
      toast(`Добавили: ${product.name}`, "success");
      return;
    }

    openProductModal(product);
    return;
  }

  const addFromModal = event.target.closest("[data-product-add]");
  if (addFromModal) {
    const code = addFromModal.dataset.productCode;
    if (!code) {
      return;
    }
    const product = await getRepository().getProductByCode(code);
    if (!product) {
      return;
    }
    cart.add(product, 1);
    refreshCart();
    closeProductModal();
    toast(`Добавили: ${product.name}`, "success");
    return;
  }

  if (event.target.closest("[data-product-close]")) {
    closeProductModal();
    return;
  }

  if (event.target.closest("[data-open-cart]")) {
    openCartDrawer();
    return;
  }

  if (event.target.closest("[data-close-cart]")) {
    closeCartDrawer();
    return;
  }

  const cartInc = event.target.closest("[data-cart-inc]");
  if (cartInc) {
    const key = cartInc.dataset.cartInc;
    const item = cart.getItems().find((row) => row.key === key);
    if (item) {
      cart.setQty(key, item.qty + 1);
      refreshCart();
    }
    return;
  }

  const cartDec = event.target.closest("[data-cart-dec]");
  if (cartDec) {
    const key = cartDec.dataset.cartDec;
    const item = cart.getItems().find((row) => row.key === key);
    if (item) {
      cart.setQty(key, item.qty - 1);
      refreshCart();
    }
    return;
  }

  const cartRemove = event.target.closest("[data-cart-remove]");
  if (cartRemove) {
    cart.remove(cartRemove.dataset.cartRemove);
    refreshCart();
    return;
  }

  const methodButton = event.target.closest("[data-order-method]");
  if (methodButton) {
    state.method = methodButton.dataset.orderMethod;
    renderOrderMethods(state.method);
    setDeliveryAddressVisibility(state.method);
    return;
  }

  if (event.target.closest("[data-success-close]")) {
    hideSuccessOverlay();
    closeCartDrawer();
    return;
  }

  if (event.target.matches("[data-cart-drawer]")) {
    closeCartDrawer();
    return;
  }

  if (event.target.matches("[data-product-modal]")) {
    closeProductModal();
  }
}

async function onCheckoutSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const items = cart.getItems();
  if (!items.length) {
    toast("Корзина пуста", "warning");
    return;
  }

  const payload = {
    customerName: String(formData.get("customerName") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    comment: String(formData.get("comment") || "").trim(),
    method: state.method,
    address: String(formData.get("address") || "").trim(),
    items: items.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      price: item.price,
      name: item.name,
      imageUrl: item.imageUrl,
      modifiers: item.modifiers,
    })),
  };

  const validation = validateCheckout(payload);
  if (!validation.ok) {
    toast(validation.errors[0], "error");
    return;
  }

  const submitButton = form.querySelector("[data-checkout-submit]");
  submitButton.disabled = true;

  try {
    const order = await getRepository().createOrder(payload);
    cart.clear();
    refreshCart();
    form.reset();
    state.method = "pickup";
    renderOrderMethods(state.method);
    setDeliveryAddressVisibility(state.method);
    showSuccessOverlay(order.number);
    toast(`Заказ ${order.number} принят`, "success");
  } catch (error) {
    console.error(error);
    toast(error.message || "Не удалось оформить заказ", "error");
  } finally {
    submitButton.disabled = false;
  }
}

async function handleProductFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const productCode = params.get("product");
  if (!productCode) {
    return;
  }

  const product = await getRepository().getProductByCode(productCode);
  if (product) {
    openProductModal(product);
  }
}

boot().catch((error) => {
  console.error(error);
  toast("Ошибка запуска приложения", "error");
});
