require('dotenv').config();
const { createLender, createPolicy, publishPolicy } = require('../src/domains/lenders/service');

async function run() {
  try {
    const db = require('../src/config/database');
    
    // Find existing lender by name or code
    let lenderId;
    const { data: existingLenders } = await db.from('lenders')
      .select('id')
      .or('code.eq.SK_FINANCE,code.eq.SKF,name.eq.SK Finance')
      .limit(1);
      
    if (existingLenders && existingLenders.length > 0) {
      lenderId = existingLenders[0].id;
      console.log('Using existing lender ID:', lenderId);
      // Clean up existing policies for this lender to avoid duplicates
      await db.from('lender_policies').delete().eq('lender_id', lenderId);
    } else {
      // Delete any leftover SK_FINANCE code lender
      await db.from('lenders').delete().eq('code', 'SK_FINANCE');
      
      const lender = await createLender({
        name: 'SK Finance',
        code: 'SK_FINANCE',
        lender_type: 'nbfc',
        priority: 10
      });
      lenderId = lender.id;
      console.log('Created new lender:', lenderId);
    }

    // 2. Create Policy (Draft)
    const policyPayload = {
      lender_id: lenderId,
      effective_from: new Date().toISOString().split('T')[0],
      product_type: 'new_car',
      min_loan_amount: 100000,
      max_loan_amount: 1500000,
      ltv_min: 80,
      ltv_max: 90,
      min_age: 21,
      max_age: 65,
      min_cibil: -1,
      cibil_negative_accepted: true,
      preferred_cibil: 650,
      customer_types: ['salaried', 'self_employed', 'agriculture'],
      co_applicant_required: true,
      co_applicant_relations: ['father', 'mother', 'husband', 'wife', 'son', 'daughter', 'brother', 'unmarried_sister'],
      ownership_proof_rules: [
        {
          allowed_parties: ['applicant', 'co_applicant', 'family'],
          allowed_documents: ['electricity_bill', 'khatauni', 'property_registry']
        }
      ],
      conditional_rules: [
        {
          trigger: "applicant.address_type == 'rental'",
          requires: ['home_town_field_visit', 'home_town_ownership_docs', 'local_guarantor'],
          guarantor_docs: ['pan', 'aadhaar', 'electricity_bill', 'khatauni'],
          excluded_docs: ['property_registry']
        },
        {
          trigger: "co_applicant.relation == 'sibling'",
          requires: [],
          guarantor_docs: [],
          excluded_docs: [],
          must_satisfy: "co_applicant.marital_status != 'married'",
          error_message: 'Married Sister is not accepted as a co-applicant.'
        }
      ],
      policy_documents: [
        // Applicant
        { party: 'applicant', doc_type: 'pan', is_mandatory: true },
        { party: 'applicant', doc_type: 'aadhaar', is_mandatory: true, selection_group: 'id_proof', min_required_in_group: 1 },
        { party: 'applicant', doc_type: 'voter_id', is_mandatory: true, selection_group: 'id_proof', min_required_in_group: 1 },
        { party: 'applicant', doc_type: 'bank_statement_6m', is_mandatory: true },
        { party: 'applicant', doc_type: 'passport_photo', is_mandatory: true, photo_count: 2 },
        // Co-Applicant
        { party: 'co_applicant', doc_type: 'pan', is_mandatory: true, selection_group: 'co_app_id', min_required_in_group: 2 },
        { party: 'co_applicant', doc_type: 'aadhaar', is_mandatory: true, selection_group: 'co_app_id', min_required_in_group: 2 },
        { party: 'co_applicant', doc_type: 'voter_id', is_mandatory: true, selection_group: 'co_app_id', min_required_in_group: 2 },
        { party: 'co_applicant', doc_type: 'passport_photo', is_mandatory: true, photo_count: 2 }
      ]
    };

    const policy = await createPolicy(policyPayload);
    console.log('Created policy:', policy.id);

    // 3. Get an admin profile
    const { data: profile } = await db.from('profiles').select('id').eq('role', 'admin').limit(1).single();
    if (!profile) throw new Error("No admin profile found");

    // 4. Publish Policy
    const published = await publishPolicy(policy.id, profile.id, null); // passing null for auditRepo for simplicity, hope it handles it or I'll mock it
    console.log('Published policy:', published.id);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
