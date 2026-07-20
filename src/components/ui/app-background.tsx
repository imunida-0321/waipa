import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { colors } from '@/theme/tokens'

// 全画面共通のネオンブロブ背景（静止画）。ガラスの透け感を出すための光の玉。
// native-stack はプッシュ画面が不透明に重なるため、_layout ではなく
// 各画面のルート View（backgroundColor: colors.background）の最初の子として置く
export function AppBackground() {
	return (
		<View testID="app-background" style={styles.fill} pointerEvents="none">
			<Svg width="100%" height="100%">
				<Defs>
					<RadialGradient id="blob-pink" cx="50%" cy="50%" r="50%">
						<Stop offset="0%" stopColor={colors.accentFrom} stopOpacity={0.32} />
						<Stop offset="100%" stopColor={colors.accentFrom} stopOpacity={0} />
					</RadialGradient>
					<RadialGradient id="blob-purple" cx="50%" cy="50%" r="50%">
						<Stop offset="0%" stopColor={colors.accentTo} stopOpacity={0.38} />
						<Stop offset="100%" stopColor={colors.accentTo} stopOpacity={0} />
					</RadialGradient>
				</Defs>
				<Circle cx="12%" cy="8%" r="42%" fill="url(#blob-pink)" />
				<Circle cx="95%" cy="42%" r="38%" fill="url(#blob-purple)" />
				<Circle cx="25%" cy="98%" r="45%" fill="url(#blob-pink)" />
			</Svg>
		</View>
	)
}

const styles = StyleSheet.create({
	fill: StyleSheet.absoluteFillObject,
})
