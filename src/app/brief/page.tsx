import { redirect } from 'next/navigation';

/** The report now stays on the workspace page. */
export default function BriefPage() {
  redirect('/workspace');
}
