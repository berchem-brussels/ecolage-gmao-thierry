/** Affiche un texte d'aide : {{clé}} devient le libellé réel de l'interface, [[n]] un repère numéroté, **texte** du gras (gabarit 1.3.0). */
import React from 'react';
import { useI18n } from '../contexts/I18nContext';

export function Mark({ n }: { n: string }) {
  return <span className="help-mark" aria-label={`(${n})`}>{n}</span>;
}

/** Texte brut d'un texte d'aide, pour la recherche : libellés réels, sans repères ni gras. */
export function plain(text: string, t: (k: string) => string): string {
  return text.replace(/\{\{([a-z0-9_.]+)\}\}/g, (_, k) => t(k)).replace(/\[\[\d+\]\]/g, '').replace(/\*\*([^*]+)\*\*/g, '$1');
}

export default function RichText({ text }: { text: string }) {
  const { t } = useI18n();
  const parts = text.split(/(\{\{[a-z0-9_.]+\}\}|\[\[\d+\]\]|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        const key = /^\{\{([a-z0-9_.]+)\}\}$/.exec(p);
        if (key) return <strong key={i}>« {t(key[1])} »</strong>;
        const mark = /^\[\[(\d+)\]\]$/.exec(p);
        if (mark) return <Mark key={i} n={mark[1]} />;
        const bold = /^\*\*([^*]+)\*\*$/.exec(p);
        if (bold) return <strong key={i}>{bold[1]}</strong>;
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}
