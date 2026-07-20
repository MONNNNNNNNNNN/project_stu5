import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Article } from '../types';

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: article, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: async () => (await api.get<Article>(`/articles/${id}`)).data,
    enabled: !!id,
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!article) return <p className="text-sm text-gray-500">Article not found.</p>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      <Link to="/learn" className="text-sm text-brand-600">← Back to Learn</Link>
      <span className="text-[10px] font-semibold uppercase text-brand-600">{article.tag}</span>
      <h1 className="text-2xl font-semibold text-ink">{article.title}</h1>
      <p className="text-gray-500">{article.summary}</p>
      <div className="bg-white rounded-2xl shadow-sm p-6 whitespace-pre-wrap text-sm text-ink leading-relaxed">
        {article.contentMd}
      </div>
    </div>
  );
}
