import type { GameMeta } from '../types'
import { BombRelayGame } from './bomb-relay-game'

export const meta: GameMeta = {
	id: 'bomb-relay',
	title: 'カウントダウン爆弾リレー',
	tagline: '爆発した時に\n持ってた人が負け！',
	emoji: '🧨',
	gradient: ['#A55EEA', '#8854D0'],
	minPlayers: 3,
	maxPlayers: 12,
	catchCopy: 'お題に答えてスマホを回せ！\n爆発した瞬間、持ってた人の負け！',
	summary:
		'このゲームは、お題（例「ラーメンの具といえば？」）に答えながらスマホを回すリレーゲームです！爆弾のタイマーはランダムで、チクタクがだんだん速くなり…爆発した瞬間に持っていた人が負けです！',
	howToPlay: [
		'① お題をみんなで確認して「スタート」！',
		'② お題に答えたら、すぐ次の人にスマホを手渡し！',
		'③ チクタクがだんだん速くなってきたら…爆発が近い！',
		'④ 💥 爆発した瞬間に持っていた人の負け！',
	],
	Component: BombRelayGame,
}
