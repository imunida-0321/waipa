import { useEffect, useState } from 'react'
import { Modal, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	title: string
	pages: readonly string[]
	onClose: () => void
}

// 全ゲーム共通の遊び方解説モーダル。初回は自動表示、ヘッダー「？」で随時表示
export function HowToPlayModal({ visible, title, pages, onClose }: Props) {
	const [page, setPage] = useState(0)
	const isLast = page >= pages.length - 1

	useEffect(() => {
		// Reset page when modal becomes visible
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (visible) setPage(0)
	}, [visible])

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<View style={styles.card}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.howto}>あそびかた</Text>
					<Text style={styles.body}>{pages[page]}</Text>
					<View style={styles.dots}>
						{pages.map((_, i) => (
							<View key={i} style={[styles.dot, i === page && styles.dotActive]} />
						))}
					</View>
					<GradientButton
						title={isLast ? 'はじめる' : '次へ'}
						onPress={() => (isLast ? onClose() : setPage((p) => p + 1))}
					/>
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		padding: spacing.lg,
	},
	card: {
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		padding: spacing.lg,
		gap: spacing.md,
	},
	title: { ...typography.title, textAlign: 'center' },
	howto: { ...typography.caption, textAlign: 'center' },
	body: { ...typography.body, minHeight: 72, textAlign: 'center' },
	dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
	dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceBorder },
	dotActive: { backgroundColor: colors.accentFrom },
})
