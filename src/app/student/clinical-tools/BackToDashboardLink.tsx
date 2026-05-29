import { ArrowLeft } from 'lucide-react'

type Props = {
  label: string
}

export function BackToDashboardLink({ label }: Props) {
  return (
    <a
      href="/student/dashboard"
      className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-800"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </a>
  )
}
