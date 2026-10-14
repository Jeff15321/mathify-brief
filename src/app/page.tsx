import { QuestionIntakeForm } from "@/components/intake/QuestionIntakeForm";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-slate-50 p-8 pt-16 font-sans">
      <div className="flex w-full max-w-2xl flex-col items-start gap-2">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          Grade 9
        </span>
        <h1 className="text-3xl font-semibold text-slate-900">
          Get ready for your tutoring session
        </h1>
      </div>
      <QuestionIntakeForm />
    </div>
  );
}
