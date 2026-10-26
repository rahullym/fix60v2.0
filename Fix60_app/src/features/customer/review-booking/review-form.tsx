import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { api } from '@/shared/api/endpoints';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { Button, Notice, RatingStars, Screen, Text, TextField } from '@/shared/ui';
import { invalidateRoots } from '../model/query-keys';

const MAX_COMMENT = 500;

/** Star rating + optional comment for a completed booking. */
export function ReviewForm({
  bookingCode,
  providerName,
  onDone,
}: {
  bookingCode: string;
  providerName: string;
  onDone: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.bookings.review(bookingCode, { rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      onDone();
      void invalidateRoots(client, ['booking', 'bookings', 'provider-profile']);
    },
  });

  const submit = (): void => {
    if (rating < 1) {
      setRatingError(t('customer:review.ratingRequired'));
      return;
    }
    setRatingError(null);
    mutation.mutate();
  };

  return (
    <Screen footer={<Button label={t('customer:review.submit')} onPress={submit} isLoading={mutation.isPending} />}>
      <Text variant="title">{t('customer:review.heading', { name: providerName })}</Text>
      <Text tone="muted">{t('customer:review.intro')}</Text>
      <View style={styles.stars}>
        <RatingStars
          value={rating}
          onChange={setRating}
          size={40}
          label={t('customer:review.ratingA11y', { rating })}
        />
        <Text variant="bodyStrong">{rating > 0 ? t(`customer:review.ratingWord.${rating}`) : t('customer:review.tapToRate')}</Text>
        {ratingError ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {ratingError}
          </Text>
        ) : null}
      </View>
      <TextField
        label={t('customer:review.comment')}
        value={comment}
        onChangeText={setComment}
        placeholder={t('customer:review.commentPlaceholder')}
        multiline
        maxLength={MAX_COMMENT}
        hint={t('customer:review.commentHint')}
      />
      <Notice tone="info" body={t('customer:review.safetyNote')} />
      {mutation.isError ? <Notice tone="danger" body={t(errorMessageKey(mutation.error))} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stars: { alignItems: 'center', gap: 8, paddingVertical: 12 },
});
