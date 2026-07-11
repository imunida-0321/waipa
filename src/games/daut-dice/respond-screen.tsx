import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { PillButton } from '@/components/ui/pill-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { MIE, declarationLabel } from './engine'
import { DD } from './theme'

type Props = {
	declarerName: string
	declaration: number
	onDoubt: () => void
	onBelieve: () => void
}

// 宣言を受けた人の2択。21（ミエ）はそれ以上の宣言が無いのでダウト一択
export function RespondScreen({ declarerName, declaration, onDoubt, onBelieve }: Props) {
	const mie = declaration === MIE
	return (
		<View style={styles.container}>
			<Text style={styles.who}>{declarerName}さんの宣言</Text>
			<View style={styles.card}>
				<Text style={styles.value}>{declarationLabel(declaration)}</Text>
			</View>
			<Text style={styles.hint}>{mie ? '21はダウトのみ！' : '信じる？ 疑う？'}</Text>
			<GradientButton title="ダウト！" onPress={onDoubt} />
			{!mie && <PillButton title="信じて振る" onPress={onBelieve} />}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { gap: spacing.md, alignItems: 'stretch' },
	who: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
	card: {
		backgroundColor: colors.surface,
		borderWidth: 2,
		borderColor: DD.red,
		borderRadius: radii.lg,
		paddingVertical: spacing.lg,
		alignItems: 'center',
	},
	value: { ...typography.hero, fontSize: 44 },
	hint: { ...typography.caption, textAlign: 'center' },
})
