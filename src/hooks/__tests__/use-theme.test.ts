import { renderHook } from '@testing-library/react-native'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useTheme } from '../use-theme'

jest.mock('@/global.css', () => ({}))
jest.mock('@/hooks/use-color-scheme', () => ({
	useColorScheme: jest.fn(),
}))

const useColorSchemeMock = useColorScheme as jest.MockedFunction<typeof useColorScheme>

describe('useTheme', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('light のとき light テーマを返す', async () => {
		useColorSchemeMock.mockReturnValue('light')

		const { result } = await renderHook(() => useTheme())

		expect(result.current).toBe(Colors.light)
	})

	it('dark のとき dark テーマを返す', async () => {
		useColorSchemeMock.mockReturnValue('dark')

		const { result } = await renderHook(() => useTheme())

		expect(result.current).toBe(Colors.dark)
	})

	it('unspecified のとき light テーマにフォールバックする', async () => {
		useColorSchemeMock.mockReturnValue('unspecified' as ReturnType<typeof useColorScheme>)

		const { result } = await renderHook(() => useTheme())

		expect(result.current).toBe(Colors.light)
	})
})
