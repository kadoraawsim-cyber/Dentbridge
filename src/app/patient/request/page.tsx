'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { HARD_MAX_UPLOAD_BYTES } from '@/lib/files/file.constants'
import { runPatientSubmission } from '@/lib/patient-request/submission-flow'
import type { PreparedPatientAttachment } from '@/lib/patient-request/submission-flow'
import {
  PatientRequestFooter,
  PatientRequestHeader,
  PatientRequestHero,
  PatientRequestSuccess,
} from '@/components/patient/request/PatientRequestLayout'
import {
  ClinicalDetailsSection,
  ConsentSection,
  PatientInfoSection,
  PatientRequestError,
  PatientRequestFormActions,
  PatientRequestProgressRail,
  SupportSection,
} from '@/components/patient/request/PatientRequestFormSections'

function normalizePhoneNumber(value: string) {
  return value.replace(/[\s().-]/g, '')
}

// Must match the trimmed-length rule in src/app/api/v1/patient/requests/route.ts (validatePayload).
const MAIN_COMPLAINT_MIN_LENGTH = 5
const MAIN_COMPLAINT_MAX_LENGTH = 5000

const HEIC_EXTENSIONS = new Set(['heic', 'heif'])
const UNSUPPORTED_CLINICAL_EXTENSIONS = new Set([
  'pdf',
  'svg',
  'dcm',
  'dicom',
  'tif',
  'tiff',
  'bmp',
  'gif',
  'zip',
  'rar',
  '7z',
])

// Public UI mirror only; the server-side PATIENT_UPLOAD_POLICY is authoritative.
const PATIENT_UPLOADS_ENABLED = process.env.NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED === 'true'

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function getJpegOrPngDeclaration(file: File): { mime: 'image/jpeg' | 'image/png'; extension: 'jpg' | 'png' } | null {
  const extension = getFileExtension(file.name)
  if (
    file.type === 'image/jpeg' ||
    file.type === 'image/jpg' ||
    file.type === 'image/pjpeg' ||
    extension === 'jpg' ||
    extension === 'jpeg'
  ) {
    return { mime: 'image/jpeg', extension: 'jpg' }
  }
  if (file.type === 'image/png' || extension === 'png') {
    return { mime: 'image/png', extension: 'png' }
  }
  return null
}

function ensureDeclaredImageFile(file: File, declaration: { mime: string; extension: string }): File {
  const extension = getFileExtension(file.name)
  const extensionMatches =
    declaration.extension === 'jpg'
      ? extension === 'jpg' || extension === 'jpeg'
      : extension === declaration.extension
  if (file.type === declaration.mime && extensionMatches) {
    return file
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || 'patient-image'
  return new File([file], `${baseName}.${declaration.extension}`, {
    type: declaration.mime,
    lastModified: file.lastModified,
  })
}

function isHeicCandidate(file: File): boolean {
  const extension = getFileExtension(file.name)
  return file.type === 'image/heic' || file.type === 'image/heif' || HEIC_EXTENSIONS.has(extension)
}

function isUnsupportedClinicalFile(file: File): boolean {
  const extension = getFileExtension(file.name)
  return (
    UNSUPPORTED_CLINICAL_EXTENSIONS.has(extension) ||
    file.type === 'application/pdf' ||
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif' ||
    file.type === 'image/tiff' ||
    file.type === 'image/bmp' ||
    file.type === 'application/dicom' ||
    file.type === 'application/zip'
  )
}

async function imageLoads(src: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('preview_failed'))
    image.src = src
  })
}

