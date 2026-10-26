import type {
  DocumentType,
  LocalizedText,
  ServiceDetail,
  Uuid,
  VerificationDocument,
} from '@/shared/api/types';

/** One document the provider must (or may) upload. */
export interface RequiredDocument {
  type: DocumentType;
  isMandatory: boolean;
  /** Services that ask for this document. Empty for id_proof. */
  serviceIds: Uuid[];
  notes: LocalizedText[];
}

/** Optional extras the provider can add on top of the required list. */
export const OPTIONAL_EXTRA_DOCUMENTS: DocumentType[] = ['qualification_certificate', 'training_certificate'];

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

/** Union of requiredDocuments across the services, plus id_proof (always mandatory). */
export function requiredDocuments(services: ServiceDetail[]): RequiredDocument[] {
  const byType = new Map<DocumentType, RequiredDocument>();
  byType.set('id_proof', { type: 'id_proof', isMandatory: true, serviceIds: [], notes: [] });
  for (const service of services) {
    for (const requirement of service.requiredDocuments) {
      const existing = byType.get(requirement.documentType);
      const entry: RequiredDocument = existing ?? {
        type: requirement.documentType,
        isMandatory: false,
        serviceIds: [],
        notes: [],
      };
      entry.isMandatory = entry.isMandatory || requirement.isMandatory;
      if (requirement.documentType !== 'id_proof' && !entry.serviceIds.includes(service.id)) {
        entry.serviceIds.push(service.id);
      }
      if (requirement.note) {
        entry.notes.push(requirement.note);
      }
      byType.set(requirement.documentType, entry);
    }
  }
  return [...byType.values()].sort((a, b) => Number(b.isMandatory) - Number(a.isMandatory));
}

/** Newest document of a type (by upload time). */
export function latestDocument(documents: VerificationDocument[], type: DocumentType): VerificationDocument | null {
  const ofType = documents.filter((document) => document.type === type);
  ofType.sort((a, b) => (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? ''));
  return ofType[0] ?? null;
}

/** An uploaded document that still counts (not rejected / waiting for a re-upload). */
export function isDocumentSatisfied(document: VerificationDocument | null): boolean {
  return Boolean(document?.uploadedAt) && document?.status !== 'rejected' && document?.status !== 'info_required';
}

/** Mandatory types without a satisfying upload. */
export function missingMandatoryDocuments(required: RequiredDocument[], documents: VerificationDocument[]): DocumentType[] {
  return required
    .filter((item) => item.isMandatory && !isDocumentSatisfied(latestDocument(documents, item.type)))
    .map((item) => item.type);
}

/** Remove is allowed only while the server still accepts it. */
export function canRemoveDocument(document: VerificationDocument): boolean {
  return document.status === 'pending' || document.status === 'rejected';
}

/** Best-effort MIME type from the picker's value or the file name. */
export function resolveMimeType(mimeType: string | null | undefined, fileName: string | null | undefined): string | null {
  if (mimeType) {
    return mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
  }
  const extension = fileName?.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'pdf') return 'application/pdf';
  return null;
}

export function isAllowedMimeType(mimeType: string | null): mimeType is AllowedDocumentMimeType {
  return mimeType !== null && (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}
