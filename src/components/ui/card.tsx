import type { PropsWithChildren } from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { radii, spacing } from '@/theme/tokens'
import { GlassSurface } from './glass-surface'

type Props = PropsWithChildren<{ style?: StyleProp<ViewStyle> }>

// ガラス面＋大きめ角丸の基本カード（ゲームカード・設定カード共通の土台）
export function Card({ children, style }: Props) {
	return <GlassSurface style={[styles.card, style]}>{children}</GlassSurface>
}

const styles = StyleSheet.create({
	card: {
		borderRadius: radii.lg,
		padding: spacing.md,
	},
})
