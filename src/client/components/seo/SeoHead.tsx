import { useEffect } from 'react';

export interface SeoHeadProps {
  title: string;
  description: string;
  path?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  noIndex?: boolean;
}

function upsertMeta(selector: string, attrName: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useSeoHead({ title, description, path = '/', jsonLd, noIndex = false }: SeoHeadProps) {
  useEffect(() => {
    document.title = title;
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://trefood-prototype.technicaltriveniyt.workers.dev';
    const canonicalUrl = `${origin}${path.startsWith('/') ? path : `/${path}`}`;

    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noIndex ? 'noindex, nofollow' : 'index, follow'
    );

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    let ldScript = document.head.querySelector<HTMLScriptElement>('script[data-route-jsonld="true"]');
    if (jsonLd) {
      if (!ldScript) {
        ldScript = document.createElement('script');
        ldScript.type = 'application/ld+json';
        ldScript.setAttribute('data-route-jsonld', 'true');
        document.head.appendChild(ldScript);
      }
      ldScript.textContent = JSON.stringify(
        Array.isArray(jsonLd)
          ? { '@context': 'https://schema.org', '@graph': jsonLd }
          : { '@context': 'https://schema.org', ...jsonLd }
      );
    } else if (ldScript) {
      ldScript.remove();
    }
  }, [title, description, path, jsonLd, noIndex]);
}

export function SeoHead(props: SeoHeadProps) {
  useSeoHead(props);
  return null;
}
