import { fireEvent, render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Card } from '../card'
import { ChevronRow } from '../chevron-row'
import { SectionHeader } from '../section-header'
import { SettingToggleRow } from '../setting-toggle-row'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))

describe('Card', () => {
	it('Card が children を描画する', async () => {
		const { getByText } = await render(
			<Card>
				<Text>中身</Text>
			</Card>,
		)
		expect(getByText('中身')).toBeTruthy()
	})
})

describe('SectionHeader', () => {
	it('SectionHeader がタイトルを描画する', async () => {
		const { getByText } = await render(<SectionHeader title="ゲーム一覧" />)
		expect(getByText('ゲーム一覧')).toBeTruthy()
	})
})

describe('SettingToggleRow', () => {
	it('SettingToggleRow のスイッチ操作で onValueChange が呼ばれる', async () => {
		const onValueChange = jest.fn()
		const { getByRole } = await render(
			<SettingToggleRow
				icon="volume-high"
				label="効果音"
				value={true}
				onValueChange={onValueChange}
			/>,
		)
		fireEvent(getByRole('switch'), 'valueChange', false)
		expect(onValueChange).toHaveBeenCalledWith(false)
	})
})

describe('ChevronRow', () => {
	it('ChevronRow のタップで onPress が呼ばれる', async () => {
		const onPress = jest.fn()
		const { getByText } = await render(
			<ChevronRow icon="star" label="レビューを書く" onPress={onPress} />,
		)
		fireEvent.press(getByText('レビューを書く'))
		expect(onPress).toHaveBeenCalledTimes(1)
	})
})
