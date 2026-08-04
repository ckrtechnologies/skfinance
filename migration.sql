-- Add rules column to lenders table
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '{}'::jsonb;

-- Backfill default rules for SK Finance
UPDATE public.lenders SET rules = '{
  "lenderCode": "sk-finance",
  "lenderName": "SK Finance",
  "products": {
    "new_car": {
      "loanRange": { "min": 100000, "max": 1500000 },
      "ltvRange": { "min": 80, "max": 85 },
      "ageRange": { "min": 21, "max": 65 },
      "minCibil": 650,
      "cibilNegativeAccepted": true,
      "customerTypes": ["salaried", "self_employed", "agriculture"],
      "coApplicantRequired": true
    },
    "used_car": {
      "loanRange": { "min": 100000, "max": 1500000 },
      "ltvRange": { "min": 80, "max": 85 },
      "ageRange": { "min": 21, "max": 65 },
      "minCibil": 650,
      "cibilNegativeAccepted": true,
      "customerTypes": ["salaried", "self_employed", "agriculture"],
      "coApplicantRequired": true
    },
    "commercial_vehicle": {
      "loanRange": { "min": 100000, "max": 1500000 },
      "ltvRange": { "min": 80, "max": 85 },
      "ageRange": { "min": 21, "max": 65 },
      "minCibil": 650,
      "cibilNegativeAccepted": true,
      "customerTypes": ["salaried", "self_employed", "agriculture"],
      "coApplicantRequired": true
    }
  }
}'::jsonb
WHERE code = 'sk-finance';

-- Backfill default rules for ITI Finance
UPDATE public.lenders SET rules = '{
  "lenderCode": "iti-finance",
  "lenderName": "ITI Finance",
  "products": {
    "new_car": {
      "loanRange": { "min": 100000, "max": 1500000 },
      "ltvRange": { "min": 80, "max": 85 },
      "ageRange": { "min": 21, "max": 62 },
      "minCibil": 650,
      "cibilNegativeAccepted": false,
      "customerTypes": ["salaried", "self_employed", "agriculture"],
      "coApplicantRequired": false
    },
    "used_car": {
      "loanRange": { "min": 100000, "max": 1500000 },
      "ltvRange": { "min": 80, "max": 85 },
      "ageRange": { "min": 21, "max": 62 },
      "minCibil": 650,
      "cibilNegativeAccepted": false,
      "customerTypes": ["salaried", "self_employed", "agriculture"],
      "coApplicantRequired": false
    },
    "commercial_vehicle": {
      "loanRange": { "min": 100000, "max": 1500000 },
      "ltvRange": { "min": 80, "max": 85 },
      "ageRange": { "min": 21, "max": 62 },
      "minCibil": 650,
      "cibilNegativeAccepted": false,
      "customerTypes": ["salaried", "self_employed", "agriculture"],
      "coApplicantRequired": false
    }
  }
}'::jsonb
WHERE code = 'iti-finance';
