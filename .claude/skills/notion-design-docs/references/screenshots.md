# スクリーンショットを撮って Notion に載せる

## 1. シミュレータで撮る

iOS シミュレータ（iPhone 17 Pro）で開発ビルドを動かして撮る。Expo Go では動かない（AdMob などネイティブ専用の SDK を使っているため）。開発ビルドは `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 bunx expo run:ios` で作り、JS は Metro（`bunx expo start --port 8081`）から読む。撮る前に次を確かめる。

- Metro が動いていること（`curl -s localhost:8081/status`）。止まっていると、未読み込みの画像が白く写る
- 開発用の警告トーストを写さないため、撮影中だけ `src/app/_layout.tsx` に `LogBox.ignoreAllLogs(true)` を足す（コミットしない）
- 未購読のときの画面を撮るときだけ、`src/lib/premium.ts` の未設定時のフォールバックを一時的に `false` にする（コミットしない）
- 時刻表示をそろえるなら `xcrun simctl status_bar booted override --time "9:41"`。終わったら `xcrun simctl status_bar booted clear`

撮るのは `scripts/capture.sh`:

```bash
.claude/skills/notion-design-docs/scripts/capture.sh <保存先.jpg> [待ち秒数]
```

保存先はリポジトリの外（作業用の一時フォルダ）にする。リポジトリの中に書くと、Fast Refresh の帯が写り込むことがある。画像は幅 1044px の JPEG になる。

撮り終えたら、一時的に変えたファイルを元に戻し、`git status` で何も残っていないことを確かめる。

## 2. 画像を Notion に送る

Notion へのアップロードは2段階。

1. `notion-create-file-upload` に `filename`（例: `bomb-swipe-06-result.jpg`）を渡して、送信の枠を取る。返り値に `file_upload_id`、`expires_at`、`upload_headers.authorization` が入っている
2. `scripts/notion_upload.py` で、その枠へ画像を送る

枠の期限は約10分。枠を取ったら、すぐに送る。枚数が多いときは、15枚前後ずつ「枠を取る → 送る」を繰り返す。

`notion_upload.py` は、標準入力から1行に1枚ずつ読む。

```
<画像のパス> <file_upload_id> <expires_at> <トークン>
```

トークンの欄には、`authorization` の値から `Bearer ` を除いたものを入れる。長いトークンを毎回書き写さなくて済むよう、2行目以降は「`.` より後ろの署名だけ」でもよい。スクリプトは、1行目の完全なトークンからワークスペースの情報を読み取り、2行目以降のトークンを組み立てる。

```bash
python3 .claude/skills/notion-design-docs/scripts/notion_upload.py <<'EOF'
/tmp/shots/bomb-swipe-06-result.jpg 415c...0001 2026-11-12T10:00:00.000Z eyJ...(完全なトークン)
/tmp/shots/bomb-swipe-05-exploded.jpg 415c...0002 2026-11-12T10:00:01.000Z 署名だけ
EOF
```

成功した画像ごとに、`file-upload://<ID>` が出力される。失敗した行は `NG` と理由が出る。

## 3. ページの画像を差し替える

1. `notion-fetch` でページを読み、差し替える画像の `<image source="notion-file-block://...">` を探す
2. `update_content` で、その `<image ...>キャプション</image>` を新しい `<image source="file-upload://<ID>">キャプション</image>` に置き換える
3. 画像を足すとき、減らすときは、`<columns>` の列も合わせて直す（並べ方は `notion-format.md`）

アップロードした画像は、ページに置かないと1時間ほどで消える。送ったら、すぐにページに入れる。
