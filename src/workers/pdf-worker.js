/**
 * Pagelens — PDF Worker
 * Generates standards-compliant, multi-page PDFs with smart page splitting
 * 100% offline with zero external dependencies.
 */

export async function generatePdfFromCanvas(canvas, options = {}) {
  const {
    pageSize = 'a4', // 'a4' | 'letter' | 'continuous'
    margin = 20,     // pt
    title = 'Pagelens Capture'
  } = options;

  // Dimensions in points (72 points per inch)
  const SIZES = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612.0, height: 792.0 },
  };

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  let pageDimensions;
  let pages = [];

  if (pageSize === 'continuous') {
    // Single continuous page matching aspect ratio
    const ptWidth = 595.28;
    const ptHeight = (canvasHeight / canvasWidth) * ptWidth;
    pageDimensions = { width: ptWidth, height: ptHeight };
    pages.push({
      sy: 0,
      sHeight: canvasHeight,
      destWidth: ptWidth - margin * 2,
      destHeight: ptHeight - margin * 2,
    });
  } else {
    pageDimensions = SIZES[pageSize] || SIZES.a4;
    const printableWidth = pageDimensions.width - margin * 2;
    const printableHeight = pageDimensions.height - margin * 2;
    const scale = printableWidth / canvasWidth;
    const sliceSourceHeight = printableHeight / scale;

    let currentY = 0;
    while (currentY < canvasHeight) {
      const remainingSource = canvasHeight - currentY;
      const thisSliceHeight = Math.min(sliceSourceHeight, remainingSource);
      pages.push({
        sy: currentY,
        sHeight: thisSliceHeight,
        destWidth: printableWidth,
        destHeight: thisSliceHeight * scale,
      });
      currentY += thisSliceHeight;
    }
  }

  // Convert canvas slices to JPEG Data URLs
  const pageImages = [];
  for (const page of pages) {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvasWidth;
    pageCanvas.height = page.sHeight;
    const pctx = pageCanvas.getContext('2d');
    pctx.drawImage(
      canvas,
      0, page.sy, canvasWidth, page.sHeight,
      0, 0, canvasWidth, page.sHeight
    );
    const jpegDataUrl = pageCanvas.toDataURL('image/jpeg', 0.90);
    pageImages.push(jpegDataUrl);
  }

  // Build minimalist PDF structure with embedded JPEGs
  const pdfBlob = createSimplePdfWithImages(pageImages, pageDimensions, margin);
  return pdfBlob;
}

function createSimplePdfWithImages(dataUrls, pageDimensions, margin) {
  let objects = [];
  let xref = [];
  let pdf = '%PDF-1.4\n';

  function addObject(content) {
    const num = objects.length + 1;
    const offset = pdf.length;
    xref.push(offset);
    const str = `${num} 0 obj\n${content}\nendobj\n`;
    pdf += str;
    objects.push(str);
    return num;
  }

  // 1: Catalog
  // 2: Pages
  // Pages references
  const pagesObjNum = 2;
  const pageRefs = [];
  const imageObjNums = [];

  // Parse images and create Image XObjects
  for (let i = 0; i < dataUrls.length; i++) {
    const rawData = atob(dataUrls[i].split(',')[1]);
    const imgBytes = new Uint8Array(rawData.length);
    for (let j = 0; j < rawData.length; j++) {
      imgBytes[j] = rawData.charCodeAt(j);
    }

    // Extract JPEG dimensions from SOF marker
    let imgW = 800, imgH = 600;
    for (let j = 0; j < imgBytes.length - 8; j++) {
      if (imgBytes[j] === 0xFF && (imgBytes[j+1] >= 0xC0 && imgBytes[j+1] <= 0xC3)) {
        imgH = (imgBytes[j+5] << 8) + imgBytes[j+6];
        imgW = (imgBytes[j+7] << 8) + imgBytes[j+8];
        break;
      }
    }

    // Convert bytes to binary string
    let binaryStr = '';
    const chunk = 8192;
    for (let k = 0; k < imgBytes.length; k += chunk) {
      binaryStr += String.fromCharCode.apply(null, imgBytes.subarray(k, k + chunk));
    }

    const imgStream = `<<
  /Type /XObject
  /Subtype /Image
  /Width ${imgW}
  /Height ${imgH}
  /ColorSpace /DeviceRGB
  /BitsPerComponent 8
  /Filter /DCTDecode
  /Length ${binaryStr.length}
>>
stream
${binaryStr}
endstream`;

    // Note: Image XObject will be added after Catalog & Pages
    imageObjNums.push({
      stream: imgStream,
      width: imgW,
      height: imgH
    });
  }

  // Object 1: Catalog
  addObject(`<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>`);

  // Reserve Object 2 for Pages
  const pagesIndex = objects.length;
  xref.push(0); // placeholder
  objects.push(''); // placeholder
  pdf += 'PLACEHOLDER_PAGES\n';

  // Add images and page objects
  const createdPageNums = [];

  for (let i = 0; i < imageObjNums.length; i++) {
    const imgInfo = imageObjNums[i];
    const imgObjNum = addObject(imgInfo.stream);

    // Compute display dimensions preserving aspect ratio
    const destW = pageDimensions.width - margin * 2;
    const destH = (imgInfo.height / imgInfo.width) * destW;
    const posX = margin;
    const posY = pageDimensions.height - margin - destH;

    // Content stream drawing the image
    const content = `q
${destW.toFixed(2)} 0 0 ${destH.toFixed(2)} ${posX.toFixed(2)} ${posY.toFixed(2)} cm
/Im${i + 1} Do
Q`;

    const contentObjNum = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

    // Page object
    const pageObjNum = addObject(`<<
  /Type /Page
  /Parent ${pagesObjNum} 0 R
  /MediaBox [0 0 ${pageDimensions.width.toFixed(2)} ${pageDimensions.height.toFixed(2)}]
  /Contents ${contentObjNum} 0 R
  /Resources <<
    /XObject << /Im${i + 1} ${imgObjNum} 0 R >>
    /ProcSet [/PDF /ImageC]
  >>
>>`);

    createdPageNums.push(pageObjNum);
  }

  // Now replace placeholder Pages object
  const pagesContent = `<<
  /Type /Pages
  /Kids [${createdPageNums.map(n => `${n} 0 R`).join(' ')}]
  /Count ${createdPageNums.length}
>>`;

  // Re-generate complete clean PDF string with accurate offsets
  let finalPdf = '%PDF-1.4\n';
  const finalXref = [];

  // 1: Catalog
  finalXref.push(finalPdf.length);
  finalPdf += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

  // 2: Pages
  finalXref.push(finalPdf.length);
  finalPdf += `2 0 obj\n${pagesContent}\nendobj\n`;

  // Re-append remaining objects
  for (let i = 2; i < objects.length; i++) {
    finalXref.push(finalPdf.length);
    finalPdf += objects[i];
  }

  const startxref = finalPdf.length;
  finalPdf += `xref\n0 ${finalXref.length + 1}\n0000000000 65535 f \n`;
  for (const offset of finalXref) {
    finalPdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  }
  finalPdf += `trailer\n<< /Size ${finalXref.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;

  return new Blob([finalPdf], { type: 'application/pdf' });
}
