const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { productId, buyerId, amount, lineItems } = req.body;

  try {
    // 1. Create PayMongo Checkout Session
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method_types: ['gcash', 'card', 'paymaya'],
            line_items: lineItems,
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: `Purchase for Product ID: ${productId}`
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Failed to create PayMongo Checkout');
    }

    // 2. Log Pending Transaction in Supabase
    const { error: dbError } = await supabase.from('orders').insert([
      {
        checkout_session_id: data.data.id,
        product_id: productId,
        buyer_id: buyerId,
        amount: amount,
        status: 'pending'
      }
    ]);

    if (dbError) throw dbError;

    return res.status(200).json({ checkoutUrl: data.data.attributes.checkout_url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
