"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
  prelims_relevance: boolean;
  mains_relevance: boolean;
  summary: string;
  why_important_for_upsc: string;
};

type FilterType =
  | "ALL"
  | "GS-I"
  | "GS-II"
  | "GS-III"
  | "GS-IV"
  | "PRELIMS"
  | "MAINS";

export default function Home() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<FilterType>("ALL");
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch(
          "https://upsc-news-backend.onrender.com/api/news"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch news");
        }

        const data = await response.json();

setArticles(
  Array.isArray(data)
    ? data
    : data.articles ?? []
);
      } catch (err) {
        console.error(err);
        setError("Unable to connect to the news server.");
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(articles.map((article) => article.category))
    ).sort();
  }, [articles]);

  const highPriority = articles.filter(
    (article) =>
      article.priority.toLowerCase() === "high"
  );

  const mediumPriority = articles.filter(
    (article) =>
      article.priority.toLowerCase() === "medium"
  );

  const lowPriority = articles.filter(
    (article) =>
      article.priority.toLowerCase() === "low"
  );

  const topArticles = useMemo(() => {
    return [...articles]
      .sort(
        (a, b) =>
          b.upsc_relevance - a.upsc_relevance
      )
      .slice(0, 3);
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return articles.filter((article) => {

      let matchesSyllabus = true;

      if (filter === "PRELIMS") {
        matchesSyllabus =
          article.prelims_relevance === true;
      } else if (filter === "MAINS") {
        matchesSyllabus =
          article.mains_relevance === true;
      } else if (filter !== "ALL") {
        matchesSyllabus =
          article.primary_gs_paper === filter;
      }

      if (!matchesSyllabus) {
        return false;
      }

      if (
        category !== "ALL" &&
        article.category !== category
      ) {
        return false;
      }

      if (searchText) {
        const searchableText = [
          article.title,
          article.category,
          article.primary_gs_paper,
          article.summary,
          article.why_important_for_upsc,
          article.source,
        ]
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }, [articles, filter, category, search]);

  const syllabusFilters: {
    label: string;
    value: FilterType;
  }[] = [
    { label: "All", value: "ALL" },
    { label: "GS-I", value: "GS-I" },
    { label: "GS-II", value: "GS-II" },
    { label: "GS-III", value: "GS-III" },
    { label: "GS-IV", value: "GS-IV" },
    { label: "Prelims", value: "PRELIMS" },
    { label: "Mains", value: "MAINS" },
  ];

  function clearFilters() {
    setSearch("");
    setFilter("ALL");
    setCategory("ALL");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <Link href="/">
              <h1 className="text-2xl font-bold">
                UPSC News
              </h1>
            </Link>

            <p className="text-sm text-slate-500">
              AI-curated current affairs for UPSC aspirants
            </p>
          </div>

          <div className="hidden rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 sm:block">
            Powered by Gemini
          </div>

        </div>
      </header>


      {/* MAIN */}
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* HERO */}
        <section className="mb-8">

          <div className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            DAILY CURRENT AFFAIRS
          </div>

          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Know what matters.
          </h2>

          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Important news filtered and analyzed specifically
            for UPSC preparation.
          </p>

        </section>


        {/* LOADING */}
        {loading && (
          <div className="rounded-2xl border bg-white p-10 text-center">
            <p className="text-slate-500">
              Loading current affairs...
            </p>
          </div>
        )}


        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h3 className="font-semibold text-red-800">
              Backend connection failed
            </h3>

            <p className="mt-2 text-sm text-red-700">
              Make sure FastAPI is running on port 8000.
            </p>
          </div>
        )}


        {/* DASHBOARD */}
        {!loading && !error && (
          <>

            {/* TODAY'S UPSC */}
            <section className="mb-10">

              <div className="mb-5">

                <h3 className="text-2xl font-bold">
                  Today&apos;s UPSC
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  A quick overview of the most important
                  current affairs.
                </p>

              </div>


              {/* STATS */}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Articles
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {articles.length}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    analyzed
                  </p>
                </div>


                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-500">
                    High Priority
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {highPriority.length}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    should read first
                  </p>
                </div>


                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-yellow-600">
                    Medium Priority
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {mediumPriority.length}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    worth reviewing
                  </p>
                </div>


                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                    Low Priority
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {lowPriority.length}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    optional reading
                  </p>
                </div>

              </div>

            </section>


            {/* MOST IMPORTANT */}

            <section className="mb-10">

              <div className="mb-5">

                <h3 className="text-2xl font-bold">
                  Most Important Today
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Highest UPSC relevance scores.
                </p>

              </div>


              <div className="grid gap-5 lg:grid-cols-3">

                {topArticles.map((article, index) => (

                  <Link
                    key={article.id}
                    href={`/news/${article.id}`}
                    className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        #{index + 1}
                      </span>

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                        {article.upsc_relevance}/10
                      </span>

                    </div>


                    <h4 className="mt-4 text-lg font-bold leading-snug group-hover:text-blue-700">
                      {article.title}
                    </h4>


                    <div className="mt-4 flex flex-wrap gap-2">

                      <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium">
                        {article.primary_gs_paper}
                      </span>

                      <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium">
                        {article.category}
                      </span>

                    </div>


                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {article.summary}
                    </p>

                  </Link>

                ))}

              </div>

            </section>


            {/* SEARCH */}

            <section className="mb-6">

              <label
                htmlFor="news-search"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search current affairs
              </label>

              <div className="relative max-w-3xl">

                <input
                  id="news-search"
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search articles, topics, countries, policies..."
                  className="w-full rounded-xl border bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>

              </div>

            </section>


            {/* FILTERS */}

            <section className="mb-8 space-y-5">

              <div>

                <div className="mb-3 text-sm font-semibold text-slate-700">
                  Filter by UPSC syllabus
                </div>

                <div className="flex flex-wrap gap-2">

                  {syllabusFilters.map((item) => {

                    const active =
                      filter === item.value;

                    return (
                      <button
                        key={item.value}
                        onClick={() =>
                          setFilter(item.value)
                        }
                        className={
                          active
                            ? "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                            : "rounded-full border bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                        }
                      >
                        {item.label}
                      </button>
                    );

                  })}

                </div>

              </div>


              <div>

                <div className="mb-3 text-sm font-semibold text-slate-700">
                  Filter by category
                </div>

                <div className="flex flex-wrap gap-2">

                  <button
                    onClick={() =>
                      setCategory("ALL")
                    }
                    className={
                      category === "ALL"
                        ? "rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-full border bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    }
                  >
                    All Categories
                  </button>


                  {categories.map((item) => (

                    <button
                      key={item}
                      onClick={() =>
                        setCategory(item)
                      }
                      className={
                        category === item
                          ? "rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                          : "rounded-full border bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                      }
                    >
                      {item}
                    </button>

                  ))}

                </div>

              </div>


              {(search ||
                filter !== "ALL" ||
                category !== "ALL") && (

                <button
                  onClick={clearFilters}
                  className="text-sm font-semibold text-red-600 hover:text-red-800"
                >
                  Clear all filters
                </button>

              )}

            </section>


            {/* ARTICLE LIST */}

            <section>

              <div className="mb-6 flex items-end justify-between">

                <div>

                  <h3 className="text-2xl font-bold">
                    Important News
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredArticles.length} articles matching
                    your selection.
                  </p>

                </div>

              </div>


              {filteredArticles.length === 0 ? (

                <div className="rounded-2xl border bg-white p-10 text-center">

                  <p className="font-semibold text-slate-700">
                    No articles found
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Try changing your search or filters.
                  </p>

                  <button
                    onClick={clearFilters}
                    className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Clear filters
                  </button>

                </div>

              ) : (

                <div className="grid gap-6 lg:grid-cols-2">

                  {filteredArticles.map((article) => (

                    <article
                      key={article.id}
                      className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >

                      <div className="flex items-center justify-between gap-4">

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {article.category}
                        </span>

                        <span className="text-sm font-bold">
                          UPSC {article.upsc_relevance}/10
                        </span>

                      </div>


                      <h4 className="mt-5 text-xl font-bold leading-snug">
                        {article.title}
                      </h4>


                      <div className="mt-4 flex flex-wrap gap-2">

                        <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium">
                          {article.primary_gs_paper}
                        </span>

                        <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium">
                          {article.priority} Priority
                        </span>

                        {article.prelims_relevance && (
                          <span className="rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Prelims
                          </span>
                        )}

                        {article.mains_relevance && (
                          <span className="rounded-md bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                            Mains
                          </span>
                        )}

                      </div>


                      <p className="mt-5 leading-7 text-slate-600">
                        {article.summary}
                      </p>


                      <div className="mt-5 rounded-xl bg-slate-50 p-4">

                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Why it matters for UPSC
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {article.why_important_for_upsc}
                        </p>

                      </div>


                      <div className="mt-6 flex items-center justify-between">

                        <span className="text-xs text-slate-400">
                          {article.source}
                        </span>

                        <Link
                          href={`/news/${article.id}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                        >
                          View UPSC Analysis →
                        </Link>

                      </div>

                    </article>

                  ))}

                </div>

              )}

            </section>

          </>
        )}

      </div>


      {/* FOOTER */}

      <footer className="border-t bg-white">

        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-400">
          UPSC News Prototype • AI-assisted current affairs
        </div>

      </footer>

    </main>
  );
}