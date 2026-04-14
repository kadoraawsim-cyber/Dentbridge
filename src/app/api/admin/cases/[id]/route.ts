import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type Action = 'save_draft' | 'approve' | 'reject'

interface RequestBody {
  action: Action
  assigned_department?: string
  urgency?: string
  target_student_level?: string
  clinical_notes?: string
}

/**
 * PATCH /api/admin/cases/[id]
 *
 * Server-side handler for all three admin write actions:
 *   save_draft  → sets status = 'under_review'
 *   approve     → sets status = 'matched'
 *   reject      → sets status = 'rejected'
 *
 * Security guarantees:
 *   1. Session is verified server-side via getUser() (live JWT validation).
 *   2. Only users with app_metadata.role = 'admin' can proceed.
 *   3. reviewed_by is always sourced from the verified server-side session —
 *      the client never sends it and cannot influence it.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // ── 1. Verify session ────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { action, assigned_department, urgency, target_student_level, clinical_notes } = body

  if (!['save_draft', 'approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // ── 3. Build update payload ──────────────────────────────────────────────────
  // reviewed_by is taken from the verified session — not from the request body.
  const reviewedAt = new Date().toISOString()
  const reviewedBy = user.email ?? null

  type UpdatePayload = {
    status: string
    reviewed_by: string | null
    reviewed_at: string
    assigned_department?: string
    urgency?: string
    target_student_level?: string
    clinical_notes?: string | null
  }

  let updatePayload: UpdatePayload

  if (action === 'save_draft') {
    updatePayload = {
      assigned_department,
      urgency,
      target_student_level,
      clinical_notes: clinical_notes ?? null,
      status: 'under_review',
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    }
  } else if (action === 'approve') {
    updatePayload = {
      assigned_department,
      urgency,
      target_student_level,
      clinical_notes: clinical_notes ?? null,
      status: 'matched',
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    }
  } else {
    // reject — only status and accountability fields change
    updatePayload = {
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    }
  }

  // ── 4. Execute update ────────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('patient_requests')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: { reviewed_by: reviewedBy, reviewed_at: reviewedAt },
  })
}
