import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { CategoryTile } from '@/entities/service/category-tile';
import type { Category } from '@/shared/api/types';

const COLUMNS = 3;

/** Category tiles, three per row. */
export function CategoryGrid({ categories }: { categories: Category[] }): ReactNode {
  const rows: Category[][] = [];
  for (let start = 0; start < categories.length; start += COLUMNS) {
    rows.push(categories.slice(start, start + COLUMNS));
  }
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((category) => category.id).join()} style={styles.row}>
          {row.map((category) => (
            <CategoryTile
              key={category.id}
              category={category}
              onPress={() => router.push({ pathname: '/customer/categories/[slug]', params: { slug: category.slug } })}
            />
          ))}
          {Array.from({ length: COLUMNS - row.length }, (_, filler) => (
            <View key={`filler-${filler}`} style={styles.filler} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  filler: { flex: 1 },
});
