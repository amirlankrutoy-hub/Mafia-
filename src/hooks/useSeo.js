import { useEffect } from "react";
import { SITE_URL, SITE_NAME } from "../config/site";

function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith("link") ? "link" : "meta");
    const m = selector.match(/\[(name|property|rel)="([^"]+)"\]/);
    if (m) el.setAttribute(m[1], m[2]);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/**
 * Заголовок, описание и canonical для текущей страницы — чтобы Google
 * показывал каждую страницу (правила, роли, рейтинг) отдельным результатом.
 */
export default function useSeo({ title, description, path, noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : `Мафия онлайн с друзьями — ${SITE_NAME}`;
    document.title = fullTitle;
    const url = SITE_URL + (path ?? window.location.pathname);
    if (description) {
      setMeta('meta[name="description"]', "content", description);
      setMeta('meta[property="og:description"]', "content", description);
    }
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[name="robots"]', "content", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
  }, [title, description, path, noindex]);
}
