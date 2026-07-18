export class ShopApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function shopApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/shop/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail;
    throw new ShopApiError(typeof detail === "string" ? detail : "No pudimos completar la operación.", response.status);
  }
  return payload as T;
}

export async function paymentApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/payments/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail;
    throw new ShopApiError(
      typeof detail === "string" ? detail : "No pudimos completar el pago.",
      response.status,
    );
  }
  return payload as T;
}
