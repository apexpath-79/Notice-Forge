'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function saveOrderToSupabase(orderData: {
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  productType: string;
  amountPaid: number;
  stripeSessionId?: string;
}) {
  try {
    const { data, error } = await supabase.from('orders').insert([
      {
        customer_email: orderData.customerEmail,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone || null,
        product_type: orderData.productType,
        amount_paid: orderData.amountPaid,
        stripe_session_id: orderData.stripeSessionId || 'test_session',
      },
    ]);

    if (error) {
      console.error('Supabase Insert Error:', error);
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to save order:', err);
    return { success: false, error: err.message };
  }
}