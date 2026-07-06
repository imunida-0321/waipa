import { useSyncExternalStore } from 'react'
import { useColorScheme as useRNColorScheme } from 'react-native'

const emptySubscribe = () => () => {}

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
	// サーバー(静的)レンダリング時は false、クライアントでのハイドレーション後は true
	const hasHydrated = useSyncExternalStore(
		emptySubscribe,
		() => true,
		() => false,
	)

	const colorScheme = useRNColorScheme()

	if (hasHydrated) {
		return colorScheme
	}

	return 'light'
}
