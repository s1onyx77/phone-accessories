const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const event = req.body;

  try {
    // Handle checkout session payment paid event
    if (event.data.attributes.type === 'checkout_session.payment.paid') {
      const checkoutSessionId = event.data.attributes.data.id;

      // Update Order Status in Supabase
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('checkout_session_id', checkoutSessionId);

      if (error) throw error;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
