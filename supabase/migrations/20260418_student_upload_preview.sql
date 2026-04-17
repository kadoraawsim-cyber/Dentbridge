-- Narrow student read access for private patient uploads.
-- This does not make the bucket public; it only allows authenticated students
-- to generate signed URLs for attachments attached to cases they are already
-- allowed to see in the current workflow.

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_can_read_patient_uploads" ON storage.objects;
CREATE POLICY "student_can_read_patient_uploads"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-uploads'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND EXISTS (
      SELECT 1
      FROM patient_requests pr
      WHERE pr.attachment_path = name
        AND (
          pr.status = 'matched'
          OR EXISTS (
            SELECT 1
            FROM student_case_requests scr
            WHERE scr.case_id = pr.id
              AND scr.student_id = auth.uid()
              AND scr.status = 'approved'
          )
        )
    )
  );
