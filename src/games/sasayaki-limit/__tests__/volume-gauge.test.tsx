import { render } from '@testing-library/react-native'
import { VolumeGauge } from '../volume-gauge'

jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: { View },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
	}
})

describe('VolumeGauge', () => {
	const zone = { low: 0.3, high: 0.6 }
	it('ゲージ・ゾーン帯が描画される', async () => {
		const { getByTestId } = await render(
			<VolumeGauge level={0} peak={null} zone={zone} active={false} />,
		)
		expect(getByTestId('volume-gauge')).toBeTruthy()
		expect(getByTestId('zone-band')).toBeTruthy()
	})
	it('peak があるとピークマーカーが出る', async () => {
		const { getByTestId, queryByTestId, rerender } = await render(
			<VolumeGauge level={0.5} peak={null} zone={zone} active />,
		)
		expect(queryByTestId('peak-marker')).toBeNull()
		await rerender(<VolumeGauge level={0.5} peak={0.45} zone={zone} active />)
		expect(getByTestId('peak-marker')).toBeTruthy()
	})
})
