import { Link, useLocation } from 'react-router-dom';
import StraightenIcon from '@mui/icons-material/StraightenOutlined';
import RestaurantIcon from '@mui/icons-material/RestaurantOutlined';
import MedicalServicesIcon from '@mui/icons-material/MedicalServicesOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBookOutlined';
import type { Article } from '../types';

/**
 * Card art is generated from the article's category rather than an uploaded image. The
 * cards previously reserved a block of space for a cover image that no article has, so
 * every card rendered with an empty pale-green rectangle on top — it read as a broken
 * image, not as a design. An icon on a category-tinted panel fills the same slot and is
 * honest about there being no photograph.
 */
const CATEGORY_ART: Record<string, { icon: typeof StraightenIcon; panel: string; tint: string }> = {
  growth: { icon: StraightenIcon, panel: 'bg-brand-50', tint: 'text-brand-500' },
  nutrition: { icon: RestaurantIcon, panel: 'bg-sage-100', tint: 'text-sage-600' },
  'bone-age': { icon: MedicalServicesIcon, panel: 'bg-amber-50', tint: 'text-amber-600' },
};

const FALLBACK_ART = { icon: MenuBookIcon, panel: 'bg-brand-50', tint: 'text-brand-500' };

export function ArticleCard({ article, height = 'h-28' }: { article: Article; height?: string }) {
  const art = CATEGORY_ART[article.category?.slug] ?? FALLBACK_ART;
  const Icon = art.icon;
  // So the article page can send the reader back where they actually came from.
  const { pathname } = useLocation();

  return (
    <Link
      to={`/learn/${article.id}`}
      state={{ from: pathname }}
      className="bg-surface rounded-2xl shadow-sm overflow-hidden border border-transparent hover:border-brand-300 hover:shadow-md transition-all flex flex-col"
    >
      <div className={`${height} ${art.panel} flex items-center justify-center`}>
        <Icon className={art.tint} sx={{ fontSize: 40 }} />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-600">
          {article.tag ?? article.category?.name}
        </span>
        <h3 className="font-medium text-sm mt-1 text-ink">{article.title}</h3>
        <p className="text-xs text-gray-500 mt-1 line-clamp-3">{article.summary}</p>
      </div>
    </Link>
  );
}
