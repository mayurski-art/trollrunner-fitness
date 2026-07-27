import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "@/lib/education/articles";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return { title: article.title, description: article.summary };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <Link href="/learn" className="text-xs font-semibold text-brand">
        ← Learn
      </Link>
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-brand">
          {article.category}
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{article.title}</h1>
        <p className="mt-2 text-sm text-muted">{article.summary}</p>
      </div>
      <div className="space-y-4">
        {article.paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-foreground">
            {p}
          </p>
        ))}
      </div>
      <p className="border-t border-line pt-4 text-xs text-muted">
        This is educational content, not medical advice — talk to a doctor about anything
        specific to your health or an existing injury.
      </p>
    </article>
  );
}
