"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
    await prisma.article.upsert({
        where: { slug: 'navigating-growth-spurts' },
        update: {},
        create: {
            categoryId: growth.id,
            title: 'Navigating Growth Spurts',
            slug: 'navigating-growth-spurts',
            summary: 'Learn to identify the signs of peak height velocity and what to expect during this rapid growth phase.',
            contentMd: '# Navigating Growth Spurts\n\nGrowth spurts are periods of rapid physical growth...',
            tag: 'Article',
            publishedAt: new Date(),
        },
    });
    await prisma.article.upsert({
        where: { slug: 'nutrition-for-pre-teens' },
        update: {},
        create: {
            categoryId: nutrition.id,
            title: 'Nutrition for Pre-teens',
            slug: 'nutrition-for-pre-teens',
            summary: 'Essential macronutrients and vitamins required to support optimal bone density and healthy development.',
            contentMd: '# Nutrition for Pre-teens\n\nBalanced nutrition during pre-adolescence...',
            tag: 'Guide',
            publishedAt: new Date(),
        },
    });
    await prisma.article.upsert({
        where: { slug: 'understanding-bone-age' },
        update: {},
        create: {
            categoryId: boneAge.id,
            title: 'Understanding Bone Age',
            slug: 'understanding-bone-age',
            summary: 'How skeletal maturity differs from chronological age and why it matters for final height prediction.',
            contentMd: '# Understanding Bone Age\n\nBone age is a measure of skeletal maturity...',
            tag: 'Video',
            publishedAt: new Date(),
        },
    });
    console.log('Seed complete.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map