-- Update rules for SK Finance with the new dynamic UI schema
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
      "applicantDocs": ["kyc_pan", "kyc_aadhaar", "income_bank_statement"],
      "coApplicant": {
        "required": true,
        "bloodRelationOnly": true,
        "docs": ["kyc_pan", "kyc_aadhaar"]
      },
      "guarantorPolicy": "rental_only",
      "guarantorDocs": ["kyc_pan", "kyc_aadhaar", "address_electricity_or_khatauni"],
      "rentalProfile": {
        "requireHometownStage": true,
        "extraDocs": ["address_hometown_documents", "landlord_electricity_bill"]
      }
    },
    "used_car": {
      "loanRange": { "min": 100000, "max": 1500000 },
      "ltvRange": { "min": 80, "max": 85 },
      "ageRange": { "min": 21, "max": 65 },
      "minCibil": 650,
      "cibilNegativeAccepted": true,
      "customerTypes": ["salaried", "self_employed", "agriculture"],
      "applicantDocs": ["kyc_pan", "kyc_aadhaar", "income_bank_statement"],
      "coApplicant": {
        "required": true,
        "bloodRelationOnly": true,
        "docs": ["kyc_pan", "kyc_aadhaar"]
      },
      "guarantorPolicy": "rental_only",
      "guarantorDocs": ["kyc_pan", "kyc_aadhaar", "address_electricity_or_khatauni"],
      "rentalProfile": {
        "requireHometownStage": true,
        "extraDocs": ["address_hometown_documents", "landlord_electricity_bill"]
      }
    },
    "commercial_vehicle": {
      "loanRange": { "min": 100000, "max": 1500000 },
      "ltvRange": { "min": 80, "max": 85 },
      "ageRange": { "min": 21, "max": 65 },
      "minCibil": 650,
      "cibilNegativeAccepted": true,
      "customerTypes": ["salaried", "self_employed", "agriculture"],
      "applicantDocs": ["kyc_pan", "kyc_aadhaar", "income_bank_statement"],
      "coApplicant": {
        "required": true,
        "bloodRelationOnly": true,
        "docs": ["kyc_pan", "kyc_aadhaar"]
      },
      "guarantorPolicy": "rental_only",
      "guarantorDocs": ["kyc_pan", "kyc_aadhaar", "address_electricity_or_khatauni"],
      "rentalProfile": {
        "requireHometownStage": true,
        "extraDocs": ["address_hometown_documents", "landlord_electricity_bill"]
      }
    }
  }
}'::jsonb
WHERE code = 'sk-finance';

-- Update rules for ITI Finance with the new dynamic UI schema
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
      "applicantDocs": ["kyc_pan", "kyc_aadhaar", "income_bank_statement"],
      "coApplicant": {
        "required": false,
        "bloodRelationOnly": true,
        "docs": ["kyc_pan", "kyc_aadhaar"]
      },
      "guarantorPolicy": "if_no_ownership_proof",
      "guarantorDocs": ["kyc_pan", "kyc_aadhaar", "address_electricity_or_khatauni"],
      "rentalProfile": {
        "requireHometownStage": false,
        "extraDocs": []
      }
    },
    "used_car": {
      "loanRange": { "min": 100000, "max": 1500000 },
      "ltvRange": { "min": 80, "max": 85 },
      "ageRange": { "min": 21, "max": 62 },
      "minCibil": 650,
      "cibilNegativeAccepted": false,
      "customerTypes": ["salaried", "self_employed", "agriculture"],
      "applicantDocs": ["kyc_pan", "kyc_aadhaar", "income_bank_statement"],
      "coApplicant": {
        "required": false,
        "bloodRelationOnly": true,
        "docs": ["kyc_pan", "kyc_aadhaar"]
      },
      "guarantorPolicy": "if_no_ownership_proof",
      "guarantorDocs": ["kyc_pan", "kyc_aadhaar", "address_electricity_or_khatauni"],
      "rentalProfile": {
        "requireHometownStage": false,
        "extraDocs": []
      }
    },
    "commercial_vehicle": {
      "loanRange": { "min": 100000, "max": 1500000 },
      "ltvRange": { "min": 80, "max": 85 },
      "ageRange": { "min": 21, "max": 62 },
      "minCibil": 650,
      "cibilNegativeAccepted": false,
      "customerTypes": ["salaried", "self_employed", "agriculture"],
      "applicantDocs": ["kyc_pan", "kyc_aadhaar", "income_bank_statement"],
      "coApplicant": {
        "required": false,
        "bloodRelationOnly": true,
        "docs": ["kyc_pan", "kyc_aadhaar"]
      },
      "guarantorPolicy": "if_no_ownership_proof",
      "guarantorDocs": ["kyc_pan", "kyc_aadhaar", "address_electricity_or_khatauni"],
      "rentalProfile": {
        "requireHometownStage": false,
        "extraDocs": []
      }
    }
  }
}'::jsonb
WHERE code = 'iti-finance';
