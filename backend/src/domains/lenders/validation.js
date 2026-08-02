'use strict';
const { z } = require('zod');

const lenderSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).toUpperCase(),
  lender_type: z.enum(['nbfc', 'bank']).default('nbfc'),
  priority: z.number().int().min(1).default(10),
  is_active: z.boolean().default(true),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  logo_url: z.string().url().optional(),
  notes: z.string().optional(),
});

const policyDocSchema = z.object({
  party: z.enum(['applicant', 'co_applicant', 'guarantor']),
  doc_type: z.string().min(1),
  is_mandatory: z.boolean().default(true),
  selection_group: z.string().optional().nullable(),
  min_required_in_group: z.number().int().optional().nullable(),
  photo_count: z.number().int().optional().nullable(),
  bank_statement_months: z.number().int().optional().nullable(),
  notes: z.string().optional(),
});

const policySchema = z.object({
  lender_id: z.string().uuid(),
  product_type: z.enum(['new_car', 'used_car', 'commercial_vehicle']),
  version: z.number().int().min(1).default(1),
  effective_from: z.string(), // date string
  min_loan_amount: z.number().positive(),
  max_loan_amount: z.number().positive(),
  ltv_min: z.number().optional().nullable(),
  ltv_max: z.number().optional().nullable(),
  min_age: z.number().int().min(18),
  max_age: z.number().int().max(100),
  min_cibil: z.number().int().optional().nullable(),
  cibil_negative_accepted: z.boolean().default(false),
  preferred_cibil: z.number().int().optional().nullable(),
  customer_types: z.array(z.enum(['salaried', 'self_employed', 'agriculture'])).default([]),
  co_applicant_required: z.boolean().default(false),
  co_applicant_relations: z.array(z.string()).default([]),
  ownership_proof_rules: z.array(z.any()).default([]),
  conditional_rules: z.array(z.any()).default([]),
  reference_doc_url: z.string().optional().nullable(),
  notes: z.string().optional(),
  policy_documents: z.array(policyDocSchema).default([]),
});

module.exports = { lenderSchema, policySchema, policyDocSchema };
