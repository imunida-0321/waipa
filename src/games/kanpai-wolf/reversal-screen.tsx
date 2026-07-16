import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { KW } from './theme'

type Props = {
	wolfName: string
	majorityWord: string
	onJudge: (guessed: boolean) => void
}

// 吊られたウルフの逆転チャンス。口頭で宣言 → お題公開 → 全員で正誤をタップ判定
// （表記ゆれを機械判定しないため、正誤はプレイヤーの合議）
export function ReversalScreen({ wolfName, majorityWord, onJudge }: Props) {
	const [opened, setOpened] = useState(false)

	if (!opened) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>🐺 {wolfName}さん、逆転のチャンス！</Text>
				<Text style={styles.instruction}>
					市民のお題はなんだったでしょう？{'\n'}口頭で宣言してから開けよう
				</Text>
				<GradientButton
					title="宣言した！お題を開ける"
					onPress={() => {
						haptics.heavy()
						setOpened(true)
					}}
				/>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<Text style={styles.instruction}>市民のお題は…</Text>
			<Text style={styles.word}>{majorityWord}</Text>
			<GradientButton title="当てた！" onPress={() => onJudge(true)} />
			<Pressable
				accessibilityRole="button"
				onPress={() => {
					haptics.tap()
					onJudge(false)
				}}
				style={styles.missButton}
			>
				<Text style={styles.missText}>外した</Text>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	title: { ...typography.body, textAlign: 'center', fontWeight: '700' },
	instruction: { ...typography.body, textAlign: 'center' },
	word: { ...typography.hero, fontSize: 44, textAlign: 'center', color: KW.wolf },
	missButton: {
		padding: spacing.md,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		alignItems: 'center',
	},
	missText: { ...typography.body },
})
