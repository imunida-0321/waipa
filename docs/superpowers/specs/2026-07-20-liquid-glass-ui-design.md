# Liquid Glass UI 設計書

作成日: 2026-07-20

## 概要

WaiPa の UI に Liquid Glass（ガラスモーフィズム）表現を導入する。iOS 26+ では `expo-glass-effect` のネイティブ Liquid Glass を使い、Android / 旧 iOS では `expo-blur` ベースのフォールバックで近い質感を再現する。単色の濃紺背景では透け感が出ないため、全画面共通のネオンブロブ背景を敷く。

## スコープ

### フェーズ1（本設計・今回の Issue）

- ガラス描画を一元化する `GlassSurface` コンポーネントの新設
- ネオンブロブ背景 `AppBackground` の新設と `_layout.tsx` への設置
- `glass` テーマトークンの追加
- 共通 UI・主要画面への適用:
  - `src/components/ui/card.tsx` の土台差し替え（settings / gallery に自動波及）
  - `pill-button.tsx` / `secondary-button.tsx` の背景ガラス化
  - ホーム（`home-header` / `game-card` / `hero-banner` の枠）
  - モーダル・シート・オーバーレイ7種: 遊び方（`how-to-play-modal`）/ リザルト（`result-overlay`）/ プレミアムロック（`premium-lock-modal`）/ プレイヤー設定（`player-setup-sheet`）/ トライアルロック（`trial-lock-overlay`）/ upsell（`premium-upsell-card`）/ paywall

### フェーズ1でやらないこと

- `gradient-button` はガラス化しない。主要 CTA のピンク→紫グラデは視認性・訴求力を優先して現状維持
- ヒーローバナー内の画像・カルーセル挙動は変更しない
- ブロブのアニメーション（静止画のみ。要件確認済み）

### フェーズ2（別 Issue に切り出し）

ゲーム実装内で `colors.surface` を直書きしている約38ファイルのうち、「パネル系」（リザルト画面・ルールモーダル・お題表示）のみ選択的に `GlassSurface` へ差し替える。「プレイ盤面系」（サイコロトレー・カードグリッド・ゲージ等）はゲームの視認性を優先して現状維持。フェーズ1完了後に別 Issue として起票する。

## 現状

- テーマトークンは `src/theme/tokens.ts` に一元化（背景 `#17142A` / サーフェス `#211D3A` / アクセント `#E85BF7`→`#7B5CFA`）
- `src/components/ui/card.tsx` は単色サーフェス＋薄枠＋角丸の View。利用箇所は `app/settings.tsx` / `app/gallery.tsx`
- `colors.surface` の直書きがゲーム実装を中心に約45ファイルある（フェーズ2対象）
- `expo-glass-effect`（~57.0.1）は package.json に導入済みだが未使用。`react-native-svg` も導入済み。`expo-blur` は未導入

## 設計

### `src/components/ui/glass-surface.tsx` — ガラス描画の唯一の分岐点

```
GlassSurface({ children, style, variant? })
├─ iOS 26+（isLiquidGlassAvailable() === true）
│    → expo-glass-effect <GlassView glassEffectStyle="regular" tintColor=glass.tint>
├─ Android / iOS 25以下（ネイティブ環境）
│    → variant による分岐（後述の Android blur 制約を参照）
└─ Web / Jest 環境
     → <View> 疑似ガラス（glass.fallbackFill ＋ glass.borderHighlight の枠線）
```

- `isLiquidGlassAvailable()` の判定は**モジュールレベルで1回だけ**行い、レンダー毎に評価しない
- props は既存 `Card` と互換の `style`（＋ `variant`）とし、利用側の差し替えを最小にする
- すべて静的分岐でクラッシュ経路を作らない。判定不能時は疑似ガラスに落ちる

### `variant` と Android の blur 制約（1画面1枚ルール）

`BlurView` は Android で負荷が高いため、blur の使用箇所を制限する。

- `variant="card"`（既定）: 常設 UI 用。iOS 26+ は GlassView、**Android / 旧 iOS は blur を使わず疑似ガラス**
- `variant="overlay"`: モーダル・シートのバックドロップ／パネル用。Android / 旧 iOS でも `<BlurView tint="dark" intensity={glass.blurIntensity}>` ＋ 半透明紫オーバーレイを使う。1画面に同時表示される blur は原則1枚

### `src/components/ui/app-background.tsx` — ネオンブロブ背景

- `react-native-svg` の `RadialGradient` でピンク（`#E85BF7`）と紫（`#7B5CFA`）のぼやけた光の玉を2〜3個、画面の対角に静的配置
- `app/_layout.tsx` のルートに1回だけ敷く。`position: absolute`・`pointerEvents="none"` でタッチ・レイアウトを阻害しない
- アニメーションなし。初回描画のみで再レンダーコストゼロ

### `src/theme/tokens.ts` への `glass` トークン追加

```ts
export const glass = {
	fallbackFill: 'rgba(33, 29, 58, 0.72)',      // surface #211D3A の半透明版
	borderHighlight: 'rgba(255, 255, 255, 0.14)', // ハイライト風の枠線
	blurIntensity: 40,
	tint: 'rgba(123, 92, 250, 0.10)',             // GlassView / blur に載せる紫味
} as const
```

- 可読性の下限保証: 疑似ガラスの塗り不透明度は 0.72 を下回らない（白文字のコントラスト維持）

### 依存追加

`bunx expo install expo-blur` の1つのみ。`expo-glass-effect` / `react-native-svg` は導入済みのものを使う。

### アクセシビリティ

iOS の「透明度を下げる」設定 ON 時は OS が GlassView を自動で不透明化する（ネイティブ側で処理、追加実装不要）。

## テスト方針（TDD）

RED → GREEN の順で進める。`expo-glass-effect` / `expo-blur` のモックを `__mocks__` に追加（Jest 環境は疑似ガラス分岐に落ちる設計のためモックは薄い）。

- `glass-surface`: `isLiquidGlassAvailable` をモックし、GlassView / BlurView（overlay variant）/ 疑似ガラスの3分岐を検証
- `glass` トークン: 値と型のテスト
- `app-background`: レンダーと `pointerEvents="none"` の検証
- `card`: 土台が `GlassSurface` になることの検証
- 回帰: settings / gallery / モーダル群の既存テストが全パス（`npx jest`）

実機では iOS 26 実機（ネイティブガラス）と Android 実機（疑似ガラス＋overlay blur）の両方で見た目とスクロール性能を確認する。
