import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { seoConfig, defaultSEO } from "@/src/seoConfig";

export const SEO = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = seoConfig[pathname] || defaultSEO;

    // Actualizar Título
    document.title = seo.title;

    // Actualizar Descripción
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", seo.description);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = seo.description;
      document.head.appendChild(meta);
    }
  }, [pathname]);

  return null; // Este componente no renderiza nada visual
};
