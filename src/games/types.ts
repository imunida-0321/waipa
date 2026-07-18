import type { ComponentType } from 'react'

export type GameMeta = {
	id: string
	title: string
	tagline: string
	emoji: string
	gradient: readonly [string, string]
	minPlayers: number
	maxPlayers: number
	requiresPlayers?: boolean
	/** プレミアム限定ゲーム（全体ロック）。ホームでマスク＋👑バッジ、非プレミアムはロックモーダル */
	premium?: boolean
	/** イントロ画面のキャッチコピー（\n 可）。未指定なら tagline */
	catchCopy?: string
	/** イントロ画面の遊び方ダイジェスト。未指定なら howToPlay を連結 */
	summary?: string
	/**
	 * イントロ画面のサムネイル画像（1:1・512px 推奨）。未指定なら絵文字＋グラデ。
	 * 命名規則: assets/images/<ゲームID>/intro.jpg（ゲーム内背景と兼用する場合は bg.jpg 可）
	 */
	thumbnail?: number
	/**
	 * ホームカードのキービジュアル（1.3:1・1040x800 推奨、タイトル文字入り前提）。未指定なら絵文字＋グラデ。
	 * 命名規則: assets/images/<ゲームID>/card.jpg
	 */
	cardThumbnail?: number
	howToPlay: readonly string[]
	Component: ComponentType
}
