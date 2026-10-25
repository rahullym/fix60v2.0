import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CategoryTile, ViewMoreTile } from '@/entities/service/category-tile';
import type { Category } from '@/shared/api/types';

const COLUMNS = 2;
const HOME_LIMIT = 5;

type Tile = Category | 'more';

/** "Our Services" grid: two gradient service cards per row, ending with a teal "View more" tile. */
export function CategoryGrid({ categories }: { categories: Category[] }): ReactNode {
  const { t } = useTranslation();
  const tiles: Tile[] = categories.length > HOME_LIMIT ? [...categories.slice(0, HOME_LIMIT), 'more'] : categories;
  const rows: Tile[][] = [];
  for (let start = 0; start < tiles.length; start += COLUMNS) {
    rows.push(tiles.slice(start, start + COLUMNS));
  }
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((tile) => (tile === 'more' ? 'more' : tile.id)).join()} style={styles.row}>
          {row.map((tile) =>
            tile === 'more' ? (
              <ViewMoreTile key="more" label={t('customer:home.viewMore')} onPress={() => router.push('/customer/browse')} />
            ) : (
              <CategoryTile
                key={tile.id}
                category={tile}
                onPress={() => router.push({ pathname: '/customer/categories/[slug]', params: { slug: tile.slug } })}
              />
            ),
          )}
          {Array.from({ length: COLUMNS - row.length }, (_, filler) => (
            <View key={`filler-${filler}`} style={styles.filler} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 16 },
  row: { flexDirection: 'row', gap: 16 },
  filler: { flex: 1 },
});
