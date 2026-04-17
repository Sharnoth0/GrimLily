const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // POSTメソッド以外は弾く
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    // Netlifyはevent.bodyに生のデータが入っているので、そのまま署名検証に使えるわ！
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠ 署名検証エラー:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // ──────────────────────────────────────
  // イベントごとの処理（ログ出し）
  // ──────────────────────────────────────
  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object;
      console.log('✅ チェックアウト完了:', session.id);
      
      if (session.payment_status === 'paid') {
        console.log('🎉 サポーター登録完了！(カード決済)');
      } else if (session.payment_status === 'unpaid') {
        console.log('⏳ 銀行振込：入金待ち');
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const intent = stripeEvent.data.object;
      console.log('💰 支払い成功:', intent.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object;
      console.log('🚪 サブスク解約:', subscription.id);
      break;
    }

    default:
      console.log(`📨 未処理イベント: ${stripeEvent.type}`);
  }

  // Stripeに「ちゃんと受け取ったよ！」と200番を返す（これ超重要）
  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
