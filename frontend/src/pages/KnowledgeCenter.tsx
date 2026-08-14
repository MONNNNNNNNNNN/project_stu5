import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TextField, Chip } from '@mui/material';
import { api } from '../lib/api';
import { PageChrome } from '../components/PageChrome';
import { ArticleCard } from '../components/ArticleCard';
import type { Article, Category } from '../types';

export default function KnowledgeCenter() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
  });

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles', search, category],
    queryFn: async () => {
      if (search.trim()) {
        return (await api.get<Article[]>('/search', { params: { q: search } })).data;
      }
      return (await api.get<Article[]>('/articles', { params: category ? { category } : {} })).data;
    },
  });

  return (
    <PageChrome>
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-brand-700">Learn</h1>

      <TextField
        placeholder="Search articles…"
        size="small"
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {!search.trim() && (categories?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip
            label="All"
            size="small"
            color={category === null ? 'primary' : 'default'}
            onClick={() => setCategory(null)}
          />
          {categories!.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              size="small"
              color={category === c.slug ? 'primary' : 'default'}
              onClick={() => setCategory(c.slug)}
            />
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {(articles ?? []).map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      {!isLoading && (articles ?? []).length === 0 && (
        <p className="text-sm text-gray-500">No articles found.</p>
      )}
    </div>
    </PageChrome>
  );
}
