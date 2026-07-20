import { render } from '@testing-library/react-native'
import { RulesModal } from '../rules-modal'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))

describe('ガラス面', () => {
	it('シートはガラス面で描画される', async () => {
		const { getByTestId } = await render(
			<RulesModal visible onClose={jest.fn()} />,
		)

		expect(getByTestId('glass-surface-blur')).toBeTruthy()
	})
})
