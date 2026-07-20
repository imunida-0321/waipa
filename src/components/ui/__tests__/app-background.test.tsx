import { render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { AppBackground } from '../app-background'

// react-native-svg は transformIgnorePatterns の対象でロードが不安定なためスタブする
jest.mock('react-native-svg', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	function Stub({ children }: { children?: ReactNode }) {
		return <View>{children}</View>
	}
	return {
		__esModule: true,
		default: Stub,
		Circle: Stub,
		Defs: Stub,
		RadialGradient: Stub,
		Stop: Stub,
	}
})

describe('AppBackground', () => {
	it('タッチを奪わない（pointerEvents: none）', async () => {
		const { getByTestId } = await render(<AppBackground />)
		expect(getByTestId('app-background').props.pointerEvents).toBe('none')
	})
})
