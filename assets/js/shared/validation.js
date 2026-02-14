function getZod() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.zod || window.Zod || null;
}

export function validateCheckout(payload) {
  const z = getZod();
  if (!z) {
    return fallbackCheckoutValidation(payload);
  }

  const schema = z.object({
    customerName: z.string().trim().min(2, "Укажите имя"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?\d[\d\s\-()]{8,}$/, "Введите корректный телефон"),
    comment: z.string().trim().max(300, "Комментарий слишком длинный").optional().or(z.literal("")),
    method: z.enum(["pickup", "delivery"]),
    address: z.string().trim().optional().or(z.literal("")),
    items: z.array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1),
        price: z.number().nonnegative(),
        name: z.string().min(1),
      }),
    ),
  });

  const result = schema.safeParse(payload);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => issue.message),
    };
  }

  if (result.data.method === "delivery" && !result.data.address) {
    return { ok: false, errors: ["Для доставки укажите адрес"] };
  }

  return { ok: true, data: result.data };
}

export function validateProduct(payload) {
  const z = getZod();
  if (!z) {
    return fallbackProductValidation(payload);
  }

  const schema = z.object({
    id: z.string().optional(),
    code: z.string().trim().min(2, "Код обязателен"),
    name: z.string().trim().min(2, "Название обязательно"),
    description: z.string().trim().optional().or(z.literal("")),
    categoryCode: z.string().trim().min(2, "Категория обязательна"),
    price: z.number().int().min(1, "Цена должна быть больше 0"),
    weight: z.number().int().nonnegative().optional().or(z.literal(null)),
    calories: z.number().int().nonnegative().optional().or(z.literal(null)),
    proteins: z.number().int().nonnegative().optional().or(z.literal(null)),
    fats: z.number().int().nonnegative().optional().or(z.literal(null)),
    carbs: z.number().int().nonnegative().optional().or(z.literal(null)),
    imageUrl: z.string().trim().url("Нужен корректный URL изображения").optional().or(z.literal("")),
    isAvailable: z.boolean(),
    sortOrder: z.number().int().min(1),
    tags: z.array(z.object({ code: z.string(), text: z.string() })).optional().or(z.literal([])),
  });

  const result = schema.safeParse(payload);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => issue.message),
    };
  }
  return { ok: true, data: result.data };
}

function fallbackCheckoutValidation(payload) {
  const errors = [];
  if (!payload.customerName || payload.customerName.trim().length < 2) {
    errors.push("Укажите имя");
  }
  if (!payload.phone || payload.phone.trim().length < 9) {
    errors.push("Введите корректный телефон");
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push("Корзина пуста");
  }
  if (payload.method === "delivery" && !payload.address?.trim()) {
    errors.push("Для доставки укажите адрес");
  }
  return errors.length ? { ok: false, errors } : { ok: true, data: payload };
}

function fallbackProductValidation(payload) {
  const errors = [];
  if (!payload.code || payload.code.trim().length < 2) {
    errors.push("Код обязателен");
  }
  if (!payload.name || payload.name.trim().length < 2) {
    errors.push("Название обязательно");
  }
  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    errors.push("Цена должна быть больше 0");
  }
  if (!payload.categoryCode) {
    errors.push("Категория обязательна");
  }
  return errors.length ? { ok: false, errors } : { ok: true, data: payload };
}
