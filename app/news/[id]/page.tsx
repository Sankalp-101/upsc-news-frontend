"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type NewsArticle = {
  id: number;
  title: string;
  source: string;
  url: string;
  published_at: string | null;
  category: string;
  upsc_relevance: number;
  priority: string;
  primary_gs_paper: string;
  secondary_gs_papers: string;
  prelims_relevance: boolean;
  mains_relevance: boolean;
  topics: string;
  summary: string;
  why_important_for_upsc: string;
  source_facts: string;
  upsc_context: string;
  possible_questions: string;
};

function parseJSON(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function NewsArticlePage() {
  const params = useParams();
  const id = params.id;

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchArticle() {
      try {
        const response = await fetch(
          `https://upsc-news-backend.onrender.com/api/news/${id}`
        );

        if (!response.ok) {
          throw new Error("Article not found");
        }

        const data = await response.json();
        setArticle(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load this article.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchArticle();
    }
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="rounded-2xl border bg-white p-10 text-center">
            <p className="text-slate-500">
              Loading UPSC analysis...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="rounded-2xl border bg-white p-10 text-center">
            <h1 className="text-xl font-bold">
              Article not found
            </h1>

            <p className="mt-3 text-slate-500">
              We couldn't find the requested UPSC article.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block font-semibold text-blue-600"
            >
              ← Back to news
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const topics = parseJSON(article.topics);
  const sourceFacts = parseJSON(article.source_facts);
  const context = parseJSON(article.upsc_context);
  const questions = parseJSON(article.possible_questions);
  const secondaryGS = parseJSON(article.secondary_gs_papers);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <Link
            href="/"
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Back to UPSC News
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Article header */}
        <section>

          <div className="flex flex-wrap gap-2">

            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {article.category}
            </span>

            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              {article.primary_gs_paper}
            </span>

            {secondaryGS.map((paper) => (
              <span
                key={paper}
                className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {paper}
              </span>
            ))}

          </div>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {article.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{article.source}</span>

            {article.published_at && (
              <>
                <span>•</span>
                <span>{article.published_at}</span>
              </>
            )}
          </div>

        </section>

        {/* Relevance score */}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              UPSC Relevance
            </p>

            <p className="mt-2 text-3xl font-bold">
              {article.upsc_relevance}/10
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Prelims
            </p>

            <p className="mt-2 text-xl font-bold">
              {article.prelims_relevance
                ? "Relevant"
                : "Low relevance"}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Mains
            </p>

            <p className="mt-2 text-xl font-bold">
              {article.mains_relevance
                ? "Relevant"
                : "Low relevance"}
            </p>
          </div>

        </section>

        {/* Main content */}
        <div className="mt-10 space-y-8">

          {/* Summary */}
          <section className="rounded-2xl border bg-white p-7">

            <h2 className="text-2xl font-bold">
              What happened?
            </h2>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              {article.summary}
            </p>

          </section>

          {/* Why UPSC */}
          <section className="rounded-2xl border bg-white p-7">

            <h2 className="text-2xl font-bold">
              Why does it matter for UPSC?
            </h2>

            <p className="mt-4 leading-8 text-slate-600">
              {article.why_important_for_upsc}
            </p>

          </section>

          {/* Topics */}
          {topics.length > 0 && (
            <section className="rounded-2xl border bg-white p-7">

              <h2 className="text-2xl font-bold">
                Important Topics
              </h2>

              <div className="mt-5 flex flex-wrap gap-3">

                {topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    {topic}
                  </span>
                ))}

              </div>

            </section>
          )}

          {/* Facts */}
          {sourceFacts.length > 0 && (
            <section className="rounded-2xl border bg-white p-7">

              <h2 className="text-2xl font-bold">
                Key Facts
              </h2>

              <ul className="mt-5 space-y-4">

                {sourceFacts.map((fact, index) => (
                  <li
                    key={index}
                    className="flex gap-3 leading-7 text-slate-600"
                  >
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    <span>{fact}</span>
                  </li>
                ))}

              </ul>

            </section>
          )}

          {/* UPSC context */}
          {context.length > 0 && (
            <section className="rounded-2xl border bg-white p-7">

              <h2 className="text-2xl font-bold">
                UPSC Context
              </h2>

              <ul className="mt-5 space-y-4">

                {context.map((item, index) => (
                  <li
                    key={index}
                    className="flex gap-3 leading-7 text-slate-600"
                  >
                    <span className="font-bold text-blue-600">
                      {index + 1}.
                    </span>

                    <span>{item}</span>
                  </li>
                ))}

              </ul>

            </section>
          )}

          {/* Questions */}
          {questions.length > 0 && (
            <section className="rounded-2xl border bg-white p-7">

              <h2 className="text-2xl font-bold">
                Possible UPSC Questions
              </h2>

              <div className="mt-5 space-y-5">

                {questions.map((question, index) => (
                  <div
                    key={index}
                    className="rounded-xl bg-slate-50 p-5"
                  >
                    <p className="font-semibold leading-7 text-slate-800">
                      {index + 1}. {question}
                    </p>
                  </div>
                ))}

              </div>

            </section>
          )}

          {/* Original source */}
          <section className="rounded-2xl border bg-slate-900 p-7 text-white">

            <h2 className="text-xl font-bold">
              Want to read the original?
            </h2>

            <p className="mt-2 text-slate-300">
              Read the complete article from the original publisher.
            </p>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100"
            >
              Read Original Article →
            </a>

          </section>

        </div>

      </div>

    </main>
  );
}