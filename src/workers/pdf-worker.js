/**
 * Pagelens — PDF Worker
 * Generates standards-compliant, multi-page PDFs with smart page splitting
 * 100% offline with zero external dependencies.
 * Assembles pure binary streams to prevent UTF-8 corruption of JPEG image data.
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

  const canvasWidth = canvas.width || 800;
  const canvasHeight = canvas.height || 600;

  let pageDimensions;
  let pages = [];

  if (pageSize === 'continuous') {
    // Single continuous page matching aspect ratio
    const ptWidth = 595.28;
    const ptHeight = Math.max(100, (canvasHeight / canvasWidth) * ptWidth);
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

  // Convert canvas slices to clean binary JPEG data
  const pageImageBlobs = [];
  for (const page of pages) {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvasWidth;
    pageCanvas.height = page.sHeight;
    const pctx = pageCanvas.getContext('2d');

    // Guarantee crisp solid white background behind screenshot
    pctx.fillStyle = '#FFFFFF';
    pctx.fillRect(0, 0, canvasWidth, page.sHeight);

    pctx.drawImage(
      canvas,
      0, page.sy, canvasWidth, page.sHeight,
      0, 0, canvasWidth, page.sHeight
    );

    const jpegBlob = await new Promise((resolve) => {
      pageCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
    });

    const arrayBuffer = await jpegBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Extract JPEG dimensions from SOF marker
    let imgW = canvasWidth, imgH = page.sHeight;
    for (let j = 0; j < bytes.length - 8; j++) {
      if (bytes[j] === 0xFF && (bytes[j + 1] >= 0xC0 && bytes[j + 1] <= 0xC3)) {
        imgH = (bytes[j + 5] << 8) + bytes[j + 6];
        imgW = (bytes[j + 7] << 8) + bytes[j + 8];
        break;
      }
    }

    pageImageBlobs.push({
      bytes,
      width: imgW,
      height: imgH,
      destWidth: page.destWidth,
      destHeight: page.destHeight,
    });
  }

  return assembleBinaryPdf(pageImageBlobs, pageDimensions, margin);
}

function assembleBinaryPdf(pageImages, pageDimensions, margin) {
  const encoder = new TextEncoder();
  const chunks = [];
  let currentOffset = 0;

  function writeText(str) {
    const b = encoder.encode(str);
    chunks.push(b);
    currentOffset += b.length;
  }

  function writeBytes(u8) {
    chunks.push(u8);
    currentOffset += u8.length;
  }

  writeText('%PDF-1.4\n');

  const numPages = pageImages.length;
  // Object IDs allocation:
  // 1: Catalog
  // 2: Pages
  // For each page i (0-indexed):
  //   Image XObject: 3 + i * 3
  //   Content Stream: 4 + i * 3
  //   Page Object: 5 + i * 3
  const totalObjects = 2 + numPages * 3;
  const xrefOffsets = new Array(totalObjects + 1);

  // 1: Catalog
  xrefOffsets[1] = currentOffset;
  writeText(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // 2: Pages (Kids array)
  const pageObjNums = [];
  for (let i = 0; i < numPages; i++) {
    pageObjNums.push(5 + i * 3);
  }
  xrefOffsets[2] = currentOffset;
  writeText(`2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] /Count ${numPages} >>\nendobj\n`);

  // Render each page with its image and content
  for (let i = 0; i < numPages; i++) {
    const imgInfo = pageImages[i];
    const imgObjNum = 3 + i * 3;
    const contentObjNum = 4 + i * 3;
    const pageObjNum = 5 + i * 3;

    // Image XObject
    xrefOffsets[imgObjNum] = currentOffset;
    writeText(`${imgObjNum} 0 obj\n<<\n  /Type /XObject\n  /Subtype /Image\n  /Width ${imgInfo.width}\n  /Height ${imgInfo.height}\n  /ColorSpace /DeviceRGB\n  /BitsPerComponent 8\n  /Filter /DCTDecode\n  /Length ${imgInfo.bytes.length}\n>>\nstream\n`);
    writeBytes(imgInfo.bytes);
    writeText(`\nendstream\nendobj\n`);

    // Content Stream
    const destW = imgInfo.destWidth;
    const destH = imgInfo.destHeight;
    const posX = margin;
    const posY = pageDimensions.height - margin - destH;

    const contentText = `q\n${destW.toFixed(2)} 0 0 ${destH.toFixed(2)} ${posX.toFixed(2)} ${posY.toFixed(2)} cm\n/Im${i + 1} Do\nQ\n`;
    const contentBytes = encoder.encode(contentText);

    xrefOffsets[contentObjNum] = currentOffset;
    writeText(`${contentObjNum} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n${contentText}endstream\nendobj\n`);

    // Page Object
    xrefOffsets[pageObjNum] = currentOffset;
    writeText(`${pageObjNum} 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 ${pageDimensions.width.toFixed(2)} ${pageDimensions.height.toFixed(2)}]\n  /Contents ${contentObjNum} 0 R\n  /Resources <<\n    /XObject << /Im${i + 1} ${imgObjNum} 0 R >>\n    /ProcSet [/PDF /ImageC]\n  >>\n>>\nendobj\n`);
  }

  // Cross-reference table
  const startxref = currentOffset;
  writeText(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjects; i++) {
    const offset = xrefOffsets[i] || 0;
    writeText(String(offset).padStart(10, '0') + ' 00000 n \n');
  }

  writeText(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
}
