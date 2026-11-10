import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AD_UNIT_IDS } from '@/constants/ads'
import { useAdsEnabled } from '@/lib/ads'
import { BannerAd, BannerAdSize } from '@/lib/gma'

// ホーム下部の常設バナー。プレミアムは非表示（issue #6）。
// 広告の初期化が済むまでは出さず、購読状態が変わったら追従する（issue #158）
export function HomeBannerAd() {
	const insets = useSafeAreaInsets()
	const enabled = useAdsEnabled()
	if (!enabled) return null
	return (
		<View testID="home-banner-ad" style={[styles.wrap, { paddingBottom: insets.bottom }]}>
			<BannerAd
				unitId={AD_UNIT_IDS.homeBanner}
				size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { alignItems: 'center' },
})
