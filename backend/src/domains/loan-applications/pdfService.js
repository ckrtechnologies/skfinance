'use strict';
const PDFDocument = require('pdfkit');
const { saveToCdn } = require('../../shared/utils/cdnStorage');
const { supabase } = require('../../config/database');

async function generateLoanAgreement(loanApplicationId) {
  // 1. Fetch application details
  const { data: app, error } = await supabase
    .from('loan_applications')
    .select(`
      *,
      profiles!loan_applications_customer_profile_id_fkey ( full_name, phone ),
      vehicles!loan_applications_vehicle_id_fkey ( make, model, variant, year, registration_no, engine_no, chassis_no ),
      dealers ( dealership_name, contact_person )
    `)
    .eq('id', loanApplicationId)
    .single();

  if (error || !app) {
    console.error('generateLoanAgreement error fetching app:', error);
    return null;
  }

  // 2. Generate PDF Buffer
  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  
  const finishPdf = new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);
  });

  // Basic styling
  doc.fontSize(20).font('Helvetica-Bold').text('LOAN AGREEMENT', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).font('Helvetica').text(`Agreement Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'right' });
  doc.moveDown(2);

  // Section: Application Details
  doc.fontSize(14).font('Helvetica-Bold').text('1. Loan Summary');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Application No: ${app.application_no}`);
  doc.text(`Sanctioning Lender: ${app.submitted_lender_id || 'SK Finance Co.'}`);
  doc.text(`Approved Loan Amount: Rs. ${Number(app.approved_amount || app.requested_amount || 0).toLocaleString('en-IN')}`);
  doc.text(`Loan Tenure: ${app.tenure_months || 36} Months`);
  doc.moveDown();

  // Section: Applicant Details
  doc.fontSize(14).font('Helvetica-Bold').text('2. Borrower Details');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Name: ${app.profiles?.full_name || 'N/A'}`);
  doc.text(`Phone: ${app.profiles?.phone || 'N/A'}`);
  doc.text(`Dealership: ${app.dealers?.dealership_name || 'N/A'}`);
  doc.moveDown();

  // Section: Vehicle Details
  if (app.vehicles) {
    doc.fontSize(14).font('Helvetica-Bold').text('3. Hypothecated Asset (Vehicle)');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Make & Model: ${app.vehicles.make} ${app.vehicles.model} ${app.vehicles.variant || ''}`);
    doc.text(`Year: ${app.vehicles.year || 'N/A'}`);
    doc.text(`Registration No: ${app.vehicles.registration_no || 'N/A'}`);
    doc.text(`Engine No: ${app.vehicles.engine_no || 'N/A'} | Chassis No: ${app.vehicles.chassis_no || 'N/A'}`);
    doc.moveDown();
  }

  // Section: Standard T&C
  doc.fontSize(14).font('Helvetica-Bold').text('4. Terms and Conditions');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  const terms = [
    'The borrower agrees to repay the loan amount along with applicable interest in EMIs as per the schedule.',
    'The vehicle mentioned in Section 3 shall remain hypothecated to the Sanctioning Lender until the loan is fully repaid.',
    'In case of default, the lender reserves the right to repossess the vehicle and initiate legal proceedings.',
    'The borrower shall maintain comprehensive insurance for the vehicle during the entire loan tenure.',
    'This agreement is subject to the exclusive jurisdiction of the courts where the lender is registered.'
  ];
  terms.forEach((term, idx) => {
    doc.text(`${idx + 1}. ${term}`, { align: 'justify' });
    doc.moveDown(0.5);
  });
  doc.moveDown(2);

  // Signatures Block
  doc.text('_________________________', 50, doc.y);
  doc.text('_________________________', 350, doc.y - 12);
  doc.moveDown(0.5);
  doc.text('Authorized Signatory (Lender)', 50, doc.y);
  doc.text('Borrower Signature', 350, doc.y - 12);

  // Finalize PDF
  doc.end();
  const pdfBuffer = await finishPdf;

  // 3. Save to CDN
  const fakeFileObj = {
    buffer: pdfBuffer,
    originalname: `Loan_Agreement_${app.application_no}.pdf`,
    mimetype: 'application/pdf'
  };

  const { cdn_path, cdn_url } = saveToCdn(
    fakeFileObj,
    app.application_no,
    'applicant',
    'loan_agreement'
  );

  // 4. Save to `documents` table
  const { data: docRecord, error: docError } = await supabase.from('documents').insert({
    loan_application_id: loanApplicationId,
    doc_type: 'loan_agreement',
    party: 'applicant',
    cdn_path,
    original_filename: fakeFileObj.originalname,
    mime_type: fakeFileObj.mimetype,
    file_size_bytes: pdfBuffer.length,
    uploaded_by_profile_id: null // System generated
  }).select('id').single();

  if (docError) {
    console.error('generateLoanAgreement error saving to DB:', docError);
  }

  return { cdn_path, cdn_url, id: docRecord?.id };
}

module.exports = {
  generateLoanAgreement
};
