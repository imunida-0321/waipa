import type { PropsWithChildren } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { SecondaryButton } from '@/components/ui/secondary-button'
import { spacing } from '@/theme/tokens'

type Props = PropsWithChildren<{
	visible: boolean
	onRetry: () => void
	onHome: () => void
}>

// リザルトの共通枠。中身（敗者発表の演出）は各ゲームが自由に構成する
export function ResultOverlay({ visible, onRetry, onHome, children }: Props) {
	return (
		<Modal visible={visible} transparent animationType="fade">
			<View style={styles.backdrop}>
				<View style={styles.content}>{children}</View>
				<View style={styles.actions}>
					<GradientButton title="もう一回" onPress={onRetry} />
					<SecondaryButton title="ホームへ" onPress={onHome} />
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(10,8,24,0.92)',
		justifyContent: 'center',
		padding: spacing.lg,
	},
	content: { flex: 1, justifyContent: 'center' },
	actions: { gap: spacing.md, paddingBottom: spacing.xl, alignItems: 'stretch' },
})
