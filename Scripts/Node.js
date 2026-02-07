// Server-side code (Node.js example)
const stripe = require('stripe')('sk_live_...');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// After successful Stripe payment
async function handleSuccessfulPayment(userId, packageId) {
    // Get package details
    const { data: package } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('id', packageId)
        .single();
    
    // Add credits to user
    await supabase.rpc('add_credits', {
        user_uuid: userId,
        credit_amount: package.credits,
        transaction_type: 'purchase',
        transaction_desc: `Purchased ${package.name} package`
    });
}