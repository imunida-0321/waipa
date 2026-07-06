import type { PropsWithChildren } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { colors, radii, spacing } from '@/theme/tokens'

type Props = PropsWithChildren<{ style?: ViewStyle }>

// サーフェス色＋薄枠＋大きめ角丸の基本カード（ゲームカード・設定カード共通の土台）
export function Card({ children, style }: Props) {
	return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		padding: spacing.md,
	},
})
