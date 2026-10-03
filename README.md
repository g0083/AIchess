# 将棋盤チェス — PWA Chess

対戦も、学習も。ブラウザだけで動くチェスアプリです。
インストール（PWA）すれば、**AI対戦・オフライン2人・全学習モードが通信なしで遊べます**。

ゲーム内の表示はすべて日本語です。コード・コメント・この README は英語です。

---

## 主な機能

### 対戦モード

| モード | 概要 |
|---|---|
| **AI対戦** | 8段階の難易度＋カスタム。性格6種、ヒント4段階、毎手の評価による失点手の指摘 |
| **オフライン2人** | 同じ端末で2人。時計・盤反転・引き分け・投了 |
| **P2P対戦** | サーバを経由せず端末どうしで直接接続。QRで参加、チャット付き |
| **検討** | FEN / PGN を読み込んで評価グラフと候補手を表示 |

### AI の強さ制御

難易度は「探索量」だけの数値ではありません。以下を組み合わせます。

- **探索量** — `go depth` / `go movetime` / `go nodes`
- **MultiPV からの弱い手の混ぜ込み** — 最善手から一定評価差の手を、確率 p で選ぶ
- **Innovation（温度）** — 候補集合の選択に幅を持たせる
- **性格** — 6種（堅実／攻撃的／保守的／大胆／長線／交換的）

この設計により、初級のAIは「2手目にロークを引いてクイーンを渡す」のではなく、
**脅威を見落として負ける** 初心者の手を再現します。

エンジンは **Stockfish 19 (WebAssembly)** です。

- **軽量版（約1.8MB）** — 既定。単一スレッド、CORSヘッダ不要、**オフライン動作**
- **フル版（約99MB）** — 設定画面から任意でダウンロード。最上級／最強の段Corsと
  詳細な検討が使えるようになります（precacheには入らないため、初期ロードは軽いまま）

### P2P と QR

- 部屋は **Trystero（WebRTC）** 製。Nostr を主リレー、BitTorrent を副リレーとして
  同時に張り、片方が壊れても部屋は成立します。**自前のサーバは不要**です。
- **同期はホスト権威方式**。ゲストは手を送出するだけの「提案」を行い、
  ホストが `chess.js` で検証して FEN を配信します。ずれが起きようがありません。
- **QRには参加URLを入れています**。通常のQRコードリーダー（カメラの標準機能でも可）
  で読み取るだけで、そのまま対戦に参加できます。
- **アプリ内スキャナ**（PWAインストール後向け） — `BarcodeDetector` を使い、
  非対応ブラウザでは `jsQR` にフォールバックします。手動入力も常に利用できます。

### 公開リンクの設定

公開URLは**ビルドし直さずに変更**できます。優先順位：

1. 設定画面での指定（localStorage）
2. `public/app-config.json` の `publicOrigin` ← **サーバ上で書き換えれば反映されます**
3. `VITE_PUBLIC_ORIGIN`（ビルド時環境変数）
4. ブラウザの現在地（最後の保険）

参加URLの形式： `<origin>/?room=<CODE>&join=1#p2p`
クエリがハッシュより前にあるため、**どの静的ホストでもそのまま動きます**。

### レスポンシブ

盤面は `ResizeObserver` でコンテナに追従する正方形です。ビューポート単位の
サイズ指定を使わないので、320pxの携帯から横向きのタブレット、超ワイドまで
崩れません。`dvh` と `safe-area-inset` により、モバイルのツールバーが
開閉しても盤面は切れません。

| 幅 | レイアウト |
|---|---|
| ≥1280px | 3列（プレイヤー / 盤面 / サイドパネル） |
| 768–1279px | 2列（盤面 / ドロワー） |
| <768px | 1列（サイドパネルはボトムシート） |
| 横向き・低-height | コンパクト2列 |

### 学習モード

9段階のクラス構成。レッスンごとに「解説 → 盤上練習 → 確認問題」。
用語集（`src/content/glossary.ts`）が全体の用語を1か所にまとめているため、
レッスン・パズル・解説で同じ言葉が使われます。

---

## 技術構成

