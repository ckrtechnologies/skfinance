# SCHEMA.md — Shreeja Finance Platform
**Version:** v2.0 · **Date:** 02 Aug 2026 · **Companions:** PRD.md v2.0, ARCHITECTURE.md v1.0
Follows `ckr-mobile-project-process/references/schema-template.md` conventions: snake_case, uuid PKs, `created_at`/`updated_at` + trigger on every table, RLS on every table no exceptions, append-only pattern for audit-sensitive tables, migrations only (never dashboard edits, never modify an applied migration).

---

## 1. Enums

| Enum | Values |
|---|---|
| `user_role` | customer, dealer, staff, admin |
| `product_type` | new_car, used_car, commercial_vehicle |
| `loan_stage` | cibil, bank, valuation, fi, approval, disbursement |
| `application_status` | draft, in_progress, approved, blocked_90d, disbursed, rejected, cancelled |
| `evaluation_result` | eligible, not_eligible, incomplete |
| `policy_status` | draft, active, retired |
| `commission_status` | earned, payout_pending, paid |
| `ledger_entry_type` | commission_earned, payout, adjustment |
| `withdrawal_status` | requested, processed, rejected |
| `customer_type` | salaried, self_employed, agriculture |

## 2. Tables

### Identity & parties
| Table | Purpose | Key columns beyond standard |
|---|---|---|
| `profiles` | One row per auth user, role + common fields | `auth_user_id` (FK supabase auth), `role user_role`, `full_name`, `phone` |
| `customers` | Customer party data | `profile_id`, address fields, `address_type` (owned/rental), `customer_type`, `dob`, `cibil_score` (int, −1 allowed) |
| `dealers` | Channel partners | `profile_id`, `dealer_code`, KYC fields, bank details (for manual payout reference), `is_active` |
| `staff` | Staff accounts (app + panel share this) | `profile_id`, `staff_code`, `is_active` |

### Lenders & policies (new in v2 — the engine's data)
| Table | Purpose | Key columns |
|---|---|---|
| `lenders` | NBFC/bank partners | `name`, `code` (unique), `lender_type`, contact fields, `priority` (int, lower = preferred), `is_active`, `logo_url` |
| `lender_policies` | Versioned policy per lender × product | `lender_id` FK, `product_type`, `version` (int), `effective_from`, `effective_to` (null = current), `status policy_status`, `min_loan_amount`, `max_loan_amount`, `ltv_min`, `ltv_max`, `min_age`, `max_age`, `min_cibil` (nullable = no hard floor), `cibil_negative_accepted` bool, `preferred_cibil` (nullable), `customer_types customer_type[]`, `co_applicant_required` bool, `co_applicant_relations text[]`, `ownership_proof_rules jsonb`, `conditional_rules jsonb`, `reference_doc_url` (uploaded source sheet, audit only), `notes` |
| `policy_documents` | Document requirements per policy | `policy_id` FK, `party` (applicant/co_applicant/guarantor), `doc_type`, `is_mandatory` bool, `selection_group` (nullable), `min_required_in_group` (nullable), `photo_count` (nullable), `bank_statement_months` (nullable) |
| `eligibility_evaluations` | **Append-only.** One row per evaluation attempt per lender | `loan_application_id` FK, `lender_policy_id` FK (pins exact version), `stage` (pre_check/full), `result evaluation_result`, `failed_rules jsonb`, `missing_items jsonb`, `evaluated_at`. No updates ever — re-evaluation inserts. |

`conditional_rules` jsonb shape (array of trigger blocks):
```json
[{ "trigger": "applicant.address_type == 'rental'",
   "requires": ["home_town_field_visit","home_town_ownership_docs","landlord_electricity_bill","local_guarantor"],
   "guarantor_docs": ["pan","aadhaar","electricity_bill_or_khatauni"],
   "excluded_docs": ["property_registry"] }]
```
The evaluator (`domains/eligibility-engine/rule-evaluator.js`) is the only interpreter of this shape.

