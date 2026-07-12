import { cardImageSource, JOKER_IMAGE } from '../card-assets'
import { RANKS, SUITS } from '../engine'

it('52枚すべての rank×suit が解決できる', () => {
	SUITS.forEach((suit) => {
		RANKS.forEach((rank) => {
			expect(cardImageSource(rank, suit)).toBeDefined()
		})
	})
})

it('ジョーカー画像が解決できる', () => {
	expect(JOKER_IMAGE).toBeDefined()
})
