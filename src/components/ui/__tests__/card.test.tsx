import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Card } from '../card'

describe('Card', () => {
	it('ガラス面を土台に子要素を描画する', async () => {
		const { getByTestId, getByText } = await render(
			<Card>
				<Text>中身</Text>
			</Card>,
		)
		expect(getByTestId('glass-surface-pseudo')).toBeTruthy()
		expect(getByText('中身')).toBeTruthy()
	})
})
