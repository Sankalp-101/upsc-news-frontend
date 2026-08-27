"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://upsc-news-backend.onrender.com";

type MainsAnswerFramework = {
  introduction: string;
  dimensions: string[];
  way_forward: string;
};

type Article = {
  id: number;
  title: string;
  source: string;
  url: string;
  published_at: string | null;

  category: string;
  upsc_relevance: number;
  priority: string;

  primary_gs_paper: string;
  secondary_gs_papers: string[];

  prelims_relevance: boolean;
  mains_relevance: boolean;

  topics: string[];

  summary: string;
  why_important_for_upsc: string;

  source_facts: string[];
  upsc_context: string[];
  possible_questions: string[];
  mains_answer_framework?: MainsAnswerFramework | null;
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

function priorityClass(priority: string) {
  switch (priority.toLowerCase()) {
    case "high":
      return "bg-red-50 text-red-700 ring-red-200";

    case "medium":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function relevanceLabel(score: number) {
  if (score >= 9) return "Critical";
  if (score >= 7) return "High";
  if (score >= 5) return "Moderate";
  return "Low";
}

function difficultyClass(difficulty: MCQ["difficulty"]) {
  if (difficulty === "hard") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (difficulty === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string"
    );
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string =>
            typeof item === "string"
        );
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeArticle(
  raw: Record<string, unknown>
): Article {
  let mainsFramework: MainsAnswerFramework | null = null;
  if (raw.mains_answer_framework && typeof raw.mains_answer_framework === "object") {
    const rawF = raw.mains_answer_framework as Record<string, unknown>;
    const intro = typeof rawF.introduction === "string" ? rawF.introduction.trim() : "";
    const wayForward = typeof rawF.way_forward === "string" ? rawF.way_forward.trim() : "";
    const dims = normalizeArray(rawF.dimensions);
    if (intro || dims.length > 0 || wayForward) {
      mainsFramework = {
        introduction: intro,
        dimensions: dims,
        way_forward: wayForward,
      };
    }
  }

  return {
    id: Number(raw.id),

    title:
      typeof raw.title === "string"
        ? raw.title
        : "",

    source:
      typeof raw.source === "string"
        ? raw.source
        : "Unknown source",

    url:
      typeof raw.url === "string"
        ? raw.url
        : "#",

    published_at:
      typeof raw.published_at === "string"
        ? raw.published_at
        : null,

    category:
      typeof raw.category === "string"
        ? raw.category
        : "Other",

    upsc_relevance:
      typeof raw.upsc_relevance === "number"
        ? raw.upsc_relevance
        : Number(raw.upsc_relevance) || 0,

    priority:
      typeof raw.priority === "string"
        ? raw.priority
        : "NORMAL",

    primary_gs_paper:
      typeof raw.primary_gs_paper === "string"
        ? raw.primary_gs_paper
        : "GS-II",

    secondary_gs_papers:
      normalizeArray(
        raw.secondary_gs_papers
      ),

    prelims_relevance:
      Boolean(raw.prelims_relevance),

    mains_relevance:
      Boolean(raw.mains_relevance),

    topics:
      normalizeArray(raw.topics),

    summary:
      typeof raw.summary === "string"
        ? raw.summary
        : "",

    why_important_for_upsc:
      typeof raw.why_important_for_upsc === "string"
        ? raw.why_important_for_upsc
        : "",

    source_facts:
      normalizeArray(raw.source_facts),

    upsc_context:
      normalizeArray(raw.upsc_context),

    possible_questions:
      normalizeArray(
        raw.possible_questions
      ),

    mains_answer_framework: mainsFramework,
  };
}

export default function NewsArticlePage() {
  const params = useParams();

  const id = params?.id;

  const [article, setArticle] =
    useState<Article | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mcqs, setMcqs] =
    useState<MCQ[]>([]);

  const [mcqsLoading, setMcqsLoading] =
    useState(false);

  const [mcqsError, setMcqsError] =
    useState("");

  const [selectedAnswers, setSelectedAnswers] =
    useState<Record<number, "A" | "B" | "C" | "D">>({});

  useEffect(() => {
    if (!id) return;

    async function loadArticle() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/api/news/${id}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "Article not found."
            );
          }

          throw new Error(
            "Unable to load article."
          );
        }

        const data =
          await response.json();

        setArticle(
          normalizeArticle(data)
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load article."
        );
      } finally {
        setLoading(false);
      }
    }

    async function loadMCQs() {
      try {
        setMcqsLoading(true);
        setMcqsError("");

        const res = await fetch(
          `${API_BASE}/api/news/${id}/mcqs`,
          {
            cache: "no-store",
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.mcqs)) {
            setMcqs(data.mcqs);
          }
        }
      } catch (err) {
        console.error("MCQ fetch error:", err);
        setMcqsError("Unable to load prelims questions at this time.");
      } finally {
        setMcqsLoading(false);
      }
    }

    loadArticle();
    loadMCQs();
  }, [id]);

  function handleSelectOption(mcqId: number, option: "A" | "B" | "C" | "D") {
    setSelectedAnswers((prev) => {
      if (prev[mcqId]) return prev;
      return { ...prev, [mcqId]: option };
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fa]">

        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
            <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-200" />
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">

          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">

            <div className="space-y-5">

              <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />

              <div className="h-16 w-full animate-pulse rounded-xl bg-slate-200" />

              <div className="h-16 w-4/5 animate-pulse rounded-xl bg-slate-200" />

              <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />

              <div className="h-48 animate-pulse rounded-2xl bg-white" />

            </div>

            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />

          </div>

        </div>

      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-5">

        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            !
          </div>

          <h1 className="mt-5 text-xl font-black">
            Unable to open article
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error || "Article not found."}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            ← Back to news
          </Link>

        </div>

      </main>
    );
  }

  const relevance =
    Math.max(
      0,
      Math.min(
        10,
        article.upsc_relevance
      )
    );

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-950">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">

          <Link
            href="/"
            className="flex items-center gap-3"
          >

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

          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            ← All news
          </Link>

        </div>

      </header>


      {/* ================================================= */}
      {/* ARTICLE HEADER */}
      {/* ================================================= */}

      <section className="border-b border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-5 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-12">

          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">

            {/* MAIN HEADER */}

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <span className="rounded-md bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-blue-700">
                  {article.category}
                </span>

                <span className="rounded-md bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white">
                  {article.primary_gs_paper}
                </span>

                <span
                  className={`rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ring-1 ${priorityClass(
                    article.priority
                  )}`}
                >
                  {article.priority}
                </span>

              </div>


              <h1 className="mt-6 max-w-5xl text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                {article.title}
              </h1>


              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">

                <span className="font-bold text-slate-700">
                  {article.source}
                </span>

                {article.published_at && (
                  <span>
                    {article.published_at}
                  </span>
                )}

              </div>


              <div className="mt-7 flex flex-wrap gap-2">

                {article.prelims_relevance && (
                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    ✓ Prelims Relevant
                  </span>
                )}

                {article.mains_relevance && (
                  <span className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">
                    ✓ Mains Relevant
                  </span>
                )}

              </div>

            </div>


            {/* RELEVANCE CARD */}

            <aside className="rounded-2xl bg-slate-950 p-6 text-white shadow-xl">

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                UPSC Relevance
              </p>

              <div className="mt-5 flex items-end gap-2">

                <span className="text-6xl font-black tracking-[-0.06em]">
                  {relevance}
                </span>

                <span className="mb-2 text-sm font-bold text-slate-500">
                  / 10
                </span>

              </div>

              <p className="mt-1 text-sm font-bold text-blue-300">
                {relevanceLabel(relevance)}
                {" "}relevance
              </p>


              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">

                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width: `${relevance * 10}%`,
                  }}
                />

              </div>


              <div className="mt-6 grid grid-cols-2 gap-2">

                <div className="rounded-xl bg-white/5 p-3">

                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Primary
                  </p>

                  <p className="mt-1 font-black">
                    {article.primary_gs_paper}
                  </p>

                </div>

                <div className="rounded-xl bg-white/5 p-3">

                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Priority
                  </p>

                  <p className="mt-1 font-black">
                    {article.priority}
                  </p>

                </div>

              </div>

            </aside>

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* CONTENT */}
      {/* ================================================= */}

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">


          {/* ================================================= */}
          {/* MAIN CONTENT */}
          {/* ================================================= */}

          <article className="space-y-6">


            {/* SUMMARY */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm font-black text-blue-600">
                  01
                </div>

                <h2 className="text-xl font-black tracking-tight">
                  Executive summary
                </h2>

              </div>

              <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
                {article.summary}
              </p>

            </section>


            {/* WHY UPSC */}

            <section className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50">

              <div className="border-b border-blue-100 px-6 py-5 sm:px-8">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">
                    02
                  </div>

                  <div>

                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-600">
                      Exam relevance
                    </p>

                    <h2 className="mt-0.5 text-xl font-black tracking-tight">
                      Why this matters for UPSC
                    </h2>

                  </div>

                </div>

              </div>

              <div className="px-6 py-6 sm:px-8">

                <p className="text-base leading-8 text-blue-950">
                  {article.why_important_for_upsc}
                </p>

              </div>

            </section>


            {/* SOURCE FACTS */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-700">
                  03
                </div>

                <div>

                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    Source grounded
                  </p>

                  <h2 className="mt-0.5 text-xl font-black tracking-tight">
                    Key facts from the article
                  </h2>

                </div>

              </div>


              {article.source_facts.length > 0 ? (

                <ul className="mt-7 space-y-4">

                  {article.source_facts.map(
                    (fact, index) => (

                      <li
                        key={`${fact}-${index}`}
                        className="flex gap-4"
                      >

                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />

                        <p className="text-sm leading-7 text-slate-600 sm:text-base">
                          {fact}
                        </p>

                      </li>

                    )
                  )}

                </ul>

              ) : (

                <p className="mt-6 text-sm text-slate-400">
                  No source facts were provided.
                </p>

              )}

            </section>


            {/* UPSC CONTEXT */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
                  04
                </div>

                <div>

                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    Conceptual layer
                  </p>

                  <h2 className="mt-0.5 text-xl font-black tracking-tight">
                    UPSC context
                  </h2>

                </div>

              </div>


              {article.upsc_context.length > 0 ? (

                <div className="mt-7 grid gap-3 sm:grid-cols-2">

                  {article.upsc_context.map(
                    (context, index) => (

                      <div
                        key={`${context}-${index}`}
                        className="rounded-xl bg-slate-50 p-4"
                      >

                        <p className="text-sm leading-6 text-slate-600">
                          {context}
                        </p>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <p className="mt-6 text-sm text-slate-400">
                  No additional UPSC context was provided.
                </p>

              )}

            </section>


            {/* QUESTIONS & MAINS ANSWER FRAMEWORK */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-sm font-black text-violet-600">
                  05
                </div>

                <div>

                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-violet-500">
                    Answer writing
                  </p>

                  <h2 className="mt-0.5 text-xl font-black tracking-tight">
                    Mains Questions & Answer Framework
                  </h2>

                </div>

              </div>


              {article.possible_questions.length > 0 ? (

                <div className="mt-7 space-y-4">

                  {article.possible_questions.map(
                    (question, index) => (

                      <div
                        key={`${question}-${index}`}
                        className="rounded-xl border border-slate-200 p-5"
                      >

                        <div className="flex gap-4">

                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-xs font-black text-violet-600">
                            Q{index + 1}
                          </span>

                          <p className="text-sm font-semibold leading-7 text-slate-700 sm:text-base">
                            {question}
                          </p>

                        </div>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <p className="mt-6 text-sm text-slate-400">
                  No questions were generated.
                </p>

              )}


              {/* STRUCTURED MAINS ANSWER FRAMEWORK */}

              {article.mains_answer_framework && (

                <div className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/50 p-6 sm:p-7">

                  <div className="flex items-center gap-2.5">

                    <span className="rounded-md bg-violet-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                      Mains Answer Framework
                    </span>

                    <span className="text-xs font-bold text-violet-900">
                      Standard GS Answer Structure
                    </span>

                  </div>


                  {/* INTRODUCTION */}

                  <div className="mt-5">

                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      1. Introduction & Contextual Anchor
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-slate-800 sm:text-base">
                      {article.mains_answer_framework.introduction}
                    </p>

                  </div>


                  {/* KEY DIMENSIONS */}

                  {article.mains_answer_framework.dimensions.length > 0 && (

                    <div className="mt-6 border-t border-violet-100 pt-5">

                      <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        2. Key Analytical Dimensions & Core Body
                      </h3>

                      <ul className="mt-3 space-y-3">

                        {article.mains_answer_framework.dimensions.map(
                          (dim, dIndex) => (

                            <li
                              key={`${dim}-${dIndex}`}
                              className="flex gap-3 rounded-xl bg-white p-3.5 shadow-sm"
                            >

                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-xs font-bold text-violet-700">
                                {dIndex + 1}
                              </span>

                              <p className="text-sm leading-6 text-slate-700">
                                {dim}
                              </p>

                            </li>

                          )
                        )}

                      </ul>

                    </div>

                  )}


                  {/* WAY FORWARD */}

                  <div className="mt-6 border-t border-violet-100 pt-5">

                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      3. Way Forward & Conclusion
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-slate-800 sm:text-base">
                      {article.mains_answer_framework.way_forward}
                    </p>

                  </div>

                </div>

              )}

            </section>


            {/* PRELIMS PRACTICE (MCQs) */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">

              <div className="flex items-center justify-between border-b border-slate-100 pb-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-sm font-black text-emerald-600">
                    06
                  </div>

                  <div>

                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">
                      Prelims Test Series
                    </p>

                    <h2 className="mt-0.5 text-xl font-black tracking-tight">
                      UPSC Prelims Practice
                    </h2>

                  </div>

                </div>

                {mcqs.length > 0 && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    {mcqs.length} MCQs
                  </span>
                )}

              </div>


              {mcqsLoading ? (

                <div className="mt-7 space-y-4">

                  <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
                  <div className="h-24 w-full animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-24 w-full animate-pulse rounded-xl bg-slate-100" />

                </div>

              ) : mcqs.length > 0 ? (

                <div className="mt-7 space-y-8">

                  {mcqs.map((mcq, qIdx) => {
                    const selected = selectedAnswers[mcq.id];
                    const isAnswered = selected !== undefined;
                    const isCorrect = selected === mcq.correct_option;

                    return (
                      <div
                        key={mcq.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6"
                      >

                        <div className="flex flex-wrap items-center justify-between gap-2">

                          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                            Question {qIdx + 1}
                          </span>

                          <div className="flex items-center gap-2">

                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${difficultyClass(
                                mcq.difficulty
                              )}`}
                            >
                              {mcq.difficulty}
                            </span>

                            {mcq.topic && (
                              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                                {mcq.topic}
                              </span>
                            )}

                          </div>

                        </div>


                        <p className="mt-4 text-base font-bold leading-7 text-slate-900">
                          {mcq.question}
                        </p>


                        <div className="mt-5 grid gap-2.5">

                          {(
                            [
                              ["A", mcq.option_a],
                              ["B", mcq.option_b],
                              ["C", mcq.option_c],
                              ["D", mcq.option_d],
                            ] as const
                          ).map(([optKey, optText]) => {
                            let btnStyle =
                              "border-slate-200 bg-white hover:border-slate-300 text-slate-800";

                            if (isAnswered) {
                              if (optKey === mcq.correct_option) {
                                btnStyle =
                                  "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-400";
                              } else if (selected === optKey) {
                                btnStyle =
                                  "border-red-400 bg-red-50 text-red-950 ring-1 ring-red-300";
                              } else {
                                btnStyle =
                                  "border-slate-200 bg-slate-100/60 text-slate-400 opacity-60";
                              }
                            }

                            return (
                              <button
                                key={optKey}
                                type="button"
                                onClick={() => handleSelectOption(mcq.id, optKey)}
                                disabled={isAnswered}
                                className={`flex w-full items-start gap-3.5 rounded-xl border p-3.5 text-left text-sm transition ${btnStyle}`}
                              >

                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-black ${
                                    isAnswered && optKey === mcq.correct_option
                                      ? "bg-emerald-600 text-white"
                                      : isAnswered && selected === optKey
                                      ? "bg-red-600 text-white"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {optKey}
                                </span>

                                <span className="pt-0.5 leading-6">
                                  {optText}
                                </span>

                              </button>
                            );
                          })}

                        </div>


                        {isAnswered && (

                          <div
                            className={`mt-5 rounded-xl border p-4.5 text-sm leading-6 ${
                              isCorrect
                                ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                                : "border-amber-200 bg-amber-50/70 text-amber-950"
                            }`}
                          >

                            <div className="flex items-center gap-2 font-black">

                              <span>
                                {isCorrect
                                  ? "✓ Correct Answer"
                                  : `✕ Incorrect (Correct: Option ${mcq.correct_option})`}
                              </span>

                            </div>

                            <p className="mt-2 text-xs leading-6 opacity-95">
                              <span className="font-bold">Explanation:</span>{" "}
                              {mcq.explanation}
                            </p>

                          </div>

                        )}

                      </div>
                    );
                  })}

                </div>

              ) : (

                <p className="mt-6 text-sm text-slate-400">
                  {mcqsError || "Prelims questions will be available shortly."}
                </p>

              )}

            </section>

          </article>


          {/* ================================================= */}
          {/* SIDEBAR */}
          {/* ================================================= */}

          <aside className="space-y-5">


            {/* TOPIC MAP */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6">

              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Topic map
              </p>

              <h2 className="mt-1 text-lg font-black">
                Syllabus connections
              </h2>


              <div className="mt-5 flex flex-wrap gap-2">

                <span className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">
                  {article.primary_gs_paper}
                </span>

                {article.secondary_gs_papers.map(
                  (paper) => (

                    <span
                      key={paper}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
                    >
                      {paper}
                    </span>

                  )
                )}

              </div>

            </section>


            {/* TOPICS */}

            {article.topics.length > 0 && (

              <section className="rounded-2xl border border-slate-200 bg-white p-6">

                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Topics
                </p>

                <div className="mt-4 space-y-2">

                  {article.topics.map(
                    (topic) => (

                      <div
                        key={topic}
                        className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600"
                      >
                        {topic}
                      </div>

                    )
                  )}

                </div>

              </section>

            )}


            {/* PRELIMS / MAINS */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6">

              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Exam coverage
              </p>

              <div className="mt-5 space-y-3">

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">

                  <span className="text-sm font-bold text-slate-600">
                    Prelims
                  </span>

                  <span
                    className={
                      article.prelims_relevance
                        ? "rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700"
                        : "rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-500"
                    }
                  >
                    {article.prelims_relevance
                      ? "RELEVANT"
                      : "LOW"}
                  </span>

                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">

                  <span className="text-sm font-bold text-slate-600">
                    Mains
                  </span>

                  <span
                    className={
                      article.mains_relevance
                        ? "rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-700"
                        : "rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-500"
                    }
                  >
                    {article.mains_relevance
                      ? "RELEVANT"
                      : "LOW"}
                  </span>

                </div>

              </div>

            </section>


            {/* SOURCE */}

            <section className="rounded-2xl bg-slate-950 p-6 text-white">

              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                Original reporting
              </p>

              <h2 className="mt-2 text-lg font-black">
                Read the source
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Verify the original article and
                read the complete source material.
              </p>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-blue-50"
              >
                Open original article ↗
              </a>

            </section>


            {/* BACK */}

            <Link
              href="/"
              className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              ← Back to all current affairs
            </Link>

          </aside>

        </div>

      </div>


      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <footer className="border-t border-slate-200 bg-slate-950 text-white">

        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">

          <div>

            <p className="font-black">
              UPSC News
            </p>

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
