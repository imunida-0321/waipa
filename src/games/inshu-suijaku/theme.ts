import { colors } from '@/theme/tokens'

// 飲酒衰弱の赤系（registry グラデと統一）
export const NS = {
	jokerCardOverlay: 'rgba(80, 20, 90, 0.45)',
	punishIconTint: colors.text,
	revealBackdrop: 'rgba(10,8,24,0.94)',
	jokerBackdrop: 'rgba(26,6,32,0.96)',
	rose: '#FF6B81',
	redDeep: '#B33939',
	jokerPurple: '#7B2CBF',
	cardFace: '#FFFFFF',
	punishInk: 'rgba(76, 46, 122, 0.75)', // 成立演出でカード上にうっすら出す罰テキスト色
	matchedFace: '#F2EEFC', // 成立演出中のカード地
} as const
