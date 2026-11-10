import { render } from '@testing-library/react-native'
import { trialStore } from '@/lib/trial-store'
import GameRoute from '../game/[id]'

type MockGameMeta = {
	id: string
	title: string
	premium?: boolean
}

const FREE_GAME: MockGameMeta = { id: 'bomb-2-16', title: 'BOMB!! 2/16' }
const PREMIUM_GAME: MockGameMeta = {
	id: 'odeko-poker',
	title: 'おでこインディアンポーカー',
	premium: true,
}

let mockParams: { id?: string } = { id: FREE_GAME.id }
let mockGame: MockGameMeta | undefined = FREE_GAME
let mockPremiumUnlocked = false

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
// お試しの状態は実物の trial-store で作る。購読状態だけを差し替える
jest.mock('@/lib/premium', () => ({
	isPremiumUnlocked: jest.fn(() => mockPremiumUnlocked),
	usePremium: jest.fn(() => mockPremiumUnlocked),
}))

function openGame(game: MockGameMeta) {
	mockParams = { id: game.id }
	mockGame = game
}

describe('GameRoute', () => {
	beforeEach(() => {
		openGame(FREE_GAME)
		mockPremiumUnlocked = false
		trialStore._resetForTest()
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

	describe('プレミアム限定ゲーム（ホームのグリッドを通らずに開かれた場合もロックする）', () => {
		beforeEach(() => {
			openGame(PREMIUM_GAME)
		})

		it('未購読でお試し中でもなければ、ホームへリダイレクトする', async () => {
			const { getByText, queryByText } = await render(<GameRoute />)

			expect(getByText('redirect:/')).toBeTruthy()
			expect(queryByText('game:おでこインディアンポーカー')).toBeNull()
		})

		it('購読者なら GameScreen を表示する', async () => {
			mockPremiumUnlocked = true

			const { getByText } = await render(<GameRoute />)

			expect(getByText('game:おでこインディアンポーカー')).toBeTruthy()
		})

		it('そのゲームのお試し中なら GameScreen を表示する', async () => {
			await trialStore.startTrial(PREMIUM_GAME.id)

			const { getByText } = await render(<GameRoute />)

			expect(getByText('game:おでこインディアンポーカー')).toBeTruthy()
		})

		it('お試しを使い切っていても GameScreen を表示する（ロックオーバーレイは GameScreen が出す）', async () => {
			await trialStore.startTrial(PREMIUM_GAME.id)
			trialStore.consumeRound(PREMIUM_GAME.id)
			trialStore.consumeRound(PREMIUM_GAME.id)

			const { getByText } = await render(<GameRoute />)

			expect(getByText('game:おでこインディアンポーカー')).toBeTruthy()
		})

		it('別のゲームのお試し中なら、ホームへリダイレクトする', async () => {
			await trialStore.startTrial('burst-chicken')

			const { getByText } = await render(<GameRoute />)

			expect(getByText('redirect:/')).toBeTruthy()
		})
	})
})
