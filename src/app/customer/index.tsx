import type { ReactNode } from 'react';
import { signOut } from '@/features/auth/model/auth-flow';
import { Button, Screen, Text } from '@/shared/ui';

export default function CustomerHome(): ReactNode {
  return (
    <Screen>
      <Text variant="title">Customer home</Text>
      <Button label="Sign out" onPress={signOut} />
    </Screen>
  );
}
