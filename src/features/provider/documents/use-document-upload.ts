import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/shared/api/endpoints';
import { uploadToSignedUrl } from '@/shared/api/client';
import type { DocumentType, Uuid, VerificationDocument } from '@/shared/api/types';
import { providerKeys } from '../model/queries';
import { type DocumentSource, type PickFailure, pickDocument } from './pick-document';

export type UploadStage = 'idle' | 'picking' | 'preparing' | 'uploading' | 'verifying';

export interface UploadInput {
  type: DocumentType;
  source: DocumentSource;
  serviceId?: Uuid;
  /** id_proof only: the last four digits, never the full number. */
  idNumberLast4?: string;
}

export interface DocumentUpload {
  stage: UploadStage;
  /** A device-side problem (`provider:documents.errors.<reason>`). */
  pickFailure: PickFailure | null;
  /** An API error, rendered with errorMessageKey. */
  error: unknown;
  start: (input: UploadInput) => Promise<VerificationDocument | null>;
  reset: () => void;
}

type UploadOutcome =
  | { kind: 'done'; document: VerificationDocument }
  | { kind: 'pick'; reason: PickFailure }
  | { kind: 'error'; error: unknown };

async function runUpload(input: UploadInput, onStage: (stage: UploadStage) => void): Promise<UploadOutcome> {
  try {
    onStage('picking');
    const picked = await pickDocument(input.source);
    if (!picked.ok) {
      return { kind: 'pick', reason: picked.reason };
    }
    onStage('preparing');
    const upload = await api.provider.documentUploadUrl({
      type: input.type,
      mimeType: picked.file.mimeType,
      sizeBytes: picked.file.sizeBytes,
      fileName: picked.file.fileName,
      serviceId: input.serviceId,
    });
    onStage('uploading');
    await uploadToSignedUrl(upload.uploadUrl, picked.file.uri, upload.headers);
    onStage('verifying');
    const document = await api.provider.finaliseDocument(upload.documentId, { idNumberLast4: input.idNumberLast4 });
    return { kind: 'done', document };
  } catch (error) {
    return { kind: 'error', error };
  }
}

/** pick → upload URL → PUT to storage → finalise; refreshes `documents` and `application`. */
export function useDocumentUpload(): DocumentUpload {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<UploadStage>('idle');
  const [pickFailure, setPickFailure] = useState<PickFailure | null>(null);
  const [error, setError] = useState<unknown>(null);

  const reset = (): void => {
    setStage('idle');
    setPickFailure(null);
    setError(null);
  };

  const start = async (input: UploadInput): Promise<VerificationDocument | null> => {
    reset();
    const outcome = await runUpload(input, setStage);
    setStage('idle');
    void queryClient.invalidateQueries({ queryKey: providerKeys.documents });
    if (outcome.kind === 'done') {
      void queryClient.invalidateQueries({ queryKey: providerKeys.application });
      return outcome.document;
    }
    if (outcome.kind === 'pick') {
      setPickFailure(outcome.reason === 'cancelled' ? null : outcome.reason);
    } else {
      setError(outcome.error);
    }
    return null;
  };

  return { stage, pickFailure, error, start, reset };
}
