const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // POSTメソッド以外は弾く
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 呼び出し元のURL（あんたのサイト）を取得
    const origin = event.headers.origin || event.headers.referer || 'https://grimlily.netlify.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      payment_method_options: {
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
      // 成功時・キャンセル時の戻り先URL
      success_url: `${origin}/support.html?result=success`,
      cancel_url: `${origin}/support.html?result=cancel`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id, url: session.url }),
    };
  } catch (err) {
    console.error('Checkout Session 作成エラー:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
