import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Electronics", slug: "electronics", icon: "💻", color: "#3B82F6" },
  { name: "Fashion", slug: "fashion", icon: "👕", color: "#EC4899" },
  { name: "Gaming", slug: "gaming", icon: "🎮", color: "#8B5CF6" },
  { name: "Home & Kitchen", slug: "home-kitchen", icon: "🏠", color: "#F59E0B" },
  { name: "Beauty", slug: "beauty", icon: "💄", color: "#F472B6" },
  { name: "Food & Groceries", slug: "food-groceries", icon: "🍕", color: "#10B981" },
  { name: "Mobile & Accessories", slug: "mobile-accessories", icon: "📱", color: "#6366F1" },
  { name: "Books & Stationery", slug: "books-stationery", icon: "📚", color: "#84CC16" },
  { name: "Travel", slug: "travel", icon: "✈️", color: "#0EA5E9" },
  { name: "Other", slug: "other", icon: "📦", color: "#6B7280" },
];

async function main() {
  console.log("🌱 Seeding database...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`✅ Seeded ${categories.length} categories`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
