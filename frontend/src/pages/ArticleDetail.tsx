import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { PageChrome } from '../components/PageChrome';
import { Markdown } from '../components/Markdown';
import type { Article } from '../types';

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: article, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: async () => (await api.get<Article>(`/articles/${id}`)).data,
    enabled: !!id,
  });

  return (
    <PageChrome>
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <Link to="/learn" className="text-sm text-brand-600">
          ← Back to Learn
        </Link>

        {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {!isLoading && !article && <p className="text-sm text-gray-500">Article not found.</p>}

        {article && (
          <>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-600">
              {article.tag ?? article.category?.name}
            </span>
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-ink">{article.title}</h1>
            <p className="text-gray-500">{article.summary}</p>
            <div className="bg-surface rounded-2xl shadow-sm p-6 md:p-8">
              <Markdown>{article.contentMd}</Markdown>
            </div>
            <p className="text-xs text-gray-400 pb-4">
              General information for parents — not medical advice. Talk to your child's doctor about
              anything specific to them.
            </p>
          </>
        )}
      </div>
    </PageChrome>
  );
}
