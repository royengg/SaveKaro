import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Electronics", slug: "electronics", color: "#3B82F6" },
  { name: "Fashion", slug: "fashion", color: "#EC4899" },
  { name: "Gaming", slug: "gaming", color: "#8B5CF6" },
  { name: "Home & Kitchen", slug: "home-kitchen", color: "#F59E0B" },
  { name: "Beauty", slug: "beauty", color: "#F472B6" },
  { name: "Food & Groceries", slug: "food-groceries", color: "#10B981" },
  {
    name: "Mobile & Accessories",
    slug: "mobile-accessories",
    color: "#6366F1",
  },
  { name: "Books & Stationery", slug: "books-stationery", color: "#84CC16" },
  { name: "Travel", slug: "travel", color: "#0EA5E9" },
  { name: "Other", slug: "other", color: "#6B7280" },
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
