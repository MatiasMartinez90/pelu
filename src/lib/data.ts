// Equipo (nombres ficticios). El "id" se usa para mapear servicios.
export type Barber = {
  id: string;
  name: string;
  role: "BARBERO" | "ESTILISTA";
  bio: string;
  photo: string;
  instagram?: string;
};

export const barbers: Barber[] = [
  {
    id: "thiago",
    name: "Thiago",
    role: "BARBERO",
    bio: "Especialista en fades y cortes clásicos. Precisión en cada pasada.",
    photo:
      "https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=600&q=80&auto=format&fit=crop",
    instagram: "thiago.barber",
  },
  {
    id: "lautaro",
    name: "Lautaro",
    role: "BARBERO",
    bio: "El rey de los diseños a navaja y los cortes modernos.",
    photo:
      "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&q=80&auto=format&fit=crop",
    instagram: "lautaro.barber",
  },
  {
    id: "bruno",
    name: "Bruno",
    role: "BARBERO",
    bio: "Master barber y fundador. Experiencia premium de punta a punta.",
    photo:
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&q=80&auto=format&fit=crop",
    instagram: "bruno.barber",
  },
  {
    id: "nahuel",
    name: "Nahuel",
    role: "BARBERO",
    bio: "Cortes prolijos y mucha buena onda. Tu corte de confianza.",
    photo:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80&auto=format&fit=crop",
    instagram: "nahuel.barber",
  },
  {
    id: "ramiro",
    name: "Ramiro",
    role: "BARBERO",
    bio: "Detallista al máximo. Terminaciones impecables a tijera.",
    photo:
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80&auto=format&fit=crop",
    instagram: "ramiro.barber",
  },
  {
    id: "camila",
    name: "Camila",
    role: "ESTILISTA",
    bio: "Especialista en corte femenino, color y alisado profesional.",
    photo:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80&auto=format&fit=crop",
    instagram: "camila.estilista",
  },
];

export type Service = {
  id: string;
  name: string;
  desc?: string;
  price: number;
  duration: string;
  barberIds: string[];
  consultar?: boolean; // true => se reserva por WhatsApp
  badge?: string;
};

export const services: Service[] = [
  {
    id: "corte-masculino",
    name: "Corte Masculino",
    desc: "Corte personalizado con estilo.",
    price: 15000,
    duration: "30 min",
    barberIds: ["thiago", "lautaro", "nahuel", "ramiro", "camila"],
  },
  {
    id: "corte-barba",
    name: "Corte y Barba",
    desc: "Corte de pelo + arreglo de barba. El pack completo.",
    price: 18000,
    duration: "30 min",
    barberIds: ["lautaro", "nahuel", "ramiro", "camila"],
    badge: "Más pedido",
  },
  {
    id: "barba",
    name: "Barba",
    desc: "Recorte y perfilado de barba.",
    price: 13000,
    duration: "30 min",
    barberIds: ["thiago", "lautaro", "nahuel", "ramiro", "camila"],
  },
  {
    id: "corte-masculino-bruno",
    name: "Corte Masculino con Bruno",
    desc: "Corte personalizado con nuestro master barber.",
    price: 20000,
    duration: "30 min",
    barberIds: ["bruno"],
  },
  {
    id: "corte-barba-bruno",
    name: "Corte y Barba con Bruno",
    desc: "Corte de pelo + arreglo de barba con Bruno.",
    price: 23000,
    duration: "30 min",
    barberIds: ["bruno"],
    badge: "Premium",
  },
  {
    id: "barba-bruno",
    name: "Barba con Bruno",
    desc: "Arreglo de barba con nuestro master barber.",
    price: 15000,
    duration: "30 min",
    barberIds: ["bruno"],
  },
  {
    id: "corte-mujer",
    name: "Corte Mujer",
    desc: "Corte femenino personalizado. Estilo y técnica profesional.",
    price: 15000,
    duration: "30 min",
    barberIds: ["camila"],
  },
  {
    id: "color",
    name: "Color",
    desc: "El valor varía según el trabajo a realizar. Consultá por WhatsApp.",
    price: 70000,
    duration: "2 hs",
    barberIds: ["camila"],
    consultar: true,
    badge: "Exclusivo",
  },
  {
    id: "alisado",
    name: "Alisado Orgánico (sin formol)",
    desc: "Look liso y natural. El valor varía según largo y volumen del cabello.",
    price: 165000,
    duration: "3 hs 30 min",
    barberIds: ["camila"],
    consultar: true,
    badge: "Exclusivo",
  },
];

