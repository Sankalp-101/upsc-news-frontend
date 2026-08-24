"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Article = {
  id: number;
  title: string;
  source?: string;
  url?: string;
  published_at?: string;
  category?: string;
  upsc_relevance?: number;
  priority?: string;
  primary_gs_paper?: string;
  secondary_gs_papers?: string[];
  prelims_relevance?: boolean;
  mains_relevance?: boolean;
  summary?: string;
  why_important_for_upsc?: string;
  topics?: string[];
  upsc_context?: string[];
  possible_questions?: string[];
};

type ApiResponse = {
  articles: Article[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

const API_BASE =
  "https://upsc-news-backend.onrender.com";

function formatDate(dateString?: string) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function relevanceClass(score = 0) {
  if (score >= 8) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (score >= 6) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function paperClass(paper?: string) {
  if (paper === "GS-I") {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }

  if (paper === "GS-II") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (paper === "GS-III") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (paper === "GS-IV") {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }

  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function DailyBriefPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBrief() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/api/news?page=1&limit=48`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Backend returned ${response.status}`
          );
        }

        const data: ApiResponse =
          await response.json();

        setArticles(data.articles ?? []);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load today's UPSC brief."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBrief();
  }, []);

  const sortedArticles = useMemo(() => {
    return [...articles].sort(
      (a, b) =>
        (b.upsc_relevance ?? 0) -
        (a.upsc_relevance ?? 0)
    );
  }, [articles]);

  const mustRead = useMemo(() => {
    return sortedArticles
      .filter(
        (article) =>
          (article.upsc_relevance ?? 0) >= 7
      )
      .slice(0, 6);
  }, [sortedArticles]);

  const prelimsArticles = useMemo(() => {
    return sortedArticles
      .filter(
        (article) =>
          article.prelims_relevance === true
      )
      .slice(0, 8);
  }, [sortedArticles]);

  const mainsArticles = useMemo(() => {
    return sortedArticles
      .filter(
        (article) =>
          article.mains_relevance === true
      )
      .slice(0, 8);
  }, [sortedArticles]);

  const groupedByGs = useMemo(() => {
    const groups: Record<string, Article[]> = {
      "GS-I": [],
      "GS-II": [],
      "GS-III": [],
      "GS-IV": [],
    };

    for (const article of sortedArticles) {
      const paper = article.primary_gs_paper;

      if (paper && groups[paper]) {
        groups[paper].push(article);
      }
    }

    return groups;
  }, [sortedArticles]);

  const today = new Date();

  const todayLabel = today.toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}
        <header className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              ← Back to News
            </Link>

            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              Daily Revision
            </span>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
              UPSC Current Affairs
            </p>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Daily UPSC Brief
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {todayLabel}
            </p>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600">
              A focused study view of the most relevant
              current affairs, organized for Prelims,
              Mains and GS-wise revision.
            </p>
          </div>
        </header>

        {/* LOADING */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-semibold text-slate-700">
              Preparing today's brief...
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Loading analyzed current affairs.
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-800">
              Unable to load brief
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* STATS */}
            <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Articles analyzed
                </p>

                <p className="mt-2 text-3xl font-black">
                  {articles.length}
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  Must read
                </p>

                <p className="mt-2 text-3xl font-black text-red-700">
                  {mustRead.length}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Prelims
                </p>

                <p className="mt-2 text-3xl font-black text-blue-700">
                  {prelimsArticles.length}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Mains
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-700">
                  {mainsArticles.length}
                </p>
              </div>
            </section>

            {/* MUST READ */}
            <section className="mb-10">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-600">
                  Priority reading
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Must Read Today
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Start here if you have limited study time.
                </p>
              </div>

              {mustRead.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  No high-priority articles available.
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {mustRead.map((article) => (
                    <article
                      key={article.id}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${relevanceClass(
                            article.upsc_relevance
                          )}`}
                        >
                          {article.upsc_relevance ?? 0}/10
                        </span>

                        {article.primary_gs_paper && (
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${paperClass(
                              article.primary_gs_paper
                            )}`}
                          >
                            {article.primary_gs_paper}
                          </span>
                        )}

                        {article.prelims_relevance && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                            PRELIMS
                          </span>
                        )}

                        {article.mains_relevance && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            MAINS
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-xl font-black leading-tight">
                        {article.title}
                      </h3>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {article.summary}
                      </p>

                      {article.why_important_for_upsc && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Why it matters
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {article.why_important_for_upsc}
                          </p>
                        </div>
                      )}

                      <div className="mt-5">
                        <Link
                          href={`/news/${article.id}`}
                          className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                        >
                          Read Full Analysis →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* GS REVISION */}
            <section className="mb-10">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                  Syllabus mapping
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Study by GS Paper
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {(
                  [
                    "GS-I",
                    "GS-II",
                    "GS-III",
                    "GS-IV",
                  ] as const
                ).map((paper) => {
                  const paperArticles =
                    groupedByGs[paper].slice(0, 4);

                  return (
                    <div
                      key={paper}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black">
                          {paper}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${paperClass(
                            paper
                          )}`}
                        >
                          {groupedByGs[paper].length} articles
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {paperArticles.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            No articles currently mapped here.
                          </p>
                        ) : (
                          paperArticles.map((article) => (
                            <Link
                              key={article.id}
                              href={`/news/${article.id}`}
                              className="block rounded-xl border border-slate-100 p-3 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-bold leading-5">
                                  {article.title}
                                </p>

                                <span className="shrink-0 text-xs font-black text-slate-500">
                                  {article.upsc_relevance}/10
                                </span>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* PRELIMS */}
            <section className="mb-10 rounded-2xl border border-blue-200 bg-blue-50/50 p-6">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                  Prelims revision
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  What to Remember
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Articles flagged by the analyzer as having
                  useful factual or conceptual value.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {prelimsArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/news/${article.id}`}
                    className="rounded-xl border border-blue-100 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                        PRELIMS
                      </span>

                      <span className="text-xs font-bold text-slate-500">
                        {article.primary_gs_paper}
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-black leading-5">
                      {article.title}
                    </h3>

                    {article.topics &&
                      article.topics.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {article.topics
                            .slice(0, 3)
                            .map((topic) => (
                              <span
                                key={topic}
                                className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                              >
                                {topic}
                              </span>
                            ))}
                        </div>
                      )}
                  </Link>
                ))}
              </div>
            </section>

            {/* MAINS */}
            <section className="mb-10 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-600">
                  Mains preparation
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Issues Worth Writing About
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Focus on these articles for analytical
                  preparation and answer writing.
                </p>
              </div>

              <div className="space-y-4">
                {mainsArticles.map((article) => (
                  <div
                    key={article.id}
                    className="rounded-xl border border-emerald-100 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        MAINS
                      </span>

                      {article.primary_gs_paper && (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${paperClass(
                            article.primary_gs_paper
                          )}`}
                        >
                          {article.primary_gs_paper}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-lg font-black">
                      {article.title}
                    </h3>

                    {article.possible_questions &&
                      article.possible_questions.length >
                        0 && (
                        <div className="mt-4 space-y-2">
                          {article.possible_questions
                            .slice(0, 2)
                            .map(
                              (
                                question,
                                index
                              ) => (
                                <div
                                  key={`${article.id}-${index}`}
                                  className="rounded-xl bg-slate-50 p-4"
                                >
                                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Practice Question{" "}
                                    {index + 1}
                                  </p>

                                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                                    {question}
                                  </p>
                                </div>
                              )
                            )}
                        </div>
                      )}

                    <Link
                      href={`/news/${article.id}`}
                      className="mt-4 inline-flex text-sm font-bold text-emerald-700 hover:text-emerald-900"
                    >
                      Open full analysis →
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* REVISION CTA */}
            <section className="rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                Study workflow
              </p>

              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Turn today's news into revision.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Start with the highest-relevance articles,
                review the Prelims concepts, then practice
                the Mains questions.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
                >
                  Browse All News
                </Link>

                {mustRead[0] && (
                  <Link
                    href={`/news/${mustRead[0].id}`}
                    className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Start with Top Story →
                  </Link>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}