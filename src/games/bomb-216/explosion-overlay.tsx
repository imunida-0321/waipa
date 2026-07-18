import LottieView from 'lottie-react-native'
import { StyleSheet, View } from 'react-native'

// 爆発 Lottie を盤面全体に重ねて1回だけ再生する。
// 素材は assets/lottie/explosion.json（同名で差し替えれば演出だけ変わる）
export function ExplosionOverlay() {
	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill} testID="explosion-overlay">
			<LottieView
				source={require('@/assets/lottie/explosion.json')}
				autoPlay
				loop={false}
				style={styles.lottie}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	lottie: { flex: 1 },
})
