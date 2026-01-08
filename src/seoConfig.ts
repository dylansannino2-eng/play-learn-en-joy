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
    description: "Fun and engaging vocabulary games for beginners and adults. Practice new words with interactive challenges, beginner-friendly activities, and creative exercises. Includes fun vocabulary games, vocabulary practice activities for adults, and games to practice vocabulary that improve retention, confidence, and real-life communication.",
  },
  "/writing": {
    title: "Práctica de Writing | Escribe como un Pro",
    description: "Completa diálogos y mejora tu gramática mediante el contexto cinematográfico.",
  },
   "/grammar": {
    title: "Best Grammar Games To Learn English",
    description: "Fun and interactive grammar games online for adults and kids. Practice and recycle English rules with dynamic challenges, engaging activities, and interactive grammar games designed to reinforce, review, and apply real grammar naturally. Improve fluency, retention, and confidence while learning in a practical and enjoyable way.",
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
