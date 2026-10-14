import { QuestionIntakeForm } from "@/components/intake/QuestionIntakeForm";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-zinc-50 p-8 pt-16 font-sans dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col items-start gap-2">
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          Grade 9
        </span>
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
          Get ready for your tutoring session
        </h1>
      </div>
      <QuestionIntakeForm />
    </div>
  );
}
