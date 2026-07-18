import { fireEvent, render } from '@testing-library/react-native'
import { PremiumPackModal } from '../premium-pack-modal'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native') as typeof import('react-native')
	return { LinearGradient: View }
})

it('ロックアイコンと限定パック案内を表示し、とじるを押せる', async () => {
	const onClose = jest.fn()
	const { getByText, getByTestId, queryByText } = await render(
		<PremiumPackModal visible onClose={onClose} />,
	)

	expect(getByTestId('icon-lock')).toBeTruthy()
	expect(queryByText('🔒')).toBeNull()
	expect(getByText('限定お題パック')).toBeTruthy()
	expect(getByText(/広告視聴 または WaiPa プレミアム/)).toBeTruthy()

	fireEvent.press(getByText('とじる'))
	expect(onClose).toHaveBeenCalledTimes(1)
})
