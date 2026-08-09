'use strict';
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const PDFDocumentKit = require('pdfkit');
const { supabase } = require('../../config/database');
const { CDN_LOCAL_PATH } = require('../../config/secrets');

/**
 * Helper to generate the Index Page using pdfkit in memory
 * @param {Array} indexEntries - Array of { title, pageNum }
 * @returns {Promise<Buffer>}
 */
function createIndexPage(indexEntries, applicationNo) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocumentKit({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).text('Application Document Package', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text(`Application No: ${applicationNo}`, { align: 'center' });
    doc.moveDown(0.5);
    
    // Confidential Watermark-like text
    doc.fillColor('red').fontSize(12).text('CONFIDENTIAL - FOR BANK PoC ONLY', { align: 'center' });
    doc.fillColor('black');
    doc.moveDown(2);

    doc.fontSize(18).text('Table of Contents', { underline: true });
    doc.moveDown(1);

    // Index Entries
    doc.fontSize(12);
    indexEntries.forEach(entry => {
      // Create a dotted line effect between title and page number
      const y = doc.y;
      doc.text(entry.title, 50, y, { continued: false, lineBreak: false });
      
      const pageStr = entry.pageNum.toString();
      const pageX = doc.page.width - 50 - doc.widthOfString(pageStr);
      doc.text(pageStr, pageX, y, { continued: false });
      
      // Draw dotted line
      const startX = 50 + doc.widthOfString(entry.title) + 5;
      const endX = pageX - 5;
      if (endX > startX) {
        doc.moveTo(startX, y + 8).lineTo(endX, y + 8).dash(2, { space: 2 }).stroke();
        doc.undash();
      }
      doc.moveDown(1.5);
    });

    doc.end();
  });
}

/**
 * Helper to sort documents: Applicant -> Co-Applicant -> Guarantor
 */
const sortDocuments = (docs) => {
  const partyOrder = { 'applicant': 1, 'co_applicant': 2, 'guarantor': 3 };
  return docs.sort((a, b) => {
    const pA = partyOrder[a.party] || 99;
    const pB = partyOrder[b.party] || 99;
    if (pA !== pB) return pA - pB;
    // Then sort by doc_type
    return (a.doc_type || '').localeCompare(b.doc_type || '');
  });
};

/**
 * Generate a single merged PDF with an Index and Page Numbers
 * @param {string} loanApplicationId 
 * @returns {Promise<Buffer>}
 */
