# cosme_chat - コスメコンシェルジュ AI チャットボット

## 概要
コスメスキャナーPWA (cosme.links-create.co.jp) に埋め込むAIチャットボット。
GPT-4o + n8nバックエンドで、商品検索・価格比較・成分分析・肌相性判定・トレンド取得を行う。

## アーキテクチャ
```
cosme.links-create.co.jp (既存PWA)
  ├── <script src="/chat/widget.js"> でフローティングボタン追加
  └── /chat/* → Nginx → localhost:3004 (Next.js 14.2.3, basePath: '/chat')
        ├── /chat/widget   ← iframe埋め込みページ
        ├── /chat/api/chat ← GPT-4o ストリーミングAPI（5ツール）
        └── /chat/widget.js ← フローティングボタンスクリプト
```

## 技術スタック
- Next.js 14.2.3 (App Router)
- Vercel AI SDK (`ai` + `@ai-sdk/openai`)
- GPT-4o (streamText + tool)
- ReactMarkdown + rehype-raw (カスタムHTMLタグ描画)
- Tailwind CSS (くすみピンクテーマ #b84d73)
- n8n Webhookバックエンド (localhost:5678)

## ツール定義（5個）
1. **searchCosmeProducts** - 商品検索（高速版、20秒）
2. **getProductDetails** - 商品詳細+AI口コミ要約（フル版、55秒）
3. **getTrendingProducts** - Xトレンド商品（静的JSON読込）
4. **analyzeSkinCompatibility** - 肌相性判定（compatibility.ts）
5. **comparePrices** - 価格比較（楽天/Yahoo!/Amazon）

## カスタムカードコンポーネント（5種）
- `<ProductCard>` - 商品情報カード
- `<PriceCard>` - 価格比較テーブル（アフィリエイトリンク付き）
- `<IngredientCard>` - 成分分析（注目/注意/NG）
- `<CompatCard>` - 肌相性スコア（0-100）
- `<TrendingCard>` - トレンド商品リスト

## インフラ
- systemd: `cosme-chat.service` (port 3004)
- Nginx: `/etc/nginx/sites-enabled/cosme` 内の `/chat/*` ブロック
- 環境変数: `.env.local` (OPENAI_API_KEY, RAKUTEN_*, YAHOO_CLIENT_ID)

## 開発コマンド
```bash
npm run dev       # 開発サーバー（port 3000）
npm run build     # 本番ビルド
npm run start     # 本番起動（systemd経由推奨）

# サービス管理
systemctl restart cosme-chat
systemctl status cosme-chat
journalctl -u cosme-chat -f
```

## postMessage通信（親PWA↔iframe）
- 親→iframe: `cosme-chat-init` (skinProfile, currentProduct), `cosme-product-update`
- iframe→親: `cosme-chat-ready`, `cosme-chat-close`, `cosme-chat-search`

## 料金プラン（将来）
- Phase A（現在）: 無料 + アフィリエイト
- Phase B: Plus ¥390/月（AI会話20回/月）
- Phase C: Pro ¥780/月（無制限 + プレミアム機能）
