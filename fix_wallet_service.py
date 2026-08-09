import re

with open('/Users/chandanmallik/projects/skfinance/backend/src/domains/wallet/service.js', 'r') as f:
    content = f.read()

content = content.replace("payout_utr: payoutUtr || null,\n    receipt_pdf_url", "receipt_pdf_url")

with open('/Users/chandanmallik/projects/skfinance/backend/src/domains/wallet/service.js', 'w') as f:
    f.write(content)
