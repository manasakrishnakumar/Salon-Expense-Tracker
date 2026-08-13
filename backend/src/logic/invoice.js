import PDFDocument from 'pdfkit';

/**
 * Streams a simple receipt PDF for one service record directly into `res`.
 * Kept as a small, isolated function (not inline in the controller) so the
 * layout can be unit-tested for "does this throw / does it produce bytes"
 * without needing a real HTTP request.
 */
export function streamReceipt(record, res) {
  const doc = new PDFDocument({ size: 'A5', margin: 40 });
  doc.pipe(res);

  const amount = record.totalPrice || record.totalCost || 0;
  const unit = record.unitPrice || record.unitCost || 0;

  doc.fontSize(20).fillColor('#7C3AED').text('Salon Pro', { align: 'center' });
  doc.fontSize(10).fillColor('gray').text('Service Receipt', { align: 'center' });
  doc.moveDown(1.5);

  doc.fillColor('black').fontSize(11);
  doc.text(`Receipt #: ${record.$id}`);
  doc.text(`Date: ${new Date(record.Date).toLocaleString('en-IN')}`);
  doc.moveDown();

  doc.fontSize(13).text(record.serviceName, { continued: false });
  doc.fontSize(10).fillColor('gray').text(`Worker: ${record.WorkerName || record.recordedByName || '—'}`);
  doc.fillColor('black');
  doc.moveDown();

  doc.fontSize(11);
  doc.text(`Quantity: ${record.quantity}`);
  doc.text(`Unit price: Rs. ${Number(unit).toFixed(2)}`);
  doc.moveDown();

  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#ddd').stroke();
  doc.moveDown();

  doc.fontSize(16).fillColor('#10B981').text(`Total: Rs. ${Number(amount).toFixed(2)}`, { align: 'right' });
  doc.moveDown(2);

  doc.fontSize(9).fillColor('gray').text('Thank you for your visit!', { align: 'center' });

  doc.end();
}
