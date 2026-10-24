import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFExportOptions {
  filename?: string;
  paperSize?: 'A6' | 'A5' | 'A4' | '80mm' | '58mm';
  orientation?: 'landscape' | 'portrait';
  elementIds?: string[];
}

// Convert OKLCH color strings to RGB format supported by html2canvas
const tempCanvasCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;

export const parseOklchToRgbMath = (oklchStr: string): string => {
  const match = oklchStr.match(/oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.%]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i);
  if (!match) return '#000000';

  let l = parseFloat(match[1]);
  if (match[1].endsWith('%')) l = l / 100;

  let c = parseFloat(match[2]);
  if (match[2].endsWith('%')) c = (c / 100) * 0.4;

  let h = parseFloat(match[3]);
  if (isNaN(h)) h = 0;

  let alpha = 1;
  if (match[4]) {
    alpha = parseFloat(match[4]);
    if (match[4].endsWith('%')) alpha = alpha / 100;
  }

  const hRad = (h * Math.PI) / 180;
  const aVal = c * Math.cos(hRad);
  const bVal = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * aVal + 0.2158037573 * bVal;
  const m_ = l - 0.1055613458 * aVal - 0.0638541728 * bVal;
  const s_ = l - 0.0894841775 * aVal - 1.2914855480 * bVal;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toGamma = (x: number) => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308
      ? Math.round(clamped * 12.92 * 255)
      : Math.round((1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255);
  };

  const r = toGamma(rLin);
  const g = toGamma(gLin);
  const b = toGamma(bLin);

  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
};

export const convertOklchToRgb = (colorStr: string): string => {
  if (!colorStr || typeof colorStr !== 'string' || !colorStr.includes('oklch')) return colorStr;

  return colorStr.replace(/oklch\([^)]+\)/gi, (match) => {
    if (tempCanvasCtx) {
      try {
        tempCanvasCtx.fillStyle = '#000000';
        tempCanvasCtx.fillStyle = match;
        const resolved = tempCanvasCtx.fillStyle;
        if (resolved && !resolved.includes('oklch') && resolved !== '#000000') {
          return resolved;
        }
      } catch (e) {
        // ignore
      }
    }
    return parseOklchToRgbMath(match);
  });
};

const captureElementCanvas = async (el: HTMLElement): Promise<HTMLCanvasElement> => {
  return await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: (clonedDoc, clonedElement) => {
      // 1. Sanitize all <style> tags in cloned document
      const styleElements = clonedDoc.querySelectorAll('style');
      styleElements.forEach((styleTag) => {
        if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
          styleTag.textContent = convertOklchToRgb(styleTag.textContent);
        }
      });

      // 2. Sanitize rules in document.styleSheets if available
      try {
        Array.from(clonedDoc.styleSheets).forEach((sheet) => {
          try {
            const rules = (sheet as any).cssRules || (sheet as any).rules;
            if (rules) {
              Array.from(rules).forEach((rule: any) => {
                if (rule.style && rule.style.cssText && rule.style.cssText.includes('oklch')) {
                  rule.style.cssText = convertOklchToRgb(rule.style.cssText);
                }
              });
            }
          } catch (e) {
            // ignore cross-origin restrictions
          }
        });
      } catch (e) {
        // ignore
      }

      // 3. Traverse clonedElement and all descendants, converting styles containing oklch
      const elements = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];
      const win = clonedDoc.defaultView || window;

      const colorProperties = [
        'color',
        'background-color',
        'border-color',
        'border-top-color',
        'border-right-color',
        'border-bottom-color',
        'border-left-color',
        'outline-color',
        'fill',
        'stroke',
        'box-shadow',
      ];

      elements.forEach((elm) => {
        if (!elm || !elm.style) return;

        // Inline style attribute
        const inlineStyle = elm.getAttribute('style');
        if (inlineStyle && inlineStyle.includes('oklch')) {
          elm.setAttribute('style', convertOklchToRgb(inlineStyle));
        }

        // Computed styles
        try {
          const computed = win.getComputedStyle(elm);
          colorProperties.forEach((prop) => {
            const val = computed.getPropertyValue(prop);
            if (val && val.includes('oklch')) {
              elm.style.setProperty(prop, convertOklchToRgb(val), 'important');
            }
          });
        } catch (e) {
          // ignore
        }
      });
    },
  });
};

