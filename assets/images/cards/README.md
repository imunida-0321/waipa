# トランプカード素材

- 出典: [notpeter/Vector-Playing-Cards](https://github.com/notpeter/Vector-Playing-Cards)（原作 Byron Knoll「vector-playing-cards」）
- ライセンス: パブリックドメイン（PD が認められない法域では WTFPL）。商用組み込み可
- 内容: 52枚（`{RANK}{S}.webp`、RANK=A,2..10,J,Q,K / S=S,H,D,C）＋ `Joker1.webp` の計53枚
- 形式: 幅360px・WebP(q85)。合計約1MB（1MB未満）
- 再生成: `bash scripts/build-card-assets.sh`（macOS、要 `brew install webp`）
- 参照マップの再生成: `node scripts/generate-card-assets.mjs`
