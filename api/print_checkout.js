// Create a Stripe Checkout session for a $100 print order
// Expects POST JSON with shipping/contact info and success/cancel URLs
// Requires env STRIPE_SECRET_KEY. No SDK dependency; uses Stripe REST API.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY environment variable' });

  try {
    const bodyStr = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data || '{}'));
      req.on('error', reject);
    });
    let body = {};
    try { body = JSON.parse(bodyStr); } catch(_) { body = {}; }

    const {
      contact_name,
      phone,
      email,
      address1,
      address2,
      city,
      state,
      postal,
      country,
      success_url,
      cancel_url,
      price_usd_cents
    } = body;

    const unitAmount = Number.isFinite(price_usd_cents) ? price_usd_cents : 10000; // default $100
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', String(success_url || 'https://example.com/?print=success'));
    form.set('cancel_url', String(cancel_url || 'https://example.com/?print=cancel'));
    form.set('phone_number_collection[enabled]', 'true');
    // Collect shipping address in Checkout
    const allowed = ['US','CA','CN','HK','JP','TW','GB','DE','FR','ES','IT','NL','SE','AU','NZ','SG','KR'];
    allowed.forEach((c, i) => form.set(`shipping_address_collection[allowed_countries][${i}]`, c));

    // Single line item at $100
    form.set('line_items[0][price_data][currency]', 'usd');
    form.set('line_items[0][price_data][product_data][name]', '3D Model Print');
    form.set('line_items[0][price_data][unit_amount]', String(unitAmount));
    form.set('line_items[0][quantity]', '1');

    // Optional prefill
    if (email) form.set('customer_email', String(email));

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });
    const txt = await resp.text();
    let json = {}; try { json = JSON.parse(txt); } catch(_) {}
    if (!resp.ok) {
      const message = (json && (json.error && json.error.message)) || txt || 'Stripe Checkout session creation failed';
      return res.status(resp.status || 500).json({ error: 'Payment Error', message });
    }

    return res.status(200).json({ id: json.id, url: json.url });
  } catch (e) {
    return res.status(500).json({ error: 'Internal Server Error', message: String(e && e.message || e) });
  }
}