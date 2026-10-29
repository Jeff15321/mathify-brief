import { ExampleSlideshow } from "@/components/examples/ExampleSlideshow";
import Link from "next/link";

export const metadata = {
  title: "Example Questions — Mathify Tutor Brief",
  description: "See how the system breaks down math questions, generates diagnostic probes, and produces tutor briefs.",
};

/**
 * Standalone page showcasing example questions with their full
 * breakdown → probe → brief pipeline.
 */
export default function ExamplesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Example Questions</h1>
        <p className="mt-1 text-sm text-slate-500">
          See how the system breaks down real Ontario curriculum math questions,
          generates diagnostic probes, and produces tutor briefs — step by step.
        </p>
      </div>

      <ExampleSlideshow />
    </div>
  );
}
