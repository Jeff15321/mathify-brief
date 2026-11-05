export function BriefHeader({ studentGrade, topic }: { studentGrade: number; topic: string }) {
  return (
    <header className="space-y-2">
      <p className="text-sm text-slate-500">Tutor brief · Student grade {studentGrade}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{topic}</h1>
    </header>
  );
}
