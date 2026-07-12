// このファイルは scripts/generate-card-assets.mjs による自動生成。手で編集しない
import type { Suit } from './engine'

const CARD_IMAGES: Record<string, number> = {
	AS: require('@/assets/images/cards/AS.webp'),
	'2S': require('@/assets/images/cards/2S.webp'),
	'3S': require('@/assets/images/cards/3S.webp'),
	'4S': require('@/assets/images/cards/4S.webp'),
	'5S': require('@/assets/images/cards/5S.webp'),
	'6S': require('@/assets/images/cards/6S.webp'),
	'7S': require('@/assets/images/cards/7S.webp'),
	'8S': require('@/assets/images/cards/8S.webp'),
	'9S': require('@/assets/images/cards/9S.webp'),
	'10S': require('@/assets/images/cards/10S.webp'),
	JS: require('@/assets/images/cards/JS.webp'),
	QS: require('@/assets/images/cards/QS.webp'),
	KS: require('@/assets/images/cards/KS.webp'),
	AH: require('@/assets/images/cards/AH.webp'),
	'2H': require('@/assets/images/cards/2H.webp'),
	'3H': require('@/assets/images/cards/3H.webp'),
	'4H': require('@/assets/images/cards/4H.webp'),
	'5H': require('@/assets/images/cards/5H.webp'),
	'6H': require('@/assets/images/cards/6H.webp'),
	'7H': require('@/assets/images/cards/7H.webp'),
	'8H': require('@/assets/images/cards/8H.webp'),
	'9H': require('@/assets/images/cards/9H.webp'),
	'10H': require('@/assets/images/cards/10H.webp'),
	JH: require('@/assets/images/cards/JH.webp'),
	QH: require('@/assets/images/cards/QH.webp'),
	KH: require('@/assets/images/cards/KH.webp'),
	AD: require('@/assets/images/cards/AD.webp'),
	'2D': require('@/assets/images/cards/2D.webp'),
	'3D': require('@/assets/images/cards/3D.webp'),
	'4D': require('@/assets/images/cards/4D.webp'),
	'5D': require('@/assets/images/cards/5D.webp'),
	'6D': require('@/assets/images/cards/6D.webp'),
	'7D': require('@/assets/images/cards/7D.webp'),
	'8D': require('@/assets/images/cards/8D.webp'),
	'9D': require('@/assets/images/cards/9D.webp'),
	'10D': require('@/assets/images/cards/10D.webp'),
	JD: require('@/assets/images/cards/JD.webp'),
	QD: require('@/assets/images/cards/QD.webp'),
	KD: require('@/assets/images/cards/KD.webp'),
	AC: require('@/assets/images/cards/AC.webp'),
	'2C': require('@/assets/images/cards/2C.webp'),
	'3C': require('@/assets/images/cards/3C.webp'),
	'4C': require('@/assets/images/cards/4C.webp'),
	'5C': require('@/assets/images/cards/5C.webp'),
	'6C': require('@/assets/images/cards/6C.webp'),
	'7C': require('@/assets/images/cards/7C.webp'),
	'8C': require('@/assets/images/cards/8C.webp'),
	'9C': require('@/assets/images/cards/9C.webp'),
	'10C': require('@/assets/images/cards/10C.webp'),
	JC: require('@/assets/images/cards/JC.webp'),
	QC: require('@/assets/images/cards/QC.webp'),
	KC: require('@/assets/images/cards/KC.webp'),
}

const SUIT_LETTER: Record<Suit, string> = { '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' }

export function cardImageSource(rank: string, suit: Suit): number {
	return CARD_IMAGES[`${rank}${SUIT_LETTER[suit]}`]
}

export const JOKER_IMAGE: number = require('@/assets/images/cards/Joker1.webp')