async function generateMergedDocumentPdf(loanApplicationId) {
  // 1. Fetch Application
  const { data: app, error: appError } = await supabase
    .from('loan_applications')
    .select('application_no')
    .eq('id', loanApplicationId)
    .single();

  if (appError) throw appError;

  // 2. Fetch all Documents
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('*')
    .eq('loan_application_id', loanApplicationId);

  if (docsError) throw docsError;

  const sortedDocs = sortDocuments(documents || []);
  
  // 3. Initialize pdf-lib Document for the content
  const mergedPdf = await PDFDocument.create();
  
  // We'll track entries for the Index Page
  const indexEntries = [];
  
  // Need to account for the fact that the Index page might be more than 1 page.
  // But we'll just assume 1 page for now, or we can just calculate pages later.
  // Let's generate index page later after we know all contents.
  let contentPagesCount = 0;

  // 4. Process each document
  for (const doc of sortedDocs) {
    if (!doc.cdn_path) continue;
    
    const absPath = path.join(CDN_LOCAL_PATH, doc.cdn_path);
    try {
      const fileBuffer = await fs.readFile(absPath);
      
      const partyFmt = (doc.party || 'unknown').replace(/_/g, ' ').toUpperCase();
      const docTypeFmt = (doc.doc_type || 'document').replace(/_/g, ' ').toUpperCase();
      const title = `${partyFmt} - ${docTypeFmt}`;
      
      // We will shift the pageNum by whatever the index page count is later.
      indexEntries.push({ title, rawPageNum: contentPagesCount + 1 });

      const ext = path.extname(doc.original_filename).toLowerCase();
      
      if (ext === '.pdf') {
        const docPdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        // Embed the pages so we can scale them and avoid superimposing text over content
        const embeddedPages = await mergedPdf.embedPages(docPdf.getPages());
        
        embeddedPages.forEach((embeddedPage) => {
          const page = mergedPdf.addPage();
          const { width, height } = page.getSize();
          
          // Leave 50px margin top/bottom for headings and page numbers
          // Scale the embedded page to fit within this safe area
          const safeWidth = width - 40;
          const safeHeight = height - 100;
          const scale = Math.min(safeWidth / embeddedPage.width, safeHeight / embeddedPage.height, 1);
          
          const scaledWidth = embeddedPage.width * scale;
          const scaledHeight = embeddedPage.height * scale;
          
          page.drawPage(embeddedPage, {
            x: width / 2 - scaledWidth / 2,
            y: height / 2 - scaledHeight / 2 - 10, // Shift slightly down to give more room to the top header
            width: scaledWidth,
            height: scaledHeight,
          });
          contentPagesCount++;
        });
      } else if (ext === '.jpg' || ext === '.jpeg') {
        const image = await mergedPdf.embedJpg(fileBuffer);
        const page = mergedPdf.addPage();
        const { width, height } = page.getSize();
        
        const imgDims = image.scaleToFit(width - 100, height - 100);
        page.drawImage(image, {
          x: page.getWidth() / 2 - imgDims.width / 2,
          y: page.getHeight() / 2 - imgDims.height / 2,
          width: imgDims.width,
          height: imgDims.height,
        });
        contentPagesCount++;
      } else if (ext === '.png') {
        const image = await mergedPdf.embedPng(fileBuffer);
        const page = mergedPdf.addPage();
        const { width, height } = page.getSize();
        
        const imgDims = image.scaleToFit(width - 100, height - 100);
        page.drawImage(image, {
          x: page.getWidth() / 2 - imgDims.width / 2,
          y: page.getHeight() / 2 - imgDims.height / 2,
          width: imgDims.width,
          height: imgDims.height,
        });
        contentPagesCount++;
      } else {
        console.warn(`[Merged PDF] Unsupported file type ${ext} for document ${doc.id}`);
      }
    } catch (e) {
      console.error(`[Merged PDF] Error processing document ${doc.id}:`, e.message);
    }
  }

  // 5. Generate Index Page. We don't know how many pages it will be until we create it.
  // We'll create it with dummy page numbers first, just to get its page count.
  const dummyIndexBuffer = await createIndexPage(indexEntries.map(e => ({ title: e.title, pageNum: e.rawPageNum })), app.application_no);
  const dummyIndexDoc = await PDFDocument.load(dummyIndexBuffer);
  const indexPageCount = dummyIndexDoc.getPageCount();

  // Now recreate index with correct page numbers (shifted by indexPageCount)
  const finalIndexEntries = indexEntries.map(e => ({ title: e.title, pageNum: e.rawPageNum + indexPageCount }));
  const indexPdfBuffer = await createIndexPage(finalIndexEntries, app.application_no);
  const indexPdfDoc = await PDFDocument.load(indexPdfBuffer);

  // 6. Final Document: Create a new PDF, append Index, then append Content
  const finalPdf = await PDFDocument.create();
  
  // Copy Index Page(s)
  const indexPages = await finalPdf.copyPages(indexPdfDoc, indexPdfDoc.getPageIndices());
  indexPages.forEach(p => finalPdf.addPage(p));
  
  // Copy Content Pages
  const contentPages = await finalPdf.copyPages(mergedPdf, mergedPdf.getPageIndices());
  contentPages.forEach(p => finalPdf.addPage(p));

  // 7. Add Page Numbers to all pages
  const totalPages = finalPdf.getPageCount();
  const pages = finalPdf.getPages();
  const helvetica = await finalPdf.embedFont(StandardFonts.Helvetica);

  pages.forEach((page, idx) => {
    const pageNumText = `Page ${idx + 1} of ${totalPages}`;
    const textWidth = helvetica.widthOfTextAtSize(pageNumText, 10);

    page.drawText(pageNumText, {
      x: page.getWidth() / 2 - textWidth / 2,
      y: 20,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
    });

    // Determine if this is a content page (after the index)
    if (idx + 1 > indexPageCount) {
      let currentTitle = null;
      for (const entry of finalIndexEntries) {
        if ((idx + 1) >= entry.pageNum) {
          currentTitle = entry.title;
        }
      }

      if (currentTitle) {
        const headingWidth = helvetica.widthOfTextAtSize(currentTitle, 12);
        const headingX = page.getWidth() / 2 - headingWidth / 2;
        const headingY = page.getHeight() - 30;

        // Draw white background for readability over existing PDF content
        page.drawRectangle({
          x: headingX - 10,
          y: headingY - 5,
          width: headingWidth + 20,
          height: 20,
          color: rgb(1, 1, 1),
          opacity: 0.85
        });

        page.drawText(currentTitle, {
          x: headingX,
          y: headingY,
          size: 12,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
      }
    }
  });

  const pdfBytes = await finalPdf.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  generateMergedDocumentPdf
};