export const generateInvoicePDF = async (
  elementId: string = 'printable-invoice',
  options: PDFExportOptions = {}
): Promise<{ pdf: jsPDF; blob: Blob; filename: string }> => {
  const targetElementIds = options.elementIds && options.elementIds.length > 0
    ? options.elementIds
    : [elementId];

  const elements: HTMLElement[] = [];
  for (const id of targetElementIds) {
    const el = document.getElementById(id);
    if (el) elements.push(el);
  }

  if (elements.length === 0) {
    throw new Error('فایلی پسووڵەکە ڕوون نییە یان نەدۆزرایەوە');
  }

  // Hide action elements during capture if needed
  const hiddenElements: HTMLElement[] = [];
  elements.forEach((el) => {
    const noPrintEls = el.querySelectorAll('.no-print');
    noPrintEls.forEach((npe) => {
      const htmlEl = npe as HTMLElement;
      if (htmlEl.style.display !== 'none') {
        htmlEl.style.display = 'none';
        hiddenElements.push(htmlEl);
      }
    });
  });

  try {
    const paperSize = options.paperSize || 'A6';
    const orientation = options.orientation || 'landscape';
    const filename = options.filename || `Invoice_${Date.now()}.pdf`;

    const isThermal = paperSize === '80mm' || paperSize === '58mm';
    const thermalWidth = paperSize === '58mm' ? 58 : 80;

    let pdf: jsPDF;
    if (isThermal) {
      // First capture to determine height if single element
      const firstCanvas = await captureElementCanvas(elements[0]);
      const imgWidthMm = firstCanvas.width * 0.264583;
      const imgHeightMm = firstCanvas.height * 0.264583;
      const calcHeightMm = Math.max(80, (imgHeightMm / imgWidthMm) * thermalWidth + 6);

      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [thermalWidth, calcHeightMm],
      });
    } else {
      pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: paperSize.toLowerCase() as any,
      });
    }

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < elements.length; i++) {
      const canvas = await captureElementCanvas(elements[i]);
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const imgWidthMm = canvas.width * 0.264583;
      const imgHeightMm = canvas.height * 0.264583;

      if (i > 0) {
        if (isThermal) {
          const calcHeightMm = Math.max(80, (imgHeightMm / imgWidthMm) * thermalWidth + 6);
          pdf.addPage([thermalWidth, calcHeightMm], 'portrait');
        } else {
          pdf.addPage(paperSize.toLowerCase() as any, orientation);
        }
      }

      const margin = isThermal ? 1 : 2; // tight 1mm margin for thermal
      const availW = pdfWidth - margin * 2;
      const availH = pdfHeight - margin * 2;

      const scaleRatio = Math.min(availW / imgWidthMm, availH / imgHeightMm);
      const printWidth = imgWidthMm * scaleRatio;
      const printHeight = imgHeightMm * scaleRatio;

      const x = (pdfWidth - printWidth) / 2;
      const y = isThermal ? margin : (pdfHeight - printHeight) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, printWidth, printHeight);
    }

    const blob = pdf.output('blob');
    return { pdf, blob, filename };
  } finally {
    hiddenElements.forEach((el) => {
      el.style.display = '';
    });
  }
};

export const downloadInvoicePDF = async (
  elementId: string = 'printable-invoice',
  options: PDFExportOptions = {}
) => {
  const { pdf, filename } = await generateInvoicePDF(elementId, options);
  pdf.save(filename);
};

export const shareInvoicePDF = async (
  elementId: string = 'printable-invoice',
  options: PDFExportOptions = {}
) => {
  const { pdf, blob, filename } = await generateInvoicePDF(elementId, options);

  // Try Web Share API if supported
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: `پسووڵەی فرۆشتنی PDF: ${filename}`,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
  }

  // Fallback: direct download
  pdf.save(filename);
};
