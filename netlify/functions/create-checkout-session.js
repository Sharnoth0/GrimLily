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

// ── CORS 設定 ──
// GitHub Pages（sharnoth0.github.io）から呼び出せるようにする
const ALLOWED_ORIGINS = [
  'https://sharnoth0.github.io',
  'https://grimlily.netlify.app',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || '';

  // プリフライトリクエスト（ブラウザが事前に送る確認）
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  // POST 以外は弾く
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(origin), body: 'Method Not Allowed' };
  }

  try {
    const { priceId, mode } = JSON.parse(event.body);

    // リダイレクト先は support.html があるサイト
    const returnOrigin = origin || 'https://sharnoth0.github.io';

    const session = await stripe.checkout.sessions.create({
      mode: mode || 'subscription',
      payment_method_types: ['card'],
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
      success_url: `${returnOrigin}/support.html?result=success`,
      cancel_url: `${returnOrigin}/support.html?result=cancel`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      body: JSON.stringify({ sessionId: session.id, url: session.url }),
    };

  } catch (err) {
    console.error('Checkout Session 作成エラー:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
