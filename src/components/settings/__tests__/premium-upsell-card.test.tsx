import { fireEvent, render } from '@testing-library/react-native'
import { PremiumUpsellCard } from '../premium-upsell-card'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-image', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native') as typeof import('react-native')
	return { Image: View }
})

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native') as typeof import('react-native')
	return { LinearGradient: View }
})

it('王冠アイコンとプレミアム案内を表示し、アップグレードを押せる', async () => {
	const onUpgradePress = jest.fn()
	const { getByText, getByTestId, queryByText } = await render(
		<PremiumUpsellCard onUpgradePress={onUpgradePress} />,
	)

	expect(getByTestId('icon-crown')).toBeTruthy()
	expect(queryByText('👑')).toBeNull()
	expect(getByText('WaiPa プレミアム')).toBeTruthy()
	expect(getByText('広告なしで、もっと快適に遊ぼう！')).toBeTruthy()

	fireEvent.press(getByText('アップグレード'))
	expect(onUpgradePress).toHaveBeenCalledTimes(1)
})
