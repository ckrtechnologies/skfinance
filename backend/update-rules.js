const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // 1. Fetch current lenders
  const { data: lenders, error } = await supabase.from('lenders').select('id, code, rules');
  if (error) {
    console.error('Error fetching lenders:', error);
    return;
  }

  for (const lender of lenders) {
    let rules = lender.rules;

    if (lender.code === 'sk-finance') {
      // Fix SK Finance rules
      for (const product in rules.products) {
        rules.products[product].ageRange = { min: 21, max: 65 };
        rules.products[product].loanRange = { min: 100000, max: 1500000 };
        if (product === 'new_car') {
          rules.products[product].minCibil = 650;
          rules.products[product].cibilNegativeAccepted = true;
        }
      }
    } else if (lender.code === 'iti-finance') {
      // Fix ITI Finance rules
      for (const product in rules.products) {
        rules.products[product].coApplicant.required = false; // Co-Applicant is optional
        // The rule says any 2 of PAN, Aadhaar, Voter ID.
        // We will represent this in the UI as two generic slots for ITI Finance.
        rules.products[product].coApplicant.docs = ["kyc_any_doc_1", "kyc_any_doc_2"];
      }
    }

    // Update DB
    const { error: updateError } = await supabase
      .from('lenders')
      .update({ rules })
      .eq('id', lender.id);

    if (updateError) {
      console.error(`Failed to update ${lender.code}:`, updateError);
    } else {
      console.log(`Successfully updated ${lender.code}`);
    }
  }
}

run();
