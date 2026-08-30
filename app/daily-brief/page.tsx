"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Article = {
  id: number;
  title: string;
  source?: string;
  url?: string;
  published_at?: string;
  published_date?: string | null;
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

type ArchiveDate = {
  date: string;
  count: number;
};

type MCQ = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
};

type MCQApiResponse = {
  article_id: number;
  count: number;
  mcqs: MCQ[];
};

type MCQState = {
  loading: boolean;
  error: string;
  data: MCQ[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
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

function difficultyClass(
  difficulty: MCQ["difficulty"]
) {
  if (difficulty === "hard") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (difficulty === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function optionLabel(option: "A" | "B" | "C" | "D") {
  return option;
}

function getOptionText(
  mcq: MCQ,
  option: "A" | "B" | "C" | "D"
) {
  if (option === "A") return mcq.option_a;
  if (option === "B") return mcq.option_b;
  if (option === "C") return mcq.option_c;
  return mcq.option_d;
}

export default function DailyBriefPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availableDates, setAvailableDates] = useState<ArchiveDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search).get("date");
    return p && /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : "";
  });

  const [mcqsByArticle, setMcqsByArticle] =
    useState<Record<number, MCQState>>({});

  const [selectedAnswers, setSelectedAnswers] =
    useState<Record<string, "A" | "B" | "C" | "D">>(
      {}
    );

  useEffect(() => {
    let ignore = false;

    async function loadBriefData() {
      try {
        setLoading(true);
        setError("");

        const archivePromise = fetch(`${API_BASE}/api/archive/dates`, {
          cache: "no-store",
        })
          .then((res) => (res.ok ? res.json() : null))
          .catch((err) => {
            console.error("Unable to fetch archive dates", err);
            return null;
          });

        const newsUrl = selectedDate
          ? `${API_BASE}/api/news?page=1&limit=48&date=${selectedDate}`
          : `${API_BASE}/api/news?page=1&limit=48`;

        const newsPromise = fetch(newsUrl, {
          cache: "no-store",
        });

        const [archiveData, newsRes] = await Promise.all([
          archivePromise,
          newsPromise,
        ]);

        if (
          !ignore &&
          archiveData &&
          Array.isArray(archiveData.available_dates)
        ) {
          setAvailableDates(archiveData.available_dates);
        }

        if (!newsRes.ok) {
          throw new Error(`Backend returned ${newsRes.status}`);
        }

        const data: ApiResponse = await newsRes.json();
        if (!ignore) {
          setArticles(data.articles ?? []);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setError("Unable to load UPSC brief for this date.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadBriefData();

    return () => {
      ignore = true;
    };
  }, [selectedDate]);

  function handleDateSelect(newDate: string) {
    setSelectedDate(newDate);
    if (typeof window !== "undefined") {
      const newUrl = newDate ? `/daily-brief?date=${newDate}` : "/daily-brief";
      window.history.pushState(null, "", newUrl);
    }
  }

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

  const mcqArticles = useMemo(() => {
    return mustRead.slice(0, 3);
  }, [mustRead]);

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

  const todayLabel = new Date().toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  async function loadMCQs(articleId: number) {
    const existing = mcqsByArticle[articleId];

    if (existing && existing.data.length > 0) {
      return;
    }

    setMcqsByArticle((current) => ({
      ...current,
      [articleId]: {
        loading: true,
        error: "",
        data: [],
      },
    }));

    try {
      const response = await fetch(
        `${API_BASE}/api/news/${articleId}/mcqs`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Backend returned ${response.status}`
        );
      }

      const data: MCQApiResponse =
        await response.json();

      setMcqsByArticle((current) => ({
        ...current,
        [articleId]: {
          loading: false,
          error: "",
          data: data.mcqs ?? [],
        },
      }));
    } catch (err) {
      console.error(err);

      setMcqsByArticle((current) => ({
        ...current,
        [articleId]: {
          loading: false,
          error: "Unable to load MCQs for this article.",
          data: [],
        },
      }));
    }
  }

  function selectAnswer(
    articleId: number,
    mcqId: number,
    answer: "A" | "B" | "C" | "D"
  ) {
    const key = `${articleId}-${mcqId}`;

    setSelectedAnswers((current) => ({
      ...current,
      [key]: answer,
    }));
  }

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

            <span className="text-xs font-semibold text-slate-400">
              {todayLabel}
            </span>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                Daily UPSC Brief
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight">
                {selectedDate
                  ? `Brief for ${formatDate(selectedDate)}`
                  : "Today's Current Affairs"}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                A focused study view of the most relevant current affairs, organized for Prelims, Mains and GS-wise revision.
              </p>
            </div>

            {/* Date Archive Selector in Daily Brief */}
            {availableDates.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <span className="text-xs font-bold text-slate-500">
                  Select Date:
                </span>
                <select
                  value={selectedDate}
                  onChange={(e) => handleDateSelect(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="">Latest Today</option>
                  {availableDates.map((d) => (
                    <option key={d.date} value={d.date}>
                      {formatDate(d.date)} ({d.count} stories)
                    </option>
                  ))}
                </select>
                {selectedDate && (
                  <button
                    onClick={() => handleDateSelect("")}
                    className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* LOADING */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-semibold text-slate-700">
              Preparing UPSC brief...
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

            {/* MUST READ SECTION */}
            <section className="mb-12">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-600">
                  Priority 1
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Must Read Today
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Top 6 articles with highest UPSC relevance.
                </p>
              </div>

              {mustRead.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  No high-relevance articles found for this selection.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mustRead.map((article, index) => (
                    <article
                      key={article.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-300">
                          0{index + 1}
                        </span>

                        <span
                          className={`rounded-md border px-2 py-0.5 text-xs font-bold ${relevanceClass(
                            article.upsc_relevance
                          )}`}
                        >
                          {article.upsc_relevance ?? 0}/10
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {article.primary_gs_paper && (
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold border ${paperClass(
                              article.primary_gs_paper
                            )}`}
                          >
                            {article.primary_gs_paper}
                          </span>
                        )}

                        {article.category && (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {article.category}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-base font-bold leading-snug">
                        {article.title}
                      </h3>

                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                        {article.summary}
                      </p>

                      {article.why_important_for_upsc && (
                        <div className="mt-3 rounded-lg bg-blue-50/60 p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                            Why it matters
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-700">
                            {article.why_important_for_upsc}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[11px] text-slate-400">
                          {article.source}
                        </span>

                        <Link
                          href={`/news/${article.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          Analyze →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* PRELIMS QUICK TEST */}
            {mcqArticles.length > 0 && (
              <section className="mb-12">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                    Daily Practice
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Prelims Quick Practice
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Practice exam-standard MCQs directly based on today&apos;s must-read articles.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  {mcqArticles.map((article) => {
                    const state =
                      mcqsByArticle[article.id] ?? {
                        loading: false,
                        error: "",
                        data: [],
                      };

                    return (
                      <div
                        key={article.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                              {article.primary_gs_paper ?? "Current Affairs"}
                            </span>

                            <span className="text-xs font-bold text-slate-400">
                              {article.upsc_relevance ?? 0}/10
                            </span>
                          </div>

                          <h3 className="mt-2 text-sm font-bold leading-snug">
                            {article.title}
                          </h3>

                          {/* MCQ LIST */}
                          {state.data.length > 0 && (
                            <div className="mt-4 space-y-4">
                              {state.data.map((mcq, mIndex) => {
                                const answerKey = `${article.id}-${mcq.id}`;
                                const selected = selectedAnswers[answerKey];
                                const isCorrect = selected === mcq.correct_option;

                                return (
                                  <div
                                    key={mcq.id}
                                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] font-bold text-slate-400">
                                        Q{mIndex + 1}
                                      </span>

                                      <span
                                        className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${difficultyClass(
                                          mcq.difficulty
                                        )}`}
                                      >
                                        {mcq.difficulty}
                                      </span>
                                    </div>

                                    <p className="mt-2 text-xs font-bold leading-relaxed text-slate-800">
                                      {mcq.question}
                                    </p>

                                    <div className="mt-2.5 space-y-1.5">
                                      {(["A", "B", "C", "D"] as const).map(
                                        (opt) => {
                                          const text = getOptionText(mcq, opt);
                                          const isThisOption = selected === opt;
                                          const isThisCorrect =
                                            mcq.correct_option === opt;

                                          let btnClass =
                                            "w-full text-left text-xs p-2 rounded-lg border transition font-medium ";

                                          if (!selected) {
                                            btnClass +=
                                              "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-700";
                                          } else if (isThisOption && isCorrect) {
                                            btnClass +=
                                              "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold";
                                          } else if (
                                            isThisOption &&
                                            !isCorrect
                                          ) {
                                            btnClass +=
                                              "bg-red-50 border-red-300 text-red-800 font-bold";
                                          } else if (isThisCorrect) {
                                            btnClass +=
                                              "bg-emerald-50 border-emerald-300 text-emerald-800";
                                          } else {
                                            btnClass +=
                                              "bg-white border-slate-200 text-slate-400 opacity-60";
                                          }

                                          return (
                                            <button
                                              key={opt}
                                              disabled={Boolean(selected)}
                                              onClick={() =>
                                                selectAnswer(
                                                  article.id,
                                                  mcq.id,
                                                  opt
                                                )
                                              }
                                              className={btnClass}
                                            >
                                              <span className="font-bold mr-1.5">
                                                {optionLabel(opt)}.
                                              </span>
                                              {text}
                                            </button>
                                          );
                                        }
                                      )}
                                    </div>

                                    {selected && (
                                      <div className="mt-2.5 rounded-lg bg-white p-2.5 border border-slate-200 text-[11px] leading-relaxed text-slate-600">
                                        <p
                                          className={`font-bold ${
                                            isCorrect
                                              ? "text-emerald-700"
                                              : "text-red-700"
                                          }`}
                                        >
                                          {isCorrect
                                            ? "✓ Correct Answer"
                                            : `✗ Incorrect (Correct: ${mcq.correct_option})`}
                                        </p>
                                        <p className="mt-1 text-slate-600">
                                          {mcq.explanation}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {state.loading && (
                            <p className="mt-4 text-xs font-semibold text-slate-400">
                              Generating UPSC practice questions...
                            </p>
                          )}

                          {state.error && (
                            <p className="mt-4 text-xs font-semibold text-red-500">
                              {state.error}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 border-t border-slate-100 pt-3">
                          {state.data.length === 0 && !state.loading && (
                            <button
                              onClick={() => loadMCQs(article.id)}
                              className="w-full rounded-xl bg-blue-50 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              Practice Prelims MCQs →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* GS SYLLABUS BREAKDOWN */}
            <section className="mb-12">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-600">
                  Syllabus Mapping
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  GS Paper-wise Breakdown
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Revision view categorized across GS Papers I to IV.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {(["GS-I", "GS-II", "GS-III", "GS-IV"] as const).map((paper) => {
                  const list = groupedByGs[paper] ?? [];

                  return (
                    <div
                      key={paper}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span
                          className={`rounded px-2.5 py-1 text-xs font-black border ${paperClass(
                            paper
                          )}`}
                        >
                          {paper}
                        </span>

                        <span className="text-xs font-bold text-slate-400">
                          {list.length} {list.length === 1 ? "story" : "stories"}
                        </span>
                      </div>

                      {list.length === 0 ? (
                        <p className="mt-4 text-xs text-slate-400">
                          No articles mapped to {paper} today.
                        </p>
                      ) : (
                        <div className="mt-3 divide-y divide-slate-100">
                          {list.map((article) => (
                            <div key={article.id} className="py-3">
                              <Link
                                href={`/news/${article.id}`}
                                className="text-sm font-bold leading-snug hover:text-blue-600 transition"
                              >
                                {article.title}
                              </Link>

                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                {article.summary}
                              </p>

                              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                                <span>{article.category}</span>
                                <span className="font-semibold text-slate-600">
                                  {article.upsc_relevance}/10
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* MAINS ANSWER PRACTICE */}
            <section className="mb-12">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-600">
                  Mains Practice
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Mains Question Bank
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Analytical questions extracted from today&apos;s news for answer writing practice.
                </p>
              </div>

              <div className="space-y-4">
                {mainsArticles.map((article) => (
                  <div
                    key={article.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-violet-700">
                        {article.primary_gs_paper} • {article.category}
                      </span>

                      <span className="text-xs font-semibold text-slate-400">
                        {article.source}
                      </span>
                    </div>

                    <h3 className="mt-2 text-base font-bold leading-snug">
                      {article.title}
                    </h3>

                    {Array.isArray(article.possible_questions) &&
                      article.possible_questions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {article.possible_questions
                            .filter(Boolean)
                            .map((question, qIdx) => (
                              <div
                                key={qIdx}
                                className="rounded-xl border border-violet-100 bg-violet-50/50 p-3"
                              >
                                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                                  Question {qIdx + 1}
                                </p>

                                <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                                  {question}
                                </p>
                              </div>
                            ))}
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
                Turn today&apos;s news into revision.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Start with the highest-relevance articles, review the Prelims concepts, then practice the Mains questions.
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
