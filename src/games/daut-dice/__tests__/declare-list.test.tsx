import { fireEvent, render } from '@testing-library/react-native'
import { DeclareList } from '../declare-list'

jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		getUseOfValueInStyleWarning: jest.fn(),
	}
})

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))

it('prev=null なら全21役がタップ可能', async () => {
	const onDeclare = jest.fn()
	const { getByText } = await render(<DeclareList prev={null} onDeclare={onDeclare} />)
	fireEvent.press(getByText('31'))
	expect(onDeclare).toHaveBeenCalledWith(31)
	fireEvent.press(getByText('21（ミエ）'))
	expect(onDeclare).toHaveBeenCalledWith(21)
})

it('prev=54 のとき 54 以下は無効・65 は有効', async () => {
	const onDeclare = jest.fn()
	const { getByText } = await render(<DeclareList prev={54} onDeclare={onDeclare} />)
	fireEvent.press(getByText('54'))
	fireEvent.press(getByText('31'))
	expect(onDeclare).not.toHaveBeenCalled()
	fireEvent.press(getByText('65'))
	expect(onDeclare).toHaveBeenCalledWith(65)
})

it('prev=66 のとき有効なのは 21（ミエ）のみ', async () => {
	const onDeclare = jest.fn()
	const { getByText } = await render(<DeclareList prev={66} onDeclare={onDeclare} />)
	fireEvent.press(getByText('66（ゾロ目）'))
	expect(onDeclare).not.toHaveBeenCalled()
	fireEvent.press(getByText('21（ミエ）'))
	expect(onDeclare).toHaveBeenCalledWith(21)
})
