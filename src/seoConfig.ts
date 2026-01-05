export interface SEOData {
  title: string;
  description: string;
}

export const seoConfig: Record<string, SEOData> = {
  "/": {
    title: "Best ESL Games To Practice and Learn English",
    description:
      "La plataforma definitiva para mejorar tu listening y vocabulario usando clips de tus películas favoritas.",
  },
  "/listening": {
    title: "Práctica de Listening | Movie Interpreter",
    description: "Entrena tu oído con ejercicios dinámicos de comprensión auditiva.",
  },
  "/speaking": {
    title: "Práctica de Speaking | Pronunciación Real",
    description: "Mejora tu fluidez repitiendo diálogos icónicos del cine.",
  },
  "/reading": {
    title: "Práctica de Reading | Comprensión Lectora",
    description: "Lee y analiza guiones originales para expandir tu vocabulario.",
  },
  "/writing": {
    title: "Práctica de Writing | Escribe como un Pro",
    description: "Completa diálogos y mejora tu gramática mediante el contexto cinematográfico.",
  },
  "/admin": {
    title: "Panel de Administración | Gestión de Contenido",
    description: "Configuración de clips y subtítulos para la plataforma.",
  },
  "/admin/seo": {
    title: "Gestión SEO | Panel de Control",
    description: "Administración centralizada de metadatos y títulos del sitio.",
  },
};

export const defaultSEO: SEOData = {
  title: "Movie Interpreter - Play & Learn",
  description: "Aprende idiomas de forma divertida con escenas de películas.",
};
