import { render } from '@testing-library/react-native'
import GameRoute from '../game/[id]'

type MockGameMeta = {
	id: string
	title: string
}

let mockParams: { id?: string } = { id: 'bomb-2-16' }
let mockGame: MockGameMeta | undefined = { id: 'bomb-2-16', title: 'BOMB!! 2/16' }

jest.mock('expo-router', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	return {
		useLocalSearchParams: () => mockParams,
		Redirect: ({ href }: { href: string }) => <Text>redirect:{href}</Text>,
	}
})
jest.mock('@/games/registry', () => ({
	getGame: jest.fn(() => mockGame),
}))
jest.mock('@/components/game/game-screen', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	return {
		GameScreen: ({ meta }: { meta: MockGameMeta }) => <Text>game:{meta.title}</Text>,
	}
})

describe('GameRoute', () => {
	beforeEach(() => {
		mockParams = { id: 'bomb-2-16' }
		mockGame = { id: 'bomb-2-16', title: 'BOMB!! 2/16' }
		jest.clearAllMocks()
	})

	it('id に一致するゲームがあれば GameScreen を表示する', async () => {
		const { getByText } = await render(<GameRoute />)

		expect(getByText('game:BOMB!! 2/16')).toBeTruthy()
	})

	it('id に一致するゲームがなければホームへリダイレクトする', async () => {
		mockParams = { id: 'missing' }
		mockGame = undefined

		const { getByText } = await render(<GameRoute />)

		expect(getByText('redirect:/')).toBeTruthy()
	})
})
