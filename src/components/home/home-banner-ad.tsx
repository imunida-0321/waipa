import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AD_UNIT_IDS } from '@/constants/ads'
import { adsEnabled } from '@/lib/ads'
import { BannerAd, BannerAdSize } from '@/lib/gma'

// ホーム下部の常設バナー。プレミアムは非表示（issue #6）
export function HomeBannerAd() {
	const insets = useSafeAreaInsets()
	if (!adsEnabled()) return null
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
