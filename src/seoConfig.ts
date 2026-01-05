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
    title: "Best ESL Games To Practice Listening",
    description:
      "Practice English listening with fun, interactive ESL games online. Improve comprehension using audio quizzes, listen-and-choose, listen-and-write, and conversation challenges. Includes easy, intermediate, and advanced levels for ESL students and adults. Train your ear and build real-life English listening skills with engaging, gamified practice. Free to play and designed to help you learn faster while having fun.",
  },
  "/speaking": {
    title: "Best ESL Writing Games To Practice English",
    description:
      "Practice English writing with interactive ESL games online. Improve spelling, sentence building, paragraph creation, email and story writing through gamified challenges. Designed for ESL students and adults, with basic to advanced levels. Learn real-life writing skills in a fun, educational way. Free to play and perfect for improving English faster while writing with confidence.",
  },
  "/reading": {
    title: "Práctica de Reading | Comprensión Lectora",
    description: "Lee y analiza guiones originales para expandir tu vocabulario.",
  },  
  "/vocabulary": {
    title: "Best ESL Games For Improving Vocabulary",
    description: "Lee y analiza guiones originales para expandir tu vocabulario.",
  }
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
