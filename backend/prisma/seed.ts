import { PrismaClient } from '@prisma/client';
import { understandingBoneAge, nutritionForPreTeens, navigatingGrowthSpurts } from './articles-content';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Growth', slug: 'growth' },
    { name: 'Nutrition', slug: 'nutrition' },
    { name: 'Bone Age', slug: 'bone-age' },
  ];

  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  const growth = await prisma.category.findUniqueOrThrow({ where: { slug: 'growth' } });
  const nutrition = await prisma.category.findUniqueOrThrow({ where: { slug: 'nutrition' } });
  const boneAge = await prisma.category.findUniqueOrThrow({ where: { slug: 'bone-age' } });

  const articles = [
    {
      categoryId: growth.id,
      title: 'Navigating Growth Spurts',
      slug: 'navigating-growth-spurts',
      summary:
        'When the pubertal growth spurt happens, how fast it goes, and which changes are worth a doctor’s attention.',
      contentMd: navigatingGrowthSpurts,
      tag: 'Article',
    },
    {
      categoryId: nutrition.id,
      title: 'Nutrition for Pre-teens',
      slug: 'nutrition-for-pre-teens',
      summary:
        'Calcium, vitamin D, iron and protein targets for ages 9–13 — and the everyday habits that matter more than any single nutrient.',
      contentMd: nutritionForPreTeens,
      tag: 'Guide',
    },
    {
      categoryId: boneAge.id,
      title: 'Understanding Bone Age',
      slug: 'understanding-bone-age',
      summary:
        'How skeletal maturity is read from a hand X-ray, why a doctor would order one, and the limits of what it can tell you.',
      contentMd: understandingBoneAge,
      tag: 'Explainer',
    },
  ];

  for (const article of articles) {
    // `update` carries the same fields as `create` on purpose: the seed is the source of
    // truth for this content, so re-running it after an edit actually republishes the
    // article. An empty `update` would silently leave the old body in place.
    const { slug, ...fields } = article;
    await prisma.article.upsert({
      where: { slug },
      update: fields,
      create: { ...fields, slug, publishedAt: new Date() },
    });
  }

  console.log(`Seed complete: ${categories.length} categories, ${articles.length} articles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
