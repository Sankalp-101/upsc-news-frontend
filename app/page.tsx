"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://upsc-news-backend.onrender.com";

type NewsArticle = {
  id: number;
  title: string;
  source: string;
  url: string;
  published_at: string | null;
  published_date?: string | null;
  category: string;
  upsc_relevance: number;
  priority: string;
  primary_gs_paper: string;
  prelims_relevance: boolean;
  mains_relevance: boolean;
  summary: string;
  why_important_for_upsc: string;
};

type Stats = {
  total_articles: number;
  high_priority: number;
  prelims_relevant: number;
  mains_relevant: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type ArchiveDate = {
  date: string;
  count: number;
};

type FilterType =
  | "ALL"
  | "GS-I"
  | "GS-II"
  | "GS-III"
  | "GS-IV"
  | "PRELIMS"
  | "MAINS";

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

function priorityClass(priority: string) {
  switch (priority.toLowerCase()) {
    case "high":
      return "bg-red-50 text-red-700 ring-red-100";
    case "medium":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function relevanceClass(score: number) {
  if (score >= 9) return "text-red-600";
  if (score >= 7) return "text-blue-600";
  return "text-slate-600";
}

function getTodayIST(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  return ist.toISOString().slice(0, 10);
}

function getYesterdayIST(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5 - 86400000);
  return ist.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function Home() {
  const [articles, setArticles] =
    useState<NewsArticle[]>([]);

  const [stats, setStats] =
    useState<Stats | null>(null);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [categories, setCategories] =
    useState<string[]>([]);

  const [availableDates, setAvailableDates] =
    useState<ArchiveDate[]>([]);

  const [selectedDate, setSelectedDate] =
    useState<string>("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState<FilterType>("ALL");

  const [category, setCategory] =
    useState("ALL");

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const limit = 48;

  const todayIST = useMemo(() => getTodayIST(), []);
  const yesterdayIST = useMemo(() => getYesterdayIST(), []);

  // Compute previous and next available archive dates based on sorted availableDates list
  const { prevAvailableDate, nextAvailableDate } = useMemo(() => {
    if (!selectedDate || availableDates.length === 0) {
      return { prevAvailableDate: null, nextAvailableDate: null };
    }
    const idx = availableDates.findIndex((d) => d.date === selectedDate);
    if (idx === -1) {
      // If date is not in list, find closest
      const older = availableDates.find((d) => d.date < selectedDate);
      const newer = [...availableDates].reverse().find((d) => d.date > selectedDate);
      return {
        prevAvailableDate: older ? older.date : null,
        nextAvailableDate: newer ? newer.date : null,
      };
    }
    return {
      prevAvailableDate: idx + 1 < availableDates.length ? availableDates[idx + 1].date : null,
      nextAvailableDate: idx > 0 ? availableDates[idx - 1].date : null,
    };
  }, [selectedDate, availableDates]);

  // Synchronize URL with active filters and date
  function syncUrl(newDate: string, newSearch = search, newCat = category, newFilter = filter) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (newDate) params.set("date", newDate);
    if (newSearch.trim()) params.set("search", newSearch.trim());
    if (newCat !== "ALL") params.set("category", newCat);
    if (newFilter !== "ALL") params.set("filter", newFilter);

    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : "/";
    window.history.pushState(null, "", newUrl);
  }

  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
    setPage(1);
    syncUrl(newDate, search, category, filter);
  }

  async function fetchNews(targetPage = page) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", String(targetPage));
      params.set("limit", String(limit));

      if (selectedDate) {
        params.set("date", selectedDate);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (category !== "ALL") {
        params.set("category", category);
      }

      if (
        filter !== "ALL" &&
        filter !== "PRELIMS" &&
        filter !== "MAINS"
      ) {
        params.set("gs_paper", filter);
      }

      const response = await fetch(
        `${API_BASE}/api/news?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch news: ${response.status}`
        );
      }

      const data = await response.json();

      const receivedArticles = Array.isArray(data)
        ? data
        : Array.isArray(data?.articles)
          ? data.articles
          : [];

      setArticles(receivedArticles);

      if (data && data.pagination) {
        setPagination(data.pagination);
      } else {
        setPagination(null);
      }
    } catch (err) {
      console.error("Unable to fetch news:", err);
      setArticles([]);
      setPagination(null);
      setError("Unable to connect to the news server.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch(
        `${API_BASE}/api/stats`,
        {
          cache: "no-store",
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Unable to fetch stats", err);
    }
  }

  async function fetchCategories() {
    try {
      const response = await fetch(
        `${API_BASE}/api/categories`,
        {
          cache: "no-store",
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      setCategories(
        Array.isArray(data?.categories) ? data.categories : []
      );
    } catch (err) {
      console.error("Unable to fetch categories", err);
    }
  }

  async function fetchArchiveDates() {
    try {
      const response = await fetch(
        `${API_BASE}/api/archive/dates`,
        {
          cache: "no-store",
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      setAvailableDates(
        Array.isArray(data?.available_dates) ? data.available_dates : []
      );
    } catch (err) {
      console.error("Unable to fetch archive dates", err);
    }
  }

  /*
   * Initialize on mount & parse query parameters from URL.
   */
  useEffect(() => {
    fetchStats();
    fetchCategories();
    fetchArchiveDates();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initialDate = params.get("date");
      const initialSearch = params.get("search");
      const initialCategory = params.get("category");
      const initialFilter = params.get("filter") as FilterType;

      if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
        setSelectedDate(initialDate);
      }
      if (initialSearch) {
        setSearch(initialSearch);
      }
      if (initialCategory) {
        setCategory(initialCategory);
      }
      if (
        initialFilter &&
        syllabusFilters.some((f) => f.value === initialFilter)
      ) {
        setFilter(initialFilter);
      }
    }
  }, []);

  /*
   * When search/filter/category/selectedDate changes,
   * reset to page 1.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [search, category, filter, selectedDate]);

  /*
   * Single source of truth for news fetching.
   */
  useEffect(() => {
    fetchNews(page);
  }, [page, search, category, filter, selectedDate]);

  const topArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => b.upsc_relevance - a.upsc_relevance)
      .slice(0, 3);
  }, [articles]);

  const visibleArticles = useMemo(() => {
    if (filter !== "PRELIMS" && filter !== "MAINS") {
      return articles;
    }

    return articles.filter((article) =>
      filter === "PRELIMS"
        ? article.prelims_relevance
        : article.mains_relevance
    );
  }, [articles, filter]);

  function clearFilters() {
    setSearch("");
    setFilter("ALL");
    setCategory("ALL");
    setSelectedDate("");
    setPage(1);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/");
    }
  }

  const totalFilteredArticles = visibleArticles.length;

  const totalPages =
    filter === "PRELIMS" || filter === "MAINS"
      ? Math.max(1, Math.ceil(totalFilteredArticles / 12))
      : pagination?.pages ?? 1;

  const paginatedVisibleArticles =
    filter === "PRELIMS" || filter === "MAINS"
      ? visibleArticles.slice((page - 1) * 12, page * 12)
      : visibleArticles;

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-950">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
              U
            </div>
            <div>
              <div className="text-lg font-black tracking-tight">
                UPSC News
              </div>
              <div className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:block">
                Current Affairs Intelligence
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:inline-flex">
              AI CURATED
            </span>
            <a
              href="#news"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Explore
            </a>
            <Link
              href="/daily-brief"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Daily Brief →
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
                <span>Verified Editorial Intelligence</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl sm:leading-tight">
                Current Affairs, Filtered for the Civil Services.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Curated exclusively from trusted editorial and authoritative sources: The Hindu, Indian Express, Livemint, PIB, RBI, PRS, NITI Aayog, MEA, and Down To Earth.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                  Intelligence Brief
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                  LIVE
                </span>
              </div>

              <div className="mt-8">
                <p className="text-4xl font-black">
                  {stats?.total_articles ?? articles.length}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  analyzed current-affairs stories
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-2xl font-black text-red-400">
                    {stats?.high_priority ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    High priority
                  </p>
                </div>

                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-2xl font-black text-blue-300">
                    {stats?.mains_relevant ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Mains relevant
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        {/* STATS */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Articles analyzed",
              value: stats?.total_articles ?? articles.length,
              detail: "AI-screened",
            },
            {
              label: "High priority",
              value: stats?.high_priority ?? 0,
              detail: "Read first",
            },
            {
              label: "Prelims relevant",
              value: stats?.prelims_relevant ?? 0,
              detail: "Objective preparation",
            },
            {
              label: "Mains relevant",
              value: stats?.mains_relevant ?? 0,
              detail: "Answer writing",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {stat.label}
              </p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-3xl font-black tracking-tight">
                  {stat.value}
                </p>
                <span className="text-xs font-semibold text-slate-400">
                  {stat.detail}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* TOP STORIES */}
        <section id="top-stories" className="mt-14">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                Editor&apos;s selection
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Most important today
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              Ranked by UPSC relevance
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {topArticles.map((article, index) => (
              <Link
                key={article.id}
                href={`/news/${article.id}`}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
              >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-blue-50 transition group-hover:bg-blue-100" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-300">
                      0{index + 1}
                    </span>
                    <span
                      className={`text-2xl font-black ${relevanceClass(
                        article.upsc_relevance
                      )}`}
                    >
                      {article.upsc_relevance}
                      <span className="text-sm text-slate-300">/10</span>
                    </span>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-md bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      {article.primary_gs_paper}
                    </span>
                    <span
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${priorityClass(
                        article.priority
                      )}`}
                    >
                      {article.priority}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-black leading-snug tracking-tight group-hover:text-blue-600">
                    {article.title}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                    {article.summary}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-medium text-slate-400">
                      {article.source}
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      Analyze →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* NEWS EXPLORER & ARCHIVE */}
        <section id="news" className="mt-16">
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              Current affairs database
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Explore the news
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Search, filter and navigate historical daily archives for your UPSC preparation.
            </p>
          </div>

          {/* DATE ARCHIVE SELECTOR */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    Current Affairs Archive
                  </span>
                  {selectedDate && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">
                      FILTERED
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {selectedDate ? (
                    <>
                      Viewing <span className="text-blue-600">{formatDisplayDate(selectedDate)}</span>
                      <span className="ml-2 font-normal text-slate-400">
                        ({pagination?.total ?? visibleArticles.length} stories)
                      </span>
                    </>
                  ) : (
                    "Browse Daily News Archives by Date"
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedDate && (
                  <button
                    onClick={() => handleDateChange("")}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    ✕ All News
                  </button>
                )}

                {/* Calendar Date Picker Input */}
                <div className="relative flex items-center">
                  <input
                    type="date"
                    max={todayIST}
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    title="Select date from calendar"
                  />
                </div>
              </div>
            </div>

            {/* Quick Date Chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quick jump:
              </span>

              <button
                onClick={() => handleDateChange("")}
                className={
                  !selectedDate
                    ? "rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                    : "rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                }
              >
                All Time
              </button>

              <button
                onClick={() => handleDateChange(todayIST)}
                className={
                  selectedDate === todayIST
                    ? "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                    : "rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                }
              >
                Today
              </button>

              <button
                onClick={() => handleDateChange(yesterdayIST)}
                className={
                  selectedDate === yesterdayIST
                    ? "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                    : "rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                }
              >
                Yesterday
              </button>

              {/* Recent Available Dates */}
              {availableDates.slice(0, 4).map((d) => {
                if (d.date === todayIST || d.date === yesterdayIST) return null;
                const isSelected = selectedDate === d.date;
                return (
                  <button
                    key={d.date}
                    onClick={() => handleDateChange(d.date)}
                    className={
                      isSelected
                        ? "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                        : "rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                    }
                  >
                    {formatShortDate(d.date)} ({d.count})
                  </button>
                );
              })}
            </div>

            {/* Archive Previous/Next Navigation */}
            {selectedDate && availableDates.length > 0 && (
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs font-semibold text-slate-500">
                {prevAvailableDate ? (
                  <button
                    onClick={() => handleDateChange(prevAvailableDate)}
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    ← Older: {formatDisplayDate(prevAvailableDate)}
                  </button>
                ) : (
                  <span className="text-slate-300">Earliest available archive date</span>
                )}

                {nextAvailableDate ? (
                  <button
                    onClick={() => handleDateChange(nextAvailableDate)}
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    Newer: {formatDisplayDate(nextAvailableDate)} →
                  </button>
                ) : (
                  <span className="text-slate-300">Latest available archive date</span>
                )}
              </div>
            )}
          </div>

          {/* SEARCH & FILTERS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  ⌕
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search news, policies, countries, topics..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <button
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Reset All
              </button>
            </div>

            {/* SYLLABUS FILTERS */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {syllabusFilters.map((item) => {
                const active = filter === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => {
                      setFilter(item.value);
                      setPage(1);
                      syncUrl(selectedDate, search, category, item.value);
                    }}
                    className={
                      active
                        ? "whitespace-nowrap rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white"
                        : "whitespace-nowrap rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200"
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* CATEGORIES */}
            {categories.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => {
                    setCategory("ALL");
                    setPage(1);
                    syncUrl(selectedDate, search, "ALL", filter);
                  }}
                  className={
                    category === "ALL"
                      ? "whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                      : "whitespace-nowrap rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  }
                >
                  All categories
                </button>

                {categories.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setCategory(item);
                      setPage(1);
                      syncUrl(selectedDate, search, item, filter);
                    }}
                    className={
                      category === item
                        ? "whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                        : "whitespace-nowrap rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RESULTS */}
          <div className="mt-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black">
                  {selectedDate
                    ? `Current Affairs for ${formatDisplayDate(selectedDate)}`
                    : "Latest analysis"}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {pagination?.total ?? articles.length} stories available
                </p>
              </div>

              {pagination && (
                <span className="text-xs font-semibold text-slate-400">
                  Page {pagination.page} of {pagination.pages}
                </span>
              )}
            </div>

            {/* LOADING */}
            {loading && (
              <div className="grid gap-4 lg:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            )}

            {/* ERROR */}
            {!loading && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
                <p className="font-bold text-red-800">
                  Unable to load current affairs.
                </p>
                <p className="mt-2 text-sm text-red-700">
                  Check your backend deployment and try again.
                </p>
                <button
                  onClick={() => fetchNews(page)}
                  className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white"
                >
                  Try again
                </button>
              </div>
            )}

            {/* EMPTY STATE */}
            {!loading && !error && visibleArticles.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
                  📅
                </div>
                <p className="text-lg font-black text-slate-900">
                  {selectedDate
                    ? `No articles found for ${formatDisplayDate(selectedDate)}`
                    : "No matching articles"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedDate
                    ? "There are no analyzed current affairs stories recorded for this date."
                    : "Try a different search term or filter."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={clearFilters}
                    className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    View All News
                  </button>
                  {availableDates.length > 0 && (
                    <button
                      onClick={() => handleDateChange(availableDates[0].date)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      View Latest Archive ({formatDisplayDate(availableDates[0].date)})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ARTICLES */}
            {!loading &&
              !error &&
              paginatedVisibleArticles.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {paginatedVisibleArticles.map((article) => (
                    <article
                      key={article.id}
                      className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                            {article.category}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            {article.primary_gs_paper}
                          </span>
                        </div>

                        <span
                          className={`shrink-0 text-lg font-black ${relevanceClass(
                            article.upsc_relevance
                          )}`}
                        >
                          {article.upsc_relevance}
                          <span className="text-xs text-slate-300">/10</span>
                        </span>
                      </div>

                      <Link href={`/news/${article.id}`}>
                        <h3 className="mt-5 text-xl font-black leading-snug tracking-tight transition group-hover:text-blue-600">
                          {article.title}
                        </h3>
                      </Link>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${priorityClass(
                            article.priority
                          )}`}
                        >
                          {article.priority} priority
                        </span>
                        {article.prelims_relevance && (
                          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            Prelims
                          </span>
                        )}
                        {article.mains_relevance && (
                          <span className="rounded-md bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                            Mains
                          </span>
                        )}
                      </div>

                      <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-500">
                        {article.summary}
                      </p>

                      <div className="mt-5 border-l-2 border-blue-200 pl-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
                          Why it matters
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                          {article.why_important_for_upsc}
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500">
                            {article.source}
                          </p>
                          {article.published_at && (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {article.published_at}
                            </p>
                          )}
                        </div>

                        <Link
                          href={`/news/${article.id}`}
                          className="rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-600"
                        >
                          UPSC Analysis →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}

            {/* PAGINATION */}
            {!loading &&
              !error &&
              pagination &&
              pagination.pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>

                  <span className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">
                    {page}
                  </span>

                  <button
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-black">UPSC News</p>
            <p className="mt-1 text-xs text-slate-500">
              Current affairs, filtered for the exam.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            AI-assisted analysis • Built for UPSC preparation
          </p>
        </div>
      </footer>
    </main>
  );
}
