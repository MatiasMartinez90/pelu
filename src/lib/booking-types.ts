export type Barber = {
  slug: string;
  name: string;
  role: string;
  photo_url: string | null;
  bio: string;
  instagram: string;
};

export type Service = {
  slug: string;
  name: string;
  description: string;
  price: number;
  duration_min: number;
  badge: string | null;
  variable_price: boolean;
};

export type BookingCatalog = {
  barbers: Barber[];
  services_by_barber: Record<string, Service[]>;
};