- **Vite 8 + React 19 + TypeScript**
- **`chess.js`** — ルール・SAN/FEN/PGN
- **`@lichess-org/chessground`** — 盤面UI
- **自作SVG駒セット** — 絵文字・Unicodeチェス記号は一切不使用
- **Stockfish 19 WASM** — オフライン対応のlite版と任意のフル版
- **`trystero`** — WebRTC P2P
- **`vite-plugin-pwa` (Workbox)** — precache + ランタイムキャッシュ
- **システム日本語フォントのみ** — Webフォントのダウンロードなし。常に即座に表示され、
  オフラインでも文字化けしません

---

## セットアップ

```bash
npm install
npm run dev          # 開発サーバー（エンジンを public/ へ配置してから起動）
npm run build        # 型チェック + 本番ビルド
npm run preview      # dist/ を配信して PWA を実機確認
npm run verify       # コンテンツ検証 + パズル検証 + ユニットテスト
```

### サブパス配信の確認（GitHub Pages 向け）

GitHub Pages はリポジトリを `/AIChess/` に配置します。ルート配信を前提にした
不具合を出さないよう、実際のビルド成果物をその構成で配信して検証します。

```bash
npm run build
node scripts/serve-subpath.mjs /AIChess 4174
# -> [serve] OK - all 15 assets resolve under /AIChess
```

---

## 公開

### GitHub Pages

`.github/workflows/deploy.yml` が `master` への push で自動デプロイします。

**初回のみ、手動でひとつだけ設定が必要です。** Pages は一度有効化しないと
ワークフローが動きません。

1. `https://github.com/g0083/AIchess/settings/pages` を開く
2. **Build and deployment → Source** を **GitHub Actions** に変更して保存

これだけで `master` への push で自動デプロイされます。
Pages が未有効の場合、ワークフローは失敗画面に手順の URL を表示します。

- 公開URL: `https://g0083.github.io/AIChess/`
- 反映: `git push -u origin master`
- 手動で再実行: Actions タブ → Deploy to GitHub Pages → Run workflow

ワークフローの中で `npm run verify` とサブパス検証が走ります。
壊れたパズルや壊れた日本語が本番に届くことはありません。

設定を変えたい場合（公開ドメインやサブパスの変更など）は、
`public/app-config.json` の `publicOrigin` を書き換えて push するだけです。
再ビルドは不要です。

### Cloudflare Pages（フォールバック）

- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Environment variables**: `NODE_VERSION=22`

`base` は `'./'`（相対パス）なので、ルート配信でもサブパス配信でも
どちらでもそのまま動作します。 Pages で動かなかった場合に
ビルド設定を変えずに切り替えられます。

### 注意事項

- **HTTPS 必須** — Service Worker とカメラ（QR読み取り）の要件です。
  GitHub Pages も Cloudflare Pages も既定で HTTPS です。
- `dist/` に engines、`public/` に icons は生成物のため `.gitignore` 済みです。
  CI が `npm install` 後に自動生成します。

---

## 品質ゲート

Contenu のみ、投资しただけでは終わりません。機械的に検証します。

```bash
npm run verify          # 以下をすべて実行
npm run verify:content  # 日本語テキストの破損・FENの不正・解答手の合法性を検査
npm run verify:puzzles  # 解答が Stockfish の最善手と一致するかを検査
npm test                # 61 unit tests
```

`verify:puzzles` は実パズルの正解手を Stockfish で割ります。
解説が間違っていればテストが落ちます。

補助スクリプト：

```bash
npm run icons           # PWA用アイコンを再生成
npm run preview:pieces  # 駒の絵を contact sheet として書き出し
node scripts/balance.mjs  # 括弧の対応を検査
```

---

## ライセンス

**GPL-3.0** — chessground と Stockfish が GPL-3.0 のためです。

## 既知の制限

- カメラでのQR読み取りには **HTTPS** が必要です。判定して、手動入力を案内します
- P2P は公開リレーに依存します。切断時は UI に明示し、再接続と副リレー切替を行います
- フル版エンジンは初回のみダウンロードが必要です
- 学習モードのコンテンツは段階的に拡張予定です。
  現時点で本文・戦術パズル・用語集が動作します。定石は準備中です。


## ライセンス表記

- 駒: 本プロジェクトによるオリジナルSVG（`src/chess/pieces.ts`）
- 盤面の描画: `chessground` 由来
- エンジンは GPL-3.0、使用許諾条件は Stockfish の配布に準じます