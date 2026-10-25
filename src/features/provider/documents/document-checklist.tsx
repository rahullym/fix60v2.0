import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  canRemoveDocument,
  latestDocument,
  OPTIONAL_EXTRA_DOCUMENTS,
  type RequiredDocument,
} from '@/entities/application/required-documents';
import { documentStatusTone } from '@/entities/status/status-tone';
import { api } from '@/shared/api/endpoints';
import type { DocumentType, VerificationDocument } from '@/shared/api/types';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { formatDate } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Button, Card, ErrorState, LoadingState, Notice, Pill, Row, SectionHeader, Text, TextField } from '@/shared/ui';
import { providerKeys, useDocuments } from '../model/queries';
import type { DocumentSource } from './pick-document';
import { useDocumentUpload } from './use-document-upload';

const SOURCES: { source: DocumentSource; icon: 'camera-outline' | 'images-outline' | 'document-outline' }[] = [
  { source: 'camera', icon: 'camera-outline' },
  { source: 'gallery', icon: 'images-outline' },
  { source: 'pdf', icon: 'document-outline' },
];

function DocumentCard({
  type,
  isMandatory,
  notes,
  document,
  isEditable,
}: {
  type: DocumentType;
  isMandatory: boolean;
  notes: string[];
  document: VerificationDocument | null;
  isEditable: boolean;
}): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const upload = useDocumentUpload();
  const [isChoosing, setIsChoosing] = useState(false);
  const [last4, setLast4] = useState(document?.idNumberLast4 ?? '');
  const [last4Error, setLast4Error] = useState<string | null>(null);
  const isIdProof = type === 'id_proof';
  const isBusy = upload.stage !== 'idle';
  const label = t(`common:documentType.${type}`);

  const remove = useMutation({
    mutationFn: (id: string) => api.provider.removeDocument(id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: providerKeys.documents });
      void queryClient.invalidateQueries({ queryKey: providerKeys.application });
    },
  });

  const begin = (): void => {
    if (isIdProof && !/^\d{4}$/.test(last4)) {
      setLast4Error(t('provider:documents.last4Error'));
      return;
    }
    setLast4Error(null);
    setIsChoosing(true);
  };

  const choose = async (source: DocumentSource): Promise<void> => {
    setIsChoosing(false);
    await upload.start({ type, source, idNumberLast4: isIdProof ? last4 : undefined });
  };

  const confirmRemove = (target: VerificationDocument): void => {
    Alert.alert(t('provider:documents.removeTitle'), t('provider:documents.removeBody', { name: label }), [
      { text: t('common:actions.cancel'), style: 'cancel' },
      { text: t('common:actions.remove'), style: 'destructive', onPress: () => remove.mutate(target.id) },
    ]);
  };

  const canUpload = isEditable && (!document || document.status !== 'verified');

  return (
    <Card>
      <Row style={styles.header}>
        <Text variant="bodyStrong" style={styles.flex}>
          {label}
        </Text>
        <Pill
          label={isMandatory ? t('provider:documents.mandatory') : t('provider:documents.optional')}
          tone={isMandatory ? 'accent' : 'neutral'}
        />
      </Row>
      {notes.map((note) => (
        <Text key={note} variant="caption" tone="muted">
          {note}
        </Text>
      ))}
      {document ? (
        <View style={styles.status}>
          <Pill label={t(`common:documentStatus.${document.status}`)} tone={documentStatusTone[document.status]} />
          <Text variant="caption" tone="muted">
            {[document.fileName, document.uploadedAt ? formatDate(document.uploadedAt, locale) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {document.idNumberLast4 ? (
            <Text variant="caption" tone="muted">
              {t('provider:documents.last4Saved', { digits: document.idNumberLast4 })}
            </Text>
          ) : null}
          {document.reviewNote ? (
            <Notice tone={document.status === 'verified' ? 'info' : 'warning'} title={t('provider:documents.reviewNote')} body={document.reviewNote} />
          ) : null}
        </View>
      ) : (
        <Text variant="caption" tone="muted">
          {t('provider:documents.notUploaded')}
        </Text>
      )}

      {canUpload && isIdProof ? (
        <TextField
          label={t('provider:documents.last4Label')}
          hint={t('provider:documents.last4Hint')}
          value={last4}
          onChangeText={(text) => setLast4(text.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          error={last4Error}
        />
      ) : null}

      {isBusy ? (
        <Notice tone="info" icon="cloud-upload-outline" body={t(`provider:documents.stage.${upload.stage}`)} />
      ) : null}
      {upload.pickFailure ? <Notice tone="danger" body={t(`provider:documents.errors.${upload.pickFailure}`)} /> : null}
      {upload.error ? <Notice tone="danger" body={t(errorMessageKey(upload.error))} /> : null}
      {remove.error ? <Notice tone="danger" body={t(errorMessageKey(remove.error))} /> : null}

      {isChoosing ? (
        <View style={styles.sources}>
          <Text variant="label" tone="muted">
            {t('provider:documents.chooseSource')}
          </Text>
          {SOURCES.map(({ source, icon }) => (
            <Button
              key={source}
              label={t(`provider:documents.source.${source}`)}
              icon={icon}
              variant="secondary"
              onPress={() => void choose(source)}
            />
          ))}
          <Button label={t('common:actions.cancel')} variant="ghost" onPress={() => setIsChoosing(false)} />
        </View>
      ) : (
        <View style={styles.actions}>
          {canUpload ? (
            <Button
              label={document ? t('provider:documents.reupload') : t('provider:documents.upload')}
              icon="cloud-upload-outline"
              variant={document ? 'secondary' : 'primary'}
              onPress={begin}
              isLoading={isBusy}
              accessibilityHint={label}
            />
          ) : null}
          {isEditable && document && canRemoveDocument(document) ? (
            <Button
              label={t('common:actions.remove')}
              variant="ghost"
              icon="trash-outline"
              onPress={() => confirmRemove(document)}
              isLoading={remove.isPending}
              isDisabled={isBusy}
              accessibilityHint={label}
            />
          ) : null}
        </View>
      )}
    </Card>
  );
}

/**
 * Required + optional verification documents with status, review notes and upload/remove.
 * Shared by wizard step 8 and the Documents screen.
 */
export function DocumentChecklist({
  required,
  isEditable,
}: {
  required: RequiredDocument[];
  isEditable: boolean;
}): ReactNode {
  const { t } = useTranslation();
  const { pick } = useLocale();
  const documents = useDocuments();

  if (documents.isLoading) {
    return <LoadingState label={t('provider:documents.loading')} />;
  }
  if (documents.error) {
    return <ErrorState error={documents.error} onRetry={() => void documents.refetch()} />;
  }
  const items = documents.data?.items ?? [];
  const requiredTypes = new Set(required.map((item) => item.type));
  const extras = OPTIONAL_EXTRA_DOCUMENTS.filter((type) => !requiredTypes.has(type));

  return (
    <View style={styles.list}>
      <Notice tone="info" icon="lock-closed-outline" title={t('provider:documents.privacyTitle')} body={t('provider:documents.privacyBody')} />
      <Text variant="caption" tone="muted">
        {t('provider:documents.formats')}
      </Text>
      {required.map((item) => (
        <DocumentCard
          key={item.type}
          type={item.type}
          isMandatory={item.isMandatory}
          notes={[...new Set(item.notes.map((note) => pick(note)))]}
          document={latestDocument(items, item.type)}
          isEditable={isEditable}
        />
      ))}
      {extras.length > 0 ? (
        <>
          <SectionHeader title={t('provider:documents.extrasTitle')} />
          <Text variant="caption" tone="muted">
            {t('provider:documents.extrasBody')}
          </Text>
          {extras.map((type) => (
            <DocumentCard
              key={type}
              type={type}
              isMandatory={false}
              notes={[]}
              document={latestDocument(items, type)}
              isEditable={isEditable}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  flex: { flex: 1 },
  header: { justifyContent: 'space-between', alignItems: 'flex-start' },
  status: { gap: 6 },
  sources: { gap: 8 },
  actions: { gap: 8 },
});