async function browserNormalizeHeicToJpeg(file: File): Promise<File> {
  const bitmap = await window.createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('canvas_unavailable')
    }
    context.drawImage(bitmap, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })
    if (!blob || blob.size <= 0) {
      throw new Error('canvas_conversion_failed')
    }
    return new File([blob], 'patient-image.jpg', { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}

async function normalizeForUpload(file: File): Promise<File> {
  const declaration = getJpegOrPngDeclaration(file)
  if (declaration) {
    return ensureDeclaredImageFile(file, declaration)
  }
  if (isHeicCandidate(file)) {
    try {
      return await browserNormalizeHeicToJpeg(file)
    } catch {
      throw new Error('image_unreadable')
    }
  }
  throw new Error(isUnsupportedClinicalFile(file) ? 'unsupported_format' : 'unsupported_format')
}

interface ConfirmedUploadResponse {
  success: true
  fileId: string
  status: string
  previewUrl?: string
  previewExpiresAt?: string
  mimeType?: string
}

interface PreparedUploadResponse {
  success: true
  fileId: string
  uploadUrl: string
  ticket: string
}

function isPreparedUploadResponse(value: unknown): value is PreparedUploadResponse {
  const prepared = value as Partial<PreparedUploadResponse>
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    prepared.success === true &&
    typeof prepared.fileId === 'string' &&
    typeof prepared.uploadUrl === 'string' &&
    typeof prepared.ticket === 'string'
  )
}

async function uploadToSignedUploadUrl(uploadUrl: string, file: File): Promise<void> {
  const formData = new FormData()
  formData.append('cacheControl', '3600')
  formData.append('', file)
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-upsert': 'false' },
    body: formData,
  })
  if (!response.ok) {
    throw new Error('upload_failed')
  }
}

function isConfirmedUploadResponse(value: unknown): value is ConfirmedUploadResponse {
  const confirmed = value as Partial<ConfirmedUploadResponse>
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    confirmed.success === true &&
    typeof confirmed.fileId === 'string' &&
    typeof confirmed.status === 'string'
  )
}

async function parseErrorCode(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { code?: unknown }
    return typeof body.code === 'string' ? body.code : null
  } catch {
    return null
  }
}

