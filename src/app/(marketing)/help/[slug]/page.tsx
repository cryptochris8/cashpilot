"use client";

import { useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getArticleBySlug, getRelatedArticles } from "@/lib/help/articles";

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mt-6 mb-2 text-lg font-semibold">
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="mt-8 mb-3 text-2xl font-bold">
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-sm text-muted-foreground">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, "");
      elements.push(
        <li key={i} className="ml-4 list-decimal text-sm text-muted-foreground">
          {renderInline(text)}
        </li>
      );
    } else if (line === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-muted-foreground leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  }

  return <div className="space-y-1">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  const article = getArticleBySlug(slug);

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Article Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The help article you are looking for does not exist.
        </p>
        <Link
          href="/help"
          className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Help Center
        </Link>
      </div>
    );
  }

  const related = getRelatedArticles(article);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Back link */}
      <Link
        href="/help"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Help Center
      </Link>

      {/* Category badge */}
      <Badge variant="secondary" className="mb-4">
        {article.categoryLabel}
      </Badge>

      {/* Article content */}
      <div className="prose-sm">{renderMarkdown(article.content)}</div>

      {/* Feedback */}
      <Separator className="my-8" />
      <div className="text-center">
        <p className="text-sm font-medium">Was this article helpful?</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button
            variant={feedback === "yes" ? "default" : "outline"}
            size="sm"
            onClick={() => setFeedback("yes")}
          >
            <ThumbsUp className="mr-1 h-4 w-4" />
            Yes
          </Button>
          <Button
            variant={feedback === "no" ? "default" : "outline"}
            size="sm"
            onClick={() => setFeedback("no")}
          >
            <ThumbsDown className="mr-1 h-4 w-4" />
            No
          </Button>
        </div>
        {feedback && (
          <p className="mt-2 text-xs text-muted-foreground">
            Thank you for your feedback!
          </p>
        )}
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <>
          <Separator className="my-8" />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={"/help/" + r.slug}
                      className="text-sm text-primary hover:underline"
                    >
                      {r.title}
                    </Link>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {r.categoryLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
