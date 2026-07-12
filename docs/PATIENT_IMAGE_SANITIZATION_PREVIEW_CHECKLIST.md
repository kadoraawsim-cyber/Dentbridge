# Patient Image Sanitization Preview Checklist

Status: required before enabling or widening Production patient uploads.

Run this checklist only against Vercel Preview and Preview Supabase. Do not use
Production data, Production buckets, or Production environment variables.

## Required Environment Values

- `PATIENT_UPLOAD_POLICY=sanitized_images`
- `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED=true`
- Preview `APP_URL` / `NEXT_PUBLIC_SITE_URL`
- Preview Supabase URL, anon key, and service-role key
- `FILE_TICKET_SECRET`
- `CRON_SECRET`
- `RATE_LIMIT_HMAC_SECRET`

## Required Fixtures

- Real iPhone HEIC
- Android JPEG
- PNG screenshot
- WebP
- AVIF
- High-megapixel camera image
- Malformed image
- Renamed executable
- Decompression-bomb-style fixture
- EXIF/GPS image
- Dental X-ray JPEG
- Dental X-ray PNG
- PDF X-ray rejection
- DICOM rejection

## Expected Results

- JPEG and PNG must pass end to end.
- The patient preview must show only after the server-created JPEG derivative loads.
- Faculty preview must show the same derivative via a short-lived signed URL.
- `patient_files.status` and `security_state` must be `sanitized_unscanned`.
- `scan_state` must not be `clean`.
- `derivative_object_path` must be populated.
- `original_object_path` must be null after successful deletion, or
  `source_state=cleanup_eligible` if deletion failed.
- Signed URLs must never use `original_object_path` or `object_path` for new
  scannerless files.
- EXIF/GPS, comments, thumbnails, and unnecessary profiles must be absent from
  the derivative.
- Unsupported PDF, SVG, TIFF, BMP, GIF, DICOM, archives, malformed images, and
  renamed executables must fail with localized actionable guidance.
- Cleanup must delete abandoned originals and unlinked derivatives while linked
  derivatives remain available.

## Format Gate

Production may advertise only formats that pass this checklist in the deployed
Vercel Preview runtime. At this implementation point:

- Enabled target: JPEG/JPG and PNG.
- Disabled pending Preview proof: WebP, HEIC/HEIF, AVIF.
- Separate future workflow: PDF X-rays, DICOM, TIFF, BMP, GIF, SVG, archives.

The final Preview report must record the exact fixture file name, browser/device,
Preview deployment URL, Supabase project, pass/fail result, derivative metadata,
and any rejected error code for each fixture.
