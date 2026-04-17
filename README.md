# GrimLily Support — Netlify セットアップガイド

## フォルダ構成

```
grimlily-netlify/
├── netlify.toml                          ← Netlify の設定ファイル
├── package.json                          ← stripe パッケージの依存定義
├── public/
│   └── support.html                      ← 支援ページ（静的ファイル）
└── netlify/
    └── functions/
        ├── create-checkout-session.js     ← 決済セッション作成
        └── webhook.js                     ← Stripe からの通知受け取り
```

## 仕組み

```
ファンが「サポーターになる」を押す
    ↓
create-checkout-session.js が起動（数秒だけ）
    ↓
Stripe の決済ページへ飛ぶ
    ↓
支払い完了（カードなら即時、銀行振込なら数日後）
    ↓
Stripe が webhook.js を叩く（数秒だけ起動）
    ↓
「支払い成功！」の処理を実行
```

関数は呼ばれたときだけ起動して、処理が終わったら消える。
24時間動きっぱなしのサーバーは不要。

---

## 手順①：Stripe の準備

1. https://dashboard.stripe.com にログイン

2. **商品を作成する**
   「商品」→「商品を追加」で以下を作成：

   | 商品名 | 金額 | 種類 |
   |---|---|---|
   | GrimLily Light | ¥500/月 | 継続（recurring） |
   | GrimLily Supporter | ¥3,000/月 | 継続 |
   | GrimLily Backer | ¥5,000/月 | 継続 |
   | GrimLily Patron | ¥10,000/月 | 継続 |
   | GrimLily Boost | 顧客の選択による価格 | 一回限り |

   → 各商品に `price_XXXX` という ID が発行される。メモしておく。

3. **銀行振込を有効化**
   「設定」→「決済手段」→「銀行振込（Japan Bank Transfer）」をオン

4. **API キーを確認**
   「開発者」→「API キー」で以下をメモ：
   - シークレットキー（`sk_test_XXXX`）

---

## 手順②：Netlify にデプロイ

### A. GitHub 経由（おすすめ）

1. このフォルダを GitHub リポジトリにプッシュ
2. https://app.netlify.com にログイン
3. 「Add new site」→「Import an existing project」
4. GitHub リポジトリを選択
5. ビルド設定はそのまま（netlify.toml が自動で読まれる）
6. 「Deploy」を押す

### B. 手動アップロード

1. https://app.netlify.com にログイン
2. 「Add new site」→「Deploy manually」
3. このフォルダ全体をドラッグ＆ドロップ

---

## 手順③：環境変数を設定

Netlify ダッシュボード → サイト設定 → 「Environment variables」で以下を追加：

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_XXXXXXXXXXXX`（Stripe の API キー） |
| `STRIPE_WEBHOOK_SECRET` | `whsec_XXXXXXXXXXXX`（手順④で取得） |

---

## 手順④：Webhook を登録

1. Stripe ダッシュボード →「開発者」→「Webhook」
2. 「エンドポイントを追加」
3. URL: `https://あなたのサイト.netlify.app/webhook`
4. 監視するイベントを選択：
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.processing`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. 作成後、「署名シークレット」（`whsec_XXXX`）が表示される
6. → 手順③の `STRIPE_WEBHOOK_SECRET` に設定

---

## 手順⑤：Price ID を記入

`public/support.html` の中にある `priceMap` を、
手順①でメモした Price ID に書き換える：

```javascript
const priceMap = {
  light:     'price_ここにLightのID',
  supporter: 'price_ここにSupporterのID',
  backer:    'price_ここにBackerのID',
  patron:    'price_ここにPatronのID',
  boost:     'price_ここにBoostのID',
};
```

書き換えたら、再度 GitHub にプッシュ（またはファイルを再アップロード）。

---

## テスト方法

1. サイトの support.html を開く
2. 「サポーターになる」を押す
3. テスト用カード番号 `4242 4242 4242 4242` で決済
   （有効期限は未来の日付、CVC は適当な3桁でOK）
4. Netlify ダッシュボード →「Functions」→ ログを確認
   「✅ チェックアウト完了」と出ていれば成功

---

## 本番に切り替え

テストが通ったら：

1. Stripe ダッシュボードのテストモードをオフ
2. 本番用の API キー（`sk_live_XXXX`）を Netlify の環境変数に差し替え
3. 本番用の Webhook エンドポイントを登録（テスト用とは別）
4. 本番の `whsec_XXXX` も環境変数に差し替え
5. support.html の `priceMap` も本番用の Price ID に差し替え

---

## ログの確認方法

Netlify ダッシュボード → 該当サイト →「Functions」タブ
各関数のログがリアルタイムで確認できる。
webhook.js の console.log がここに出る。

---

## FAQ

**Q: 無料枠で足りる？**
月125,000リクエスト。サブスク登録 + 月次更新 + Boost で
数百人規模なら余裕。

**Q: 関数が遅い？**
初回起動（コールドスタート）に1〜2秒かかることがある。
Stripe は webhook のレスポンスを最大20秒待つので問題なし。

**Q: ローカルでテストしたい**
`npm install -g netlify-cli` して `netlify dev` で
ローカルにサーバーが立つ。Stripe CLI と組み合わせて：
```
netlify dev
stripe listen --forward-to localhost:8888/webhook
```