### Loan pipeline
| Table | Purpose | Key columns |
|---|---|---|
| `loan_applications` | One row per file | `application_no` (human-readable), `customer_id`, `created_by_profile_id`, `dealer_id` (nullable — L10 one dealer max), `staff_id` (nullable), `product_type`, `vehicle_details jsonb`, `requested_amount`, `approved_amount` (nullable), `disbursed_amount` (nullable), `submitted_lender_id` (nullable), `current_stage loan_stage`, `status application_status`, `approved_at`, `disbursed_at` |
| `loan_stage_entries` | **Append-only** stage records | `loan_application_id`, `stage loan_stage`, `entered_by_profile_id`, `outcome`, `remarks`, `data jsonb` (stage-specific: valuation numbers, bank name, FI notes), `created_at`. Corrections = new row + remarks (L4). |
| `documents` | Uploaded files | `loan_application_id`, `party`, `doc_type`, `storage_path`, `uploaded_by_profile_id`, `verified` bool, `verified_by`, `verified_at` |
| `valuation_slabs` | In-house depreciation table | `vehicle_category`, `age_band`, `depreciation_pct` — admin-tunable (A15) |

### Money
| Table | Purpose | Key columns |
|---|---|---|
| `commissions` | One per disbursed file with a dealer | `loan_application_id` (unique), `dealer_id`, `disbursed_amount`, `rate_applied` (0.015/0.02), `amount`, `status commission_status`. Created only inside the disbursement transaction (AGENTS.md §6.5). |
| `wallet_ledger` | **Append-only** dealer ledger | `dealer_id`, `entry_type ledger_entry_type`, `amount` (signed), `commission_id` (nullable FK), `payout_utr` (nullable), `payout_date` (nullable), `remarks`, `created_by_profile_id`. Balance = SUM(amount). Never updated or deleted. |
| `withdrawal_requests` | Dealer withdrawal asks | `dealer_id`, `amount_requested`, `status withdrawal_status`, `processed_by`, `processed_at`, `ledger_entry_id` (nullable FK once paid) |

### Platform
| Table | Purpose | Key columns |
|---|---|---|
| `notifications` | In-app only (no push/SMS, L-scope) | `profile_id`, `title`, `body`, `link_type`, `link_id`, `read_at` |
| `settings` | Singleton config rows | `key` (commission_slab, ninety_day_window, etc.), `value jsonb` — every change audited |
| `audit_log` | **Append-only** | `actor_profile_id`, `action`, `entity`, `entity_id`, `detail jsonb` — written by service layer on every stage entry, payout, policy publish, setting change |

## 3. RLS summary (detail in AUTH-MATRIX.md)

- `customers`/`loan_applications`/`documents`/stage entries: customer reads own; dealer reads/writes own-created; staff reads/writes assigned + own-created; admin all.
- `lenders` + active `lender_policies` + `policy_documents`: read for dealer/staff/authenticated engine; **write admin only**.
- `commissions`/`wallet_ledger`/`withdrawal_requests`: dealer reads own; admin all; **no role can UPDATE/DELETE ledger or commissions** — insert-only policies.
- `eligibility_evaluations`, `loan_stage_entries`, `audit_log`: insert + select only; no update/delete policies exist for any role.
- Staff role has **no grants at all** on `commissions`, `wallet_ledger`, `withdrawal_requests` (L8).

## 4. Indexes (minimum set)

- `loan_applications(status, current_stage)`, `loan_applications(dealer_id)`, `loan_applications(staff_id)`, `loan_applications(approved_at) WHERE status='approved'` (J1 scan)
- `lender_policies(lender_id, product_type, status)`; partial index on `status='active'`
- `lender_policies(min_loan_amount, max_loan_amount, min_age, max_age, min_cibil)` — engine pre-filter
- `wallet_ledger(dealer_id, created_at)` · `eligibility_evaluations(loan_application_id)` · `audit_log(entity, entity_id)`

## 5. Migration & seed plan

1. `0001_enums.sql` → `0002_identity.sql` → `0003_lenders_policies.sql` → `0004_pipeline.sql` → `0005_money.sql` → `0006_platform.sql` → `0007_rls.sql` → `0008_indexes.sql`
2. `seed.sql`: 6 lenders (2 active), SK + ITI policies v1 + policy_documents rows, products, commission slab setting, 90-day setting, valuation slabs, document master, one admin account.
