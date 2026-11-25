import { useEffect } from "react";

/**
 * Updates document title, meta description, and canonical link per route for SEO.
 */
export function usePageMeta(title, description) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | FoodBridge`;
    }
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}${window.location.pathname}`);
  }, [title, description]);
}
