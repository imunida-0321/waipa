# 効果音の出典とライセンス

すべて **CC0 1.0（パブリックドメイン）** の [Kenney.nl](https://kenney.nl) 素材、またはそれを加工・合成したもの。
クレジット表記は不要（ライセンス: https://creativecommons.org/publicdomain/zero/1.0/ ）。

形式は iOS / Android 両対応の AAC (.m4a)、44.1kHz mono。
`src/app/_layout.tsx` で `registerSound(name, require(...))` により起動時に登録され、
`playSound(name)`（`src/lib/sound.ts`）で再生される。

| ファイル        | 用途                          | 元素材（Kenney.nl）                                                               |
| --------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| `tap.m4a`       | ボタンタップ                  | [Interface Sounds](https://kenney.nl/assets/interface-sounds) `click_001.ogg`     |
| `explosion.m4a` | BOMB!! の爆発                 | [Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds) `explosionCrunch_002.ogg` |
| `reveal.m4a`    | 結果発表                      | [Digital Audio](https://kenney.nl/assets/digital-audio) `powerUp1.ogg`            |
| `event.m4a`     | きまぐれ◯× イベントカットイン | [Digital Audio](https://kenney.nl/assets/digital-audio) `phaserUp1.ogg`           |
| `spin.m4a`      | ルーレット回転（3.5秒）       | Interface Sounds `click_002.ogg` を加工生成（下記）                               |
| `drumroll.m4a`  | ドラムロール（2.0秒）         | 自作合成（フィルタードノイズのスネアロール）                                      |
| `heartbeat.m4a` | 爆弾スワイプの心音（スコアに応じ間隔短縮） | 自作合成（低域サイン2連打）。素材由来なし（CC0 扱い）                             |

### 未収録（追加予定）

| ファイル   | 用途                                           | 状態                                                                                                                                                     |
| ---------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tick.m4a` | カウントダウン爆弾リレーのチクタク（加速再生） | 素材未収録。追加したら `_layout.tsx` に `registerSound('tick', require('@/assets/sounds/tick.m4a'))` を1行足す。未収録の間は無音（バイブのみ）で動作する |

## 加工生成した音源について

- `spin.m4a`: `use-digit-roulette.ts` の `withTiming(3500ms, Easing.out(cubic))` と同じ
  減速カーブ上に `click_002` のチック音を44回配置して生成。回転アニメと体感が同期する。
- `drumroll.m4a`: `use-drumroll.ts` の `durationMs=2000` に合わせた2.0秒。
  ノイズ＋バンドパスのスネア打を約36打/秒で並べ、クレッシェンドさせたもの。素材由来なし（自作、CC0 扱い）。
- `heartbeat.m4a`: 爆弾スワイプの心音（lub-dub）約0.25秒。55Hz/90ms（lub）→60ms無音→
  45Hz/70ms・0.7倍（dub）の指数減衰サイン波2連打、ピーク-3dBFSに正規化。素材由来なし（自作、CC0 扱い）。
  スコアに応じた再生間隔の短縮はゲーム側（`playSound('heartbeat')` の呼び出し頻度）で制御する。

生成スクリプトは [`scripts/build-sounds.py`](../../scripts/build-sounds.py)（要 Python + `soundfile` + `numpy`）。
Kenney 由来の素材（tap/explosion/reveal/event/spin）は Kenney の各 zip を展開したディレクトリが必要だが、
`drumroll` / `heartbeat` は完全自作合成のため zip が無くても単体で生成できる（無い場合は該当区間だけ
スキップする）。元 OGG → WAV 変換は `soundfile`、AAC 変換は macOS `afconvert -f m4af -d aac -b 96000`。

## 差し替えたいとき

1. 新しい音源（CC0 等ライセンス確認済み）を同名の `.m4a` でこのフォルダに置く
2. この README の表を更新する
   名前を追加する場合は `src/app/_layout.tsx` に `registerSound` を1行足す。
