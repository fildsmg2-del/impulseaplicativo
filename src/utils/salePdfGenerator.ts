import jsPDF from 'jspdf';
import { Sale, SaleItem } from '@/services/saleService';
import { Client } from '@/services/clientService';
import { CompanySettings } from '@/services/companySettingsService';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export async function generateSalePDF(
  sale: Sale,
  client: Client,
  company: CompanySettings
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [15, 52, 60]; // impulse-dark
  const goldColor: [number, number, number] = [234, 179, 8]; // impulse-gold

  // Header Background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Company Logo and Info
  yPos = 15;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'Empresa', margin, yPos);

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (company.cnpj) {
    doc.text(`CNPJ: ${company.cnpj}`, margin, yPos);
    yPos += 5;
  }
  if (company.email) {
    doc.text(`Email: ${company.email}`, margin, yPos);
    yPos += 5;
  }
  if (company.phone) {
    doc.text(`Tel: ${company.phone}`, margin, yPos);
  }

  // Sale Number and Date on right
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.sale_number || 'VENDA', pageWidth - margin, 15, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${formatDate(sale.sale_date)}`, pageWidth - margin, 23, { align: 'right' });
  if (sale.estimated_completion_date) {
    doc.text(`Previsão: ${formatDate(sale.estimated_completion_date)}`, pageWidth - margin, 30, { align: 'right' });
  }

  // Title
  yPos = 60;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROVANTE DE VENDA', pageWidth / 2, yPos, { align: 'center' });

  // Status badges
  yPos += 10;
  doc.setFontSize(10);
  const statusText = sale.approval_status === 'APROVADO' ? 'APROVADO' : sale.approval_status === 'REJEITADO' ? 'REJEITADO' : 'PENDENTE';
  const paymentText = sale.payment_status === 'PAGO' ? 'PAGO' : 'PAGAMENTO PENDENTE';
  doc.text(`Status: ${statusText} | ${paymentText}`, pageWidth / 2, yPos, { align: 'center' });

  // Client Section
  yPos += 15;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');

  yPos += 8;
  doc.setTextColor(...goldColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin + 5, yPos);

  yPos += 7;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${client.name}`, margin + 5, yPos);
  doc.text(`Documento: ${client.document}`, pageWidth / 2, yPos);

  yPos += 6;
  doc.text(`Email: ${client.email}`, margin + 5, yPos);
  doc.text(`Telefone: ${client.phone}`, pageWidth / 2, yPos);

  if (client.street) {
    yPos += 6;
    const address = `Endereço: ${client.street}, ${client.number || 's/n'}${client.complement ? ` - ${client.complement}` : ''} - ${client.neighborhood || ''}, ${client.city || ''}/${client.state || ''}`;
    doc.text(address, margin + 5, yPos);
  }

  // Products Table
  yPos += 20;
  doc.setTextColor(...goldColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUTOS/SERVIÇOS', margin, yPos);

  // Table Header
  yPos += 8;
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Item', margin + 3, yPos + 5.5);
  doc.text('Qtd', pageWidth - 80, yPos + 5.5, { align: 'center' });
  doc.text('Valor Unit.', pageWidth - 55, yPos + 5.5, { align: 'right' });
  doc.text('Total', pageWidth - margin - 3, yPos + 5.5, { align: 'right' });

  // Table Body
  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  (sale.items || []).forEach((item: SaleItem, index: number) => {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = margin;
    }

    const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 248, 248];
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');

    doc.text(item.name || '', margin + 3, yPos + 5);
    doc.text(String(item.quantity || 0), pageWidth - 80, yPos + 5, { align: 'center' });
    doc.text(formatCurrency(item.unit_price || 0), pageWidth - 55, yPos + 5, { align: 'right' });
    doc.text(formatCurrency(item.total || 0), pageWidth - margin - 3, yPos + 5, { align: 'right' });

    yPos += 7;
  });

  // Totals
  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', pageWidth - 70, yPos, { align: 'right' });
  doc.text(formatCurrency(sale.subtotal), pageWidth - margin - 3, yPos, { align: 'right' });

  if (sale.discount > 0) {
    yPos += 6;
    doc.setTextColor(220, 50, 50);
    doc.text('Desconto:', pageWidth - 70, yPos, { align: 'right' });
    doc.text(`-${formatCurrency(sale.discount)}`, pageWidth - margin - 3, yPos, { align: 'right' });
  }

  yPos += 8;
  doc.setFillColor(...goldColor);
  doc.roundedRect(pageWidth - margin - 80, yPos - 5, 80, 12, 2, 2, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageWidth - 70, yPos + 3, { align: 'right' });
  doc.text(formatCurrency(sale.total), pageWidth - margin - 3, yPos + 3, { align: 'right' });

  // Notes
  if (sale.notes) {
    yPos += 20;
    doc.setTextColor(...goldColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES', margin, yPos);

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(sale.notes, pageWidth - 2 * margin);
    doc.text(splitNotes, margin, yPos);
    yPos += splitNotes.length * 5;
  }

  // Signatures
  yPos = pageHeight - 50;
  const signWidth = (pageWidth - 2 * margin - 20) / 2;

  // Client Signature
  doc.setDrawColor(150, 150, 150);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, yPos, margin + signWidth, yPos);
  doc.setLineDashPattern([], 0);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text('Assinatura do Cliente', margin + signWidth / 2, yPos + 6, { align: 'center' });
  doc.text(client.name, margin + signWidth / 2, yPos + 12, { align: 'center' });

  // Company Signature
  doc.setLineDashPattern([2, 2], 0);
  doc.line(pageWidth - margin - signWidth, yPos, pageWidth - margin, yPos);
  doc.setLineDashPattern([], 0);
  doc.text('Assinatura da Empresa', pageWidth - margin - signWidth / 2, yPos + 6, { align: 'center' });
  doc.text(company.name || 'Empresa', pageWidth - margin - signWidth / 2, yPos + 12, { align: 'center' });

  // Footer
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(
    `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  // Save
  const fileName = `venda_${sale.sale_number}_${client.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
