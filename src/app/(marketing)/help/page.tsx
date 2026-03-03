"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, Settings, Bell, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { helpArticles, HELP_CATEGORIES, searchArticles } from "@/lib/help/articles";
import type { HelpArticle } from "@/lib/help/articles";

const categoryIcons: Record<string, React.ReactNode> = {
  "getting-started": <BookOpen className="h-5 w-5" />,
  quickbooks: <Settings className="h-5 w-5" />,
  reminders: <Bell className="h-5 w-5" />,
  billing: <CreditCard className="h-5 w-5" />,
};

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filteredArticles = useMemo(() => {
    if (!query.trim()) return null;
    return searchArticles(query.trim());
  }, [query]);

  const groupedArticles = useMemo(() => {
    const map = new Map<string, HelpArticle[]>();
    for (const cat of HELP_CATEGORIES) {
      map.set(cat.id, helpArticles.filter((a) => a.category === cat.id));
    }
    return map;
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Help Center</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Find answers to common questions about CashPilot.
        </p>
      </div>

      {/* Search */}
      <div className="relative mx-auto mb-10 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search help articles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {filteredArticles !== null ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {filteredArticles.length} result{filteredArticles.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </h2>
          {filteredArticles.length === 0 ? (
            <p className="text-muted-foreground">
              No articles found. Try a different search term or browse categories below.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={"/help/" + article.slug}
                  className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{article.title}</h3>
                    <Badge variant="secondary">{article.categoryLabel}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {article.content.slice(0, 150)}...
                  </p>
                </Link>
              ))}
            </div>
          )}
          <button
            onClick={() => setQuery("")}
            className="text-sm text-primary hover:underline"
          >
            Clear search and browse all categories
          </button>
        </div>
      ) : (
        /* Categories */
        <div className="grid gap-6 md:grid-cols-2">
          {HELP_CATEGORIES.map((cat) => {
            const articles = groupedArticles.get(cat.id) ?? [];
            return (
              <Card key={cat.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      {categoryIcons[cat.id]}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{cat.label}</CardTitle>
                      <CardDescription>{cat.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {articles.map((article) => (
                      <li key={article.slug}>
                        <Link
                          href={"/help/" + article.slug}
                          className="text-sm text-primary hover:underline"
                        >
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Contact */}
      <div className="mt-12 rounded-lg border bg-muted/30 p-6 text-center">
        <h2 className="text-lg font-semibold">Still need help?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Contact our support team and we will get back to you within 24 hours.
        </p>
        <a
          href="mailto:support@cashpilot.com?subject=Help%20Request"
          className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Email Support
        </a>
      </div>
    </div>
  );
}
