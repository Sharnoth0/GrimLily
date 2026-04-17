/**
 * ══════════════════════════════════════════════════════════════
 *  Stripe Webhook ハンドラ（Netlify Function）
 * ══════════════════════════════════════════════════════════════
 *
 *  Stripe から決済イベント（成功・失敗・解約など）の通知を受け取る。
 *  呼ばれたときだけ起動するサーバーレス関数。
 *
 *  環境変数（Netlify ダッシュボードで設定）:
 *    STRIPE_SECRET_KEY
 *    STRIPE_WEBHOOK_SECRET
 *
 *  Stripe ダッシュボードの Webhook URL:
 *    https://あなたのサイト.netlify.app/webhook
 *
 *  監視するイベント:
 *    - checkout.session.completed
 *    - payment_intent.succeeded
 *    - payment_intent.processing
 *    - invoice.paid
 *    - invoice.payment_failed
 *    - customer.subscription.deleted
 *
 * ══════════════════════════════════════════════════════════════
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // POST 以外は弾く
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ──────────────────────────────────────
  // 署名検証
  // Netlify Functions では event.body が文字列で渡される
  // Base64 の場合はデコードする
  // ──────────────────────────────────────
  const sig = event.headers['stripe-signature'];
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠ 署名検証エラー:', err.message);
    return {
      statusCode: 400,
      body: `Webhook signature verification failed: ${err.message}`,
    };
  }

  // ──────────────────────────────────────
  // イベントごとの処理
  // ──────────────────────────────────────
  switch (stripeEvent.type) {

    // ── チェックアウト完了 ──
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object;
      console.log('✅ チェックアウト完了:', session.id);
      console.log('   顧客ID:', session.customer);
      console.log('   サブスクID:', session.subscription);
      console.log('   決済状態:', session.payment_status);

      if (session.payment_status === 'paid') {
        // カード決済 → 即時完了
        await fulfillSubscription(session);
      } else if (session.payment_status === 'unpaid') {
        // 銀行振込 → まだ入金待ち
        // payment_intent.succeeded が来るまで待つ
        console.log('⏳ 銀行振込：入金待ち');
      }
      break;
    }

    // ── 支払い成功（銀行振込の入金確認もここ） ──
    case 'payment_intent.succeeded': {
      const intent = stripeEvent.data.object;
      console.log('💰 支払い成功:', intent.id);
      console.log('   金額:', intent.amount, intent.currency);

      // TODO: 銀行振込の入金確認後の処理
      // Discord 招待リンクの送付など
      break;
    }

    // ── 支払い処理中（銀行振込で振込先が発行された） ──
    case 'payment_intent.processing': {
      const intent = stripeEvent.data.object;
      console.log('⏳ 支払い処理中:', intent.id);
      break;
    }

    // ── 月次請求の支払い成功 ──
    case 'invoice.paid': {
      const invoice = stripeEvent.data.object;
      console.log('📄 請求書支払い完了:', invoice.id);
      console.log('   サブスクID:', invoice.subscription);
      // 毎月の更新時にも発火
      // → サブスク継続を確認し、Discord ロールを維持
      break;
    }

    // ── 月次請求の支払い失敗 ──
    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object;
      console.error('❌ 請求書支払い失敗:', invoice.id);
      console.error('   顧客ID:', invoice.customer);
      // TODO: ユーザーに決済失敗を通知
      // TODO: 一定期間後に Discord ロールを削除
      break;
    }

    // ── サブスク解約 ──
    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object;
      console.log('🚪 サブスク解約:', subscription.id);
      console.log('   顧客ID:', subscription.customer);
      // TODO: Discord ロールを削除
      break;
    }

    default:
      console.log(`📨 未処理イベント: ${stripeEvent.type}`);
  }

  // Stripe に「受け取ったよ」と返す
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ received: true }),
  };
};

// ──────────────────────────────────────
// フルフィルメント（サービス提供処理）
// ──────────────────────────────────────
async function fulfillSubscription(session) {
  // ここに実際の処理を書く
  // 例:
  //   1. Discord Bot API で招待リンクを生成
  //   2. session.customer_details.email にメール送信
  //   3. DB やスプレッドシートにサポーター情報を記録
  //
  // const email = session.customer_details.email;
  // await sendDiscordInvite(email);

  console.log('🎉 サポーター登録完了！');
  console.log('   メール:', session.customer_details?.email);
}
