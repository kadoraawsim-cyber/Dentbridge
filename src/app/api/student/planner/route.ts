import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import {
  createStudentPlannerEvent,
  getStudentPlannerData,
} from '@/lib/planner/student-planner.service'
import { createSupabaseServerClient } from '@/lib/supabase-server'

async function getAuthorizedStudent() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (user.app_metadata?.role !== 'student') {
    return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, response: undefined as NextResponse | undefined }
}

export async function GET(): Promise<NextResponse> {
  const { user, response } = await getAuthorizedStudent()
  if (response) return response
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await getStudentPlannerData({
    actor: {
      userId: user.id,
      role: user.app_metadata?.role,
    },
  })

  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { user, response } = await getAuthorizedStudent()
  if (response) return response
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = await createStudentPlannerEvent({
    actor: {
      userId: user.id,
      role: user.app_metadata?.role,
    },
    body,
  })

  return NextResponse.json(result.body, { status: result.status })
}
