import { guides, type Guide } from "@savekaro/content";
import { SectionTitle } from "@/components/content/SectionTitle";

export function GuideSections({ slug }: { slug: Guide["slug"] }) {
  const guide = guides.find((entry) => entry.slug === slug);
  return guide?.sections.map((section) => (
    <section key={section.title} className="space-y-2">
      <SectionTitle>{section.title}</SectionTitle>
      <p>{section.body}</p>
    </section>
  ));
}
