/**
 * ══════════════════════════════════════════════
 *  Checkout Session 作成（Netlify Function）
 * ══════════════════════════════════════════════
 *
 *  support.html の「サポーターになる」ボタンから呼ばれる。
 *  Stripe Checkout のセッションを作成し、決済ページの URL を返す。
 *
 *  環境変数（Netlify ダッシュボードで設定）:
 *    STRIPE_SECRET_KEY
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // POST 以外は弾く
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { priceId, mode } = JSON.parse(event.body);

    // サイトの URL を取得（リダイレクト先に使う）
    const origin = event.headers.origin || event.headers.referer?.replace(/\/[^/]*$/, '') || 'https://あなたのサイト.netlify.app';

    const session = await stripe.checkout.sessions.create({
      mode: mode || 'subscription',
      payment_method_types: ['card'],
      // ── 銀行振込を有効にする場合 ──
      // Stripe ダッシュボードで銀行振込を有効化しておくこと
      payment_method_options: {
        customer_balance: {
          funding_type: 'bank_transfer',
          bank_transfer: {
            type: 'jp_bank_transfer',
          },
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/support.html?result=success`,
      cancel_url: `${origin}/support.html?result=cancel`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, url: session.url }),
    };

  } catch (err) {
    console.error('Checkout Session 作成エラー:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
