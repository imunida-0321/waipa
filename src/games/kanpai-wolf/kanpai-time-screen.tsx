import { StyleSheet, Text, View } from 'react-native'
import { LottieEffect } from '@/components/game/lottie-effect'
import { lottieAssets } from '@/components/game/lottie-assets'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, spacing, typography } from '@/theme/tokens'
import { KW } from './theme'

type Props = {
	onDone: () => void
}

export function KanpaiTimeScreen({ onDone }: Props) {
	return (
		<View style={styles.container}>
			<LottieEffect source={lottieAssets.cheers} loop style={styles.cheers} />
			<Text style={styles.title}>外したので乾杯！</Text>
			<GradientButton title="結果発表へ" onPress={onDone} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		backgroundColor: colors.background,
		padding: spacing.lg,
		gap: spacing.xl,
		overflow: 'hidden',
	},
	cheers: {
		height: 280,
		alignSelf: 'center',
		width: '100%',
	},
	title: { ...typography.hero, fontSize: 36, textAlign: 'center', color: KW.wolf },
})