export default function PatientRequestPage() {
  const { t, locale } = useI18n()
  const validationText =
    locale === 'tr'
      ? {
          fullNameRequired: 'Lutfen ad ve soyadinizi girin.',
          fullNameInvalid: 'Lutfen en az iki kelimeden olusan gecerli bir ad soyad girin.',
          ageRequired: 'Lutfen yasinizi girin.',
          ageInvalid: 'Lutfen 1 ile 120 arasinda gecerli bir yas girin.',
          phoneRequired: 'Lutfen telefon numaranizi girin.',
          phoneInvalid: 'Lutfen gecerli bir telefon numarasi girin.',
        }
      : {
          fullNameRequired: 'Please enter your full name.',
          fullNameInvalid: 'Please enter a valid full name with at least two words.',
          ageRequired: 'Please enter your age.',
          ageInvalid: 'Please enter a valid age between 1 and 120.',
          phoneRequired: 'Please enter your phone number.',
          phoneInvalid: 'Please enter a valid phone number.',
        }

  const [fullName, setFullName] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+90')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('')
  const [preferredUniversity, setPreferredUniversity] = useState('')

  const [treatmentType, setTreatmentType] = useState('')
  const [complaintText, setComplaintText] = useState('')
  const [complaintError, setComplaintError] = useState('')
  const [preferredDays, setPreferredDays] = useState('')
  const [painScore, setPainScore] = useState('')
  const [symptomDuration, setSymptomDuration] = useState('')
  const [contactMethod, setContactMethod] = useState('')
  const [bestContactTime, setBestContactTime] = useState('')
  const [medicalCondition, setMedicalCondition] = useState('')
  const [medicalConditionDetails, setMedicalConditionDetails] = useState('')
  const [hasTouchedMedicalCondition, setHasTouchedMedicalCondition] = useState(false)
  const [kvkkAcknowledgement, setKvkkAcknowledgement] = useState(false)
  const [explicitConsent, setExplicitConsent] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentStatus, setAttachmentStatus] = useState<'idle' | 'preparing' | 'ready' | 'failed'>('idle')
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null)
  const [attachmentErrorMessage, setAttachmentErrorMessage] = useState('')
  const [preparedAttachment, setPreparedAttachment] = useState<PreparedPatientAttachment | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const stepSectionRefs = useRef<Array<HTMLElement | null>>([])
  const complaintTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const submissionGuard = useRef(false)
  const submissionId = useRef('')
  const attachmentRunId = useRef(0)

  const requiredFieldChecks = useMemo(
    () => [
      Boolean(fullName.trim()),
      Boolean(phone.trim()),
      Boolean(preferredUniversity),
      Boolean(age),
      Boolean(gender),
      Boolean(treatmentType),
      Boolean(complaintText.trim()),
      Boolean(painScore),
      Boolean(symptomDuration),
      hasTouchedMedicalCondition && Boolean(medicalCondition),
      medicalCondition !== '' && (medicalCondition !== 'Other' || Boolean(medicalConditionDetails.trim())),
      kvkkAcknowledgement,
      explicitConsent,
    ],
    [
      age,
      complaintText,
      explicitConsent,
      fullName,
      gender,
      hasTouchedMedicalCondition,
      kvkkAcknowledgement,
      medicalCondition,
      medicalConditionDetails,
      painScore,
      phone,
      preferredUniversity,
      symptomDuration,
      treatmentType,
    ]
  )
  const completedRequiredFields = requiredFieldChecks.filter(Boolean).length
  const progressPercent = Math.round(
    (completedRequiredFields / requiredFieldChecks.length) * 100
  )
  function resetPatientRequestForm() {
    setSubmittedId(null)
    setErrorMessage('')
    setFullName('')
    setPhoneCountryCode('+90')
    setPhone('')
    setAge('')
    setGender('')
    setPreferredLanguage('')
    setPreferredUniversity('')
    setPainScore('')
    setSymptomDuration('')
    setContactMethod('')
    setBestContactTime('')
    setMedicalCondition('')
    setMedicalConditionDetails('')
    setHasTouchedMedicalCondition(false)
    setTreatmentType('')
    setComplaintText('')
    setComplaintError('')
    setPreferredDays('')
    setKvkkAcknowledgement(false)
    setExplicitConsent(false)
    setAttachment(null)
    setAttachmentStatus('idle')
    setAttachmentPreviewUrl(null)
    setAttachmentErrorMessage('')
    setPreparedAttachment(null)
  }

  function getUploadErrorMessage(code: string | null): string {
    if (code === 'image_too_large') return t('request.errorImageTooLarge')
    if (code === 'image_unreadable') return t('request.errorImageUnreadable')
    if (code === 'unsupported_image') return t('request.errorUnsupportedImageType')
    if (code === 'rate_limited') return t('request.errorTooManyAttempts')
    if (code === 'service_unavailable') return t('request.errorServiceUnavailable')
    return t('request.errorImageProcessing')
  }

  // Upload tickets are opaque "<expiryEpochSeconds>.<signature>" values (see
  // src/lib/files/ticket.ts). The expiry prefix is the only part the client
  // may read; it lets us tell an expired attachment apart from other
  // validation failures, since the API reports both as 'invalid_request'.
  function isExpiredUploadTicket(ticket: string): boolean {
    const separatorIndex = ticket.indexOf('.')
    if (separatorIndex <= 0) return false
    const expirySeconds = Number(ticket.slice(0, separatorIndex))
    return (
      Number.isInteger(expirySeconds) &&
      expirySeconds > 0 &&
      expirySeconds * 1000 <= Date.now()
    )
  }

  function getSubmissionErrorMessage(errorCode: string | null): string {
    if (errorCode === 'rate_limited') return t('request.errorRateLimited')
    if (errorCode === 'service_unavailable') return t('request.errorServiceUnavailable')
    if (errorCode === 'conflict') return t('request.errorConflict')
    if (errorCode === 'unsupported_image') return t('request.errorUnsupportedImageType')
    if (errorCode === 'image_too_large') return t('request.errorImageTooLarge')
    if (errorCode === 'image_unreadable') return t('request.errorImageUnreadable')
    if (errorCode === 'image_processing_failed') return t('request.errorImageProcessing')
    if (errorCode === 'invalid_request') {
      if (preparedAttachment && isExpiredUploadTicket(preparedAttachment.fileTicket)) {
        return t('request.errorAttachmentExpired')
      }
      return t('request.errorInvalidRequest')
    }
    return t('request.errorGeneric')
  }

  async function handleAttachmentChange(file: File | null) {
    const runId = attachmentRunId.current + 1
    attachmentRunId.current = runId
    setAttachment(file)
    setPreparedAttachment(null)
    setAttachmentPreviewUrl(null)
    setAttachmentErrorMessage('')

    if (!file) {
      setAttachmentStatus('idle')
      return
    }

    if (!PATIENT_UPLOADS_ENABLED) {
      setAttachmentStatus('idle')
      return
    }

    if (file.size > HARD_MAX_UPLOAD_BYTES) {
      setAttachmentStatus('failed')
      setAttachmentErrorMessage(t('request.errorImageTooLarge'))
      return
    }

    setAttachmentStatus('preparing')

    try {
      const uploadFile = await normalizeForUpload(file)
      if (attachmentRunId.current !== runId) return

      if (uploadFile.size > HARD_MAX_UPLOAD_BYTES) {
        throw new Error('image_too_large')
      }

      const prepareResponse = await fetch('/api/v1/files/prepare-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadFile.name,
          mimeType: uploadFile.type,
          sizeBytes: uploadFile.size,
          locale,
        }),
      })
      if (!prepareResponse.ok) {
        throw new Error((await parseErrorCode(prepareResponse)) ?? 'prepare_failed')
      }

      const preparedValue = await prepareResponse.json()
      if (!isPreparedUploadResponse(preparedValue)) {
        throw new Error('prepare_failed')
      }

      await uploadToSignedUploadUrl(preparedValue.uploadUrl, uploadFile)

      const confirmResponse = await fetch(`/api/v1/files/${preparedValue.fileId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket: preparedValue.ticket,
          locale,
        }),
      })
      if (!confirmResponse.ok) {
        throw new Error((await parseErrorCode(confirmResponse)) ?? 'confirm_failed')
      }

      const confirmedValue = await confirmResponse.json()
      if (!isConfirmedUploadResponse(confirmedValue) || !confirmedValue.previewUrl) {
        throw new Error('preview_failed')
      }

      await imageLoads(confirmedValue.previewUrl)
      if (attachmentRunId.current !== runId) return

      setPreparedAttachment({
        fileId: preparedValue.fileId,
        fileTicket: preparedValue.ticket,
      })
      setAttachmentPreviewUrl(confirmedValue.previewUrl)
      setAttachmentStatus('ready')
    } catch (error) {
      if (attachmentRunId.current !== runId) return
      const code = error instanceof Error ? error.message : null
      setPreparedAttachment(null)
      setAttachmentPreviewUrl(null)
      setAttachmentStatus('failed')
      setAttachmentErrorMessage(
        code === 'image_too_large'
          ? t('request.errorImageTooLarge')
          : code === 'unsupported_format'
            ? t('request.errorUnsupportedClinicalFile')
            : code === 'image_unreadable'
              ? t('request.errorImageUnreadable')
              : getUploadErrorMessage(code)
      )
    }
  }

  function isMainComplaintValid(value: string): boolean {
    const trimmed = value.trim()
    return (
      trimmed.length >= MAIN_COMPLAINT_MIN_LENGTH && trimmed.length <= MAIN_COMPLAINT_MAX_LENGTH
    )
  }

  function handleComplaintTextChange(value: string) {
    setComplaintText(value)
    if (complaintError && isMainComplaintValid(value)) {
      setComplaintError('')
    }
  }

  function focusComplaintField() {
    const node = complaintTextareaRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    node.focus({ preventScroll: true })
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submissionGuard.current) {
      return
    }
    setSubmittedId(null)
    setErrorMessage('')
    setComplaintError('')

    const trimmedFullName = fullName.trim()
    const fullNameWords = trimmedFullName.split(/\s+/).filter(Boolean)
    const hasLettersInEveryWord = fullNameWords.every((word) => /[\p{L}]/u.test(word))
    const hasOnlyAllowedNameCharacters =
      trimmedFullName.replace(/[\p{L}\s'.-]/gu, '') === ''
    const normalizedPhone = normalizePhoneNumber(phone.trim()).replace(/^\+/, '')
    const parsedAge = Number(age)

    if (!trimmedFullName) {
      setErrorMessage(validationText.fullNameRequired)
      return
    }

    if (
      fullNameWords.length < 2 ||
      !hasLettersInEveryWord ||
      !hasOnlyAllowedNameCharacters
    ) {
      setErrorMessage(validationText.fullNameInvalid)
      return
    }

    if (!age.trim()) {
      setErrorMessage(validationText.ageRequired)
      return
    }

    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setErrorMessage(validationText.ageInvalid)
      return
    }

    if (!phone.trim()) {
      setErrorMessage(validationText.phoneRequired)
      return
    }

    if (!preferredUniversity) {
      setErrorMessage(t('request.preferredUniversityRequired'))
      return
    }

    if (
      !/^\+\d+$/.test(phoneCountryCode) ||
      !/^\d+$/.test(normalizedPhone) ||
      normalizedPhone.length < 6 ||
      normalizedPhone.length > 15
    ) {
      setErrorMessage(validationText.phoneInvalid)
      return
    }

    if (!isMainComplaintValid(complaintText)) {
      setComplaintError(t('request.mainComplaintError'))
      setErrorMessage(t('request.errorMainComplaintSummary'))
      focusComplaintField()
      return
    }

    if (
      !fullName ||
      !phone ||
      !preferredUniversity ||
      !age ||
      !gender ||
      !treatmentType ||
      !painScore ||
      !symptomDuration ||
      !medicalCondition ||
      (medicalCondition === 'Other' && !medicalConditionDetails.trim())
    ) {
      setErrorMessage(t('request.errorRequiredFields'))
      return
    }

    if (!kvkkAcknowledgement || !explicitConsent) {
      setErrorMessage(t('request.errorConsent'))
      return
    }

    const effectiveAttachment = PATIENT_UPLOADS_ENABLED ? attachment : null

    if (effectiveAttachment && attachmentStatus !== 'ready') {
      setErrorMessage(attachmentErrorMessage || t('request.uploadPreparing'))
      return
    }

    if (!submissionId.current) {
      submissionId.current = window.crypto.randomUUID()
    }

    await runPatientSubmission({
      attachment: effectiveAttachment,
      dependencies: {
        fetcher: (input, init) => fetch(input, init),
        upload: async ({ attachment: file, uploadUrl }) => {
          try {
            await uploadToSignedUploadUrl(uploadUrl, file as File)
            return { error: null }
          } catch (error) {
            return { error }
          }
        },
      },
      guard: submissionGuard,
      locale,
      onFailure: (errorCode, field) => {
        if (field === 'complaintText') {
          setComplaintError(t('request.mainComplaintError'))
          setErrorMessage(t('request.errorMainComplaintSummary'))
          focusComplaintField()
          return
        }
        setErrorMessage(getSubmissionErrorMessage(errorCode))
      },
      onSubmitting: setIsSubmitting,
      onSuccess: () => {
        resetPatientRequestForm()
        submissionId.current = ''
        setSubmittedId('submitted')
      },
      preparedAttachment,
      requestPayload: {
        submissionId: submissionId.current,
        fullName: trimmedFullName,
        age,
        gender,
        phoneCountryCode,
        phone,
        preferredLanguage,
        preferredUniversity,
        treatmentType,
        complaintText,
        preferredDays,
        painScore,
        symptomDuration,
        contactMethod,
        bestContactTime,
        medicalCondition,
        medicalConditionDetails,
        kvkkAcknowledgement,
        explicitConsent,
      },
    })
  }

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900">
      <PatientRequestHeader onNewRequest={resetPatientRequestForm} />

      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <PatientRequestHero />

        {submittedId && (
          <PatientRequestSuccess onSubmitAnother={() => setSubmittedId(null)} />
        )}

        {!submittedId && (
          <form
            onSubmit={handleSubmit}
            className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <PatientRequestProgressRail progressPercent={progressPercent} />

            <div className="space-y-6 py-4 pl-12 pr-4 sm:space-y-8 sm:px-8 sm:py-8 sm:pl-16">
              <PatientInfoSection
                sectionRef={(node) => {
                  stepSectionRefs.current[0] = node
                }}
                fullName={fullName}
                phoneCountryCode={phoneCountryCode}
                phone={phone}
                preferredUniversity={preferredUniversity}
                age={age}
                gender={gender}
                onFullNameChange={setFullName}
                onPhoneCountryCodeChange={setPhoneCountryCode}
                onPhoneChange={setPhone}
                onPreferredUniversityChange={setPreferredUniversity}
                onAgeChange={setAge}
                onGenderChange={setGender}
              />

              <ClinicalDetailsSection
                sectionRef={(node) => {
                  stepSectionRefs.current[1] = node
                }}
                treatmentType={treatmentType}
                complaintText={complaintText}
                complaintError={complaintError}
                complaintTextRef={(node) => {
                  complaintTextareaRef.current = node
                }}
                painScore={painScore}
                symptomDuration={symptomDuration}
                medicalCondition={medicalCondition}
                medicalConditionDetails={medicalConditionDetails}
                onTreatmentTypeChange={setTreatmentType}
                onComplaintTextChange={handleComplaintTextChange}
                onPainScoreChange={setPainScore}
                onSymptomDurationChange={setSymptomDuration}
                onMedicalConditionChange={(value) => {
                  setHasTouchedMedicalCondition(true)
                  setMedicalCondition(value)

                  if (value !== 'Other') {
                    setMedicalConditionDetails('')
                  }
                }}
                onMedicalConditionDetailsChange={setMedicalConditionDetails}
              />

              <SupportSection
                sectionRef={(node) => {
                  stepSectionRefs.current[2] = node
                }}
                attachment={attachment}
                attachmentEnabled={PATIENT_UPLOADS_ENABLED}
                contactMethod={contactMethod}
                preferredLanguage={preferredLanguage}
                bestContactTime={bestContactTime}
                preferredDays={preferredDays}
                attachmentStatus={attachmentStatus}
                attachmentPreviewUrl={attachmentPreviewUrl}
                attachmentErrorMessage={attachmentErrorMessage}
                onAttachmentChange={handleAttachmentChange}
                onAttachmentRemove={() => void handleAttachmentChange(null)}
                onAttachmentRetry={() => {
                  if (attachment) void handleAttachmentChange(attachment)
                }}
                onContactMethodChange={setContactMethod}
                onPreferredLanguageChange={setPreferredLanguage}
                onBestContactTimeChange={setBestContactTime}
                onPreferredDaysChange={setPreferredDays}
              />

              <ConsentSection
                sectionRef={(node) => {
                  stepSectionRefs.current[3] = node
                }}
                kvkkAcknowledgement={kvkkAcknowledgement}
                explicitConsent={explicitConsent}
                onKvkkAcknowledgementChange={setKvkkAcknowledgement}
                onExplicitConsentChange={setExplicitConsent}
              />

              <PatientRequestError message={errorMessage} />
            </div>

            <PatientRequestFormActions isSubmitting={isSubmitting} />
          </form>
        )}
      </section>

      <PatientRequestFooter onNewRequest={resetPatientRequestForm} />
    </main>
  )
}
