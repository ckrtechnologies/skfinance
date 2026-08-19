# Shreeja Finance - V3 Prototype Screens Overview

This document provides a comprehensive mapping and description of every screen created across all 5 prototype domains. You can easily export this Markdown file to a PDF (e.g., using your IDE or browser) to share with the client.

## 1. Admin Panel (Web)
*Location: `/prototypes/admin/`*

**Description**: The centralized command center for system administrators. The Admin panel is purely a dashboard for monitoring platform configuration, lender management, and ledger adjustments; it does *not* handle credit decisions or hardcoded policy rules.

* **A1-Login**: Secure administrator login.
* **A2-Dashboard**: High-level platform health metrics (leads, disbursals, system alerts).
* **A3-Lenders**: List of partnered NBFCs and banks with active integration status.
* **A4-LenderDetail**: Specific lender configurations (e.g., SK Finance) and ledger summaries.
* **A5-GlobalRules**: View-only interface showing hardcoded LTV and risk limits.
* **A6-Ledger**: Master ledger showing platform revenue and lender-wise breakdown.
* **A7-Adjustments**: Interface to manual adjust ledger entries or process platform fee reversals.
* **A11-Dealers**: Directory of authorized dealership partners.
* **A12-Staff**: Directory of internal staff, field executives, and branch managers.
* **A13-Settings**: Global platform configurations (API keys, email servers, etc.).
* **A14-SystemHealth**: Technical monitoring, uptime stats, and API error logs.
* **A15-PayoutQueue**: Queue of pending commission payouts for dealers and staff.
* **A16-AuditLog**: Read-only chronological trail of all critical system actions.
* **A17-Notifications**: System-wide broadcasts and admin alerts.

---

## 2. Customer App (Mobile)
*Location: `/prototypes/customer/`*

**Description**: The mobile-first journey for end borrowers. It guides them from checking initial eligibility to submitting a full loan application and tracking their disbursal status.

* **C1-Splash**: Animated branding screen (Shreeja Logo).
* **C2-Onboarding**: Value proposition carousel and "Get Started" prompt.
* **C3-LoginRegistration**: Mobile number and OTP verification.
* **C4-Home**: Welcome screen with active applications and quick-start actions.
* **C5-QuickEligibilityCheck**: Form to capture basic info (PAN, Income) for soft credit pull.
* **C6-EligibilityResult**: Displays maximum loan limit based on the soft pull.
* **C7-LoanApplicationForm**: Detailed data entry (Vehicle selection, employment type).
* **C8-DocumentUpload**: Interface to upload KYC (Aadhaar, PAN, Bank Statements).
* **C9-QuoteSelection**: Carousel of eligible lender quotes (SK Finance, ITI, etc.) with LTVs.
* **C10-ApplicationStatus**: Live tracking pipeline (Submitted → FI → Credit → Approved).
* **C11-AgreementSign**: eSign interface for final loan agreements.
* **C12-Notifications**: Alerts regarding application progress or missing documents.
* **C13-Profile**: User settings, linked bank accounts, and support options.

---

## 3. Dealer App (Mobile)
*Location: `/prototypes/dealer/`*

**Description**: The mobile application for partner dealerships. Allows them to generate quotes on the lot, upload customer KYC on their behalf, and track commission payouts.

* **D1-Splash**: Dealer portal branding screen.
* **D2-Login**: Secure login using Dealer ID and PIN.
* **D3-Dashboard**: Pipeline snapshot and quick actions (New File, Generate Quote).
* **D4-NewApplication**: Step 1 - Initiating a new customer file on the lot.
* **D5-VehicleSelection**: Step 2 - Selecting vehicle make, model, and valuation.
* **D6-CustomerKYC**: Uploading customer documents directly from the dealer's phone.
* **D7-QuoteGeneration**: Viewing eligible lenders and generating a shareable quote link.
* **D8-ApplicationTracking**: A Kanban-style view of all active customer applications.
* **D9-DisbursementStatus**: Success screen confirming loan disbursal to the dealer/customer.
* **D10-CommissionWallet**: Tracking earned commissions and requesting payouts.
* **D11-Notifications**: Alerts on file status updates (e.g., Credit Hold, Approved).
* **D12-Profile**: Dealership settings, sub-user management, and support.

---

## 4. Staff App (Mobile)
*Location: `/prototypes/staff/`*

**Description**: Built for Field Executives and Loan Officers who are constantly on the move. Focuses heavily on Field Investigation (FI) tasks, geotagged photo uploads, and task queues.

* **D1-Splash**: Staff app branding screen.
* **S2-Login**: Employee ID and secure PIN authentication.
* **S3-Dashboard**: Daily tasks summary, upcoming visits, and performance metrics.
* **S4-TaskQueue**: Prioritized list of pending verifications and dealer visits.
* **S5-CaseDetail**: Deep dive into a specific customer file, including map navigation.
* **S6-UploadVerificationDocs**: Interface for capturing live, geotagged FI photos (house, business).
* **S7-DealerVisit**: Vehicle inspection checklist for used car loans.
* **S8-PipelineOverview**: High-level view of the executive's portfolio (FI Pending, Approved, etc.).
* **S9-Notifications**: Urgent alerts from managers or credit team regarding files.
* **S10-Profile**: Attendance, incentive tracking, and app settings.

---

## 5. Staff Panel (Web)
*Location: `/prototypes/staff-panel/`*

**Description**: The desktop application for Branch Managers and Credit Underwriters. Used for manual credit reviews, pipeline management, and initiating disbursements.

* **SP1-Login**: Internal desktop login screen.
* **SP2-Dashboard**: High-level branch overview (New Leads, Pending FI, Disbursals).
* **SP3-LeadManagement**: Table of all incoming leads from various sources with conversion tools.
* **SP4-ApplicationReview**: Detailed view of a submitted file, including the executive's FI report.
* **SP5-CreditDecision**: Underwriting interface to adjust LTV, interest rates, and approve/reject.
* **SP6-DisbursementApproval**: Queue for final verification of eSigned agreements and releasing funds.
* **SP7-Reports**: MIS Analytics, executive performance, and disbursal trends.
