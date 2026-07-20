import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Article } from '../types';

export default function KnowledgeCenter() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => (await api.get<Article[]>('/articles')).data,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-700">Learn</h1>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {(articles ?? []).map((article) => (
          <Link
            key={article.id}
            to={`/learn/${article.id}`}
            className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="h-28 bg-sage-100" />
            <div className="p-4">
              <span className="text-[10px] font-semibold uppercase text-brand-600">{article.tag}</span>
              <h3 className="font-medium text-sm mt-1 text-ink">{article.title}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
            </div>
          </Link>
        ))}
      </div>
      {!isLoading && (articles ?? []).length === 0 && (
        <p className="text-sm text-gray-500">No articles published yet.</p>
      )}
    </div>
  );
}
