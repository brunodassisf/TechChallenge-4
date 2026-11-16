import { StyleSheet, Text, View } from 'react-native';

import type { StudentSummary } from '@/api/types';
import { avatarColor } from '@/lib/admin';
import { initials } from '@/lib/initials';
import { colors, fonts, space } from '@/theme';

export function StudentRow({ student, index }: { student: StudentSummary; index: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${student.name}, ${student.email}`}>
      <View style={[styles.avatar, { backgroundColor: avatarColor(index) }]}>
        <Text style={styles.avatarText}>{initials(student.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {student.email}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingVertical: space.md,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display800, fontSize: 14, color: colors.onCard },
  info: { flex: 1 },
  name: { fontFamily: fonts.display700, fontSize: 16, color: colors.text },
  sub: { fontFamily: fonts.body400, fontSize: 12, color: colors.textFaint, marginTop: 2 },
});
