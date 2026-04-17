/**
 * ══════════════════════════════════════════════════════════════
 *  GrimLily — Stripe Webhook Server
 *  サブスクリプション（銀行振込対応）用のウェブフックサーバー
 * ══════════════════════════════════════════════════════════════
 *
 *  【セットアップ】
 *
 *  1. 必要パッケージのインストール
 *     npm init -y
 *     npm install express stripe dotenv
 *
 *  2. .env ファイルを作成
 *     STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXX
 *     STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXX
 *     STRIPE_PRICE_ID=price_XXXXXXXXXXXX
 *     PORT=4242
 *
 *  3. Stripe ダッシュボードで Price を作成
 *     - 商品名: GrimLily Supporter
 *     - 金額: ¥500 / 月（recurring）
 *     - 作成された Price ID を .env に記入
 *
 *  4. ウェブフック設定
 *     ローカルテスト:
 *       stripe listen --forward-to localhost:4242/webhook
 *       → 表示される whsec_XXXX を .env に記入
 *
 *     本番:
 *       Stripe ダッシュボード → 開発者 → Webhook
 *       → エンドポイント URL: https://yourserver.com/webhook
 *       → 監視するイベント:
 *          - checkout.session.completed
 *          - invoice.paid
 *          - invoice.payment_failed
 *          - customer.subscription.deleted
 *          - payment_intent.succeeded  ← 銀行振込の確認
 *          - payment_intent.processing ← 銀行振込の処理中
 *
 *  5. サーバー起動
 *     node webhook-server.js
 *
 * ══════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 4242;

// ──────────────────────────────────────
// 静的ファイル配信（support.html など）
// ──────────────────────────────────────
app.use(express.static('public'));

// ──────────────────────────────────────
// Checkout Session 作成
// ──────────────────────────────────────
app.post('/create-checkout-session', express.json(), async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      // ── 銀行振込を含む決済方法 ──
      payment_method_types: ['card'],
      payment_method_options: {
        // 銀行振込を有効にする場合は以下を追加
        // ※ Stripe ダッシュボードで銀行振込を有効化しておく必要あり
        customer_balance: {
          funding_type: 'bank_transfer',
          bank_transfer: {
            type: 'jp_bank_transfer', // 日本の銀行振込
          },
        },
      },
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/support.html?result=success`,
      cancel_url: `${req.headers.origin}/support.html?result=cancel`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Checkout Session 作成エラー:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────
// Webhook エンドポイント
// ★ express.json() ではなく express.raw() を使う
//   → 署名検証に生の body が必要なため
// ──────────────────────────────────────
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠ 署名検証エラー:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ──────────────────────────────────────
  // イベントごとの処理
  // ──────────────────────────────────────
  switch (event.type) {

    // ── チェックアウト完了 ──
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('✅ チェックアウト完了:', session.id);
      console.log('   顧客ID:', session.customer);
      console.log('   サブスクID:', session.subscription);
      console.log('   決済状態:', session.payment_status);

      if (session.payment_status === 'paid') {
        // カード決済 → 即時完了
        // TODO: Discord 招待リンクをメールで送る
        fulfillSubscription(session);
      } else if (session.payment_status === 'unpaid') {
        // 銀行振込 → まだ入金待ち
        // payment_intent.succeeded が来るまで待つ
        console.log('⏳ 銀行振込：入金待ち');
      }
      break;
    }

    // ── 支払い成功（銀行振込の入金確認もここで通知される） ──
    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      console.log('💰 支払い成功:', intent.id);
      console.log('   金額:', intent.amount, intent.currency);
      console.log('   決済方法:', intent.payment_method_types);

      // TODO: 銀行振込の入金確認後の処理
      // Discord 招待リンクの送付など
      break;
    }

    // ── 支払い処理中（銀行振込で振込先が発行された） ──
    case 'payment_intent.processing': {
      const intent = event.data.object;
      console.log('⏳ 支払い処理中:', intent.id);
      // 振込先口座情報が発行され、ユーザーの振込を待っている状態
      break;
    }

    // ── 月次請求の支払い成功 ──
    case 'invoice.paid': {
      const invoice = event.data.object;
      console.log('📄 請求書支払い完了:', invoice.id);
      console.log('   サブスクID:', invoice.subscription);
      // 毎月の更新時にも発火する
      // → サブスク継続を確認し、Discord ロールを維持
      break;
    }

    // ── 月次請求の支払い失敗 ──
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.error('❌ 請求書支払い失敗:', invoice.id);
      console.error('   顧客ID:', invoice.customer);
      // TODO: ユーザーに決済失敗を通知
      // TODO: 一定期間後に Discord ロールを削除
      break;
    }

    // ── サブスク解約 ──
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      console.log('🚪 サブスク解約:', subscription.id);
      console.log('   顧客ID:', subscription.customer);
      // TODO: Discord ロールを削除
      break;
    }

    default:
      console.log(`📨 未処理イベント: ${event.type}`);
  }

  // Stripe に「受け取ったよ」と返す（必ず 200 を返す）
  res.json({ received: true });
});

// ──────────────────────────────────────
// フルフィルメント（サービス提供処理）
// ──────────────────────────────────────
async function fulfillSubscription(session) {
  // ここに実際の処理を書く
  // 例:
  //   1. DB にサポーター情報を保存
  //   2. Discord Bot API で招待リンクを生成
  //   3. session.customer_details.email にメール送信
  //
  // const email = session.customer_details.email;
  // await sendDiscordInvite(email);

  console.log('🎉 サポーター登録完了！');
  console.log('   メール:', session.customer_details?.email);
}

// ──────────────────────────────────────
// サーバー起動
// ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ══════════════════════════════════════
  GrimLily Webhook Server
  http://localhost:${PORT}
  ══════════════════════════════════════
  
  📌 ローカルテスト手順:
  1. 別ターミナルで stripe listen --forward-to localhost:${PORT}/webhook
  2. 表示される whsec_XXXX を .env にセット
  3. support.html から決済テスト
  `);
});