export function servicesForBarber(barberId: string): Service[] {
  return services.filter((s) => s.barberIds.includes(barberId));
}

export type Product = {
  name: string;
  desc: string;
  price: number;
  bullets: string[];
  photo: string;
};

export const products: Product[] = [
  {
    name: "Texture Mash · Matte",
    desc: "Pomada de fijación flexible con acabado mate para peinados con textura natural y sin brillo.",
    price: 25000,
    bullets: [
      "Efecto mate",
      "Textura y definición",
      "Filtro UV",
      "Fácil de aplicar y remover",
    ],
    photo:
      "https://images.unsplash.com/photo-1626015449161-2e6c2f5dde7a?w=700&q=80&auto=format&fit=crop",
  },
  {
    name: "Texture Dust · Original",
    desc: "Polvo texturizador de fijación natural que aporta volumen instantáneo desde la raíz con acabado invisible.",
    price: 25000,
    bullets: [
      "Volumen inmediato",
      "Fijación natural",
      "Acabado invisible",
      "Ideal para cabellos finos",
    ],
    photo:
      "https://images.unsplash.com/photo-1571875257727-256c39da42af?w=700&q=80&auto=format&fit=crop",
  },
  {
    name: "Texture Mash · Brillante",
    desc: "Fijación flexible y control duradero con acabado brillante para peinados clásicos o de efecto húmedo.",
    price: 25000,
    bullets: [
      "Acabado brillante",
      "Fijación flexible",
      "Efecto húmedo natural",
      "No deja residuos",
    ],
    photo:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=700&q=80&auto=format&fit=crop",
  },
];

export const steps = [
  {
    n: "1",
    title: "Elegí tu barbero",
    desc: "Seleccioná al barbero que más te guste del equipo.",
  },
  {
    n: "2",
    title: "Agendá tu turno",
    desc: "Elegí el día y horario que te quede cómodo. Sin espera.",
  },
  {
    n: "3",
    title: "Vení y disfrutá",
    desc: "Llegá a tu hora y viví la experiencia.",
  },
];

export const stats = [
  { value: "+10", label: "Años de experiencia" },
  { value: "+12k", label: "Clientes felices" },
  { value: "6", label: "Profesionales" },
  { value: "4.9★", label: "En Google" },
];

export const gallery: string[] = [
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521490683712-35a1cb235d1c?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=800&q=80&auto=format&fit=crop",
];

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "¿Cómo reservo un turno?",
    a: "Reservá desde la web tocando 'Agendar Turno'. Elegís tu barbero, el servicio, la fecha y el horario que te quede cómodo. ¡En segundos confirmás por WhatsApp!",
  },
  {
    q: "¿Puedo cancelar o cambiar mi turno?",
    a: "Sí, podés cancelar o reprogramar con al menos 2 horas de anticipación. Escribinos por WhatsApp y te ayudamos.",
  },
  {
    q: "¿Cuáles son los métodos de pago?",
    a: "Aceptamos efectivo, tarjeta y transferencia. El pago se realiza en el local al momento del servicio.",
  },
  {
    q: "¿Hacen cortes de mujer?",
    a: "Sí, Camila es nuestra especialista en corte femenino. También hace alisado y coloración. Podés ver sus servicios al agendar turno.",
  },
  {
    q: "¿Cuál es el horario de atención?",
    a: "Atendemos de lunes a viernes de 10:00 a 21:00 y sábados de 11:00 a 20:00. Los domingos permanecemos cerrados.",
  },
  {
    q: "¿Necesito llegar antes de mi turno?",
    a: "Te recomendamos llegar 5 minutos antes para empezar puntual. Si llegás tarde, puede que tengamos que reducir el tiempo del servicio.",
  },
];
