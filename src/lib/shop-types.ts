export type ShopCategory = {
  slug: string;
  name: string;
  description: string;
  product_count: number;
};

export type ShopProduct = {
  slug: string;
  name: string;
  sku: string;
  description: string;
  short_description: string;
  category_slug: string | null;
  category_name: string | null;
  image_url: string | null;
  gallery: string[];
  price: number;
  available_qty: number;
  in_stock: boolean;
  featured: boolean;
};

export type ShopProductList = {
  items: ShopProduct[];
  total: number;
  limit: number;
  offset: number;
};

export type ShopCartItem = {
  product: ShopProduct;
  quantity: number;
  line_total: number;
};

export type ShopCart = {
  token: string;
  status: string;
  currency: string;
  items: ShopCartItem[];
  subtotal: number;
  total_quantity: number;
  expires_at: string;
};

export type ShopOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  payment_method: string;
  payment_status: string;
  currency: string;
  subtotal: number;
  total: number;
  pickup_location: string;
  customer_notes: string;
  cancellation_reason: string;
  created_at: string;
  updated_at: string;
  items: Array<{
    product_slug: string;
    product_name: string;
    sku: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;
};
