import jsPDF from 'jspdf';
import { ServiceOrder } from '@/services/serviceOrderService';
import { ServiceOrderLog } from '@/services/serviceOrderLogService';
import { CompanySettings } from '@/services/companySettingsService';
import { storageService } from '@/services/storageService';

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    EM_ABERTO: 'Em Aberto',
    EM_TRATAMENTO: 'Em Tratamento',
    EM_EXECUCAO: 'Em Execução',
    CONCLUIDO: 'Concluído',
  };
  return labels[status] || status;
};

async function loadLogoAsBase64(logoUrl: string): Promise<string | null> {
  try {
    const path = storageService.extractPathFromUrl(logoUrl);
    if (path) {
      return await storageService.getImageAsBase64(path);
    }
    // Fallback to direct fetch
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
}

export async function generateServiceOrderPDF(
  serviceOrder: ServiceOrder,
  logs: ServiceOrderLog[],
  companySettings?: CompanySettings | null
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [15, 52, 60];
  const goldColor: [number, number, number] = [234, 179, 8];

  // Header Background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Load and add logo if available
  let logoWidth = 0;
  if (companySettings?.logo_url) {
    try {
      const logoBase64 = await loadLogoAsBase64(companySettings.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, 8, 35, 35);
        logoWidth = 40;
      }
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }

  // Company Name and Info
  yPos = 15;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companySettings?.name || 'Empresa', margin + logoWidth, yPos);

  yPos += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (companySettings?.cnpj) {
    doc.text(`CNPJ: ${companySettings.cnpj}`, margin + logoWidth, yPos);
    yPos += 5;
  }
  if (companySettings?.phone) {
    doc.text(`Tel: ${companySettings.phone}`, margin + logoWidth, yPos);
    yPos += 5;
  }
  if (companySettings?.email) {
    doc.text(companySettings.email, margin + logoWidth, yPos);
  }

  // Status badge on right
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(getStatusLabel(serviceOrder.status), pageWidth - margin, 20, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('ORDEM DE SERVIÇO', pageWidth - margin, 30, { align: 'right' });

  // Title

  // Client Section
  yPos = 55;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, 'F');

  yPos += 8;
  doc.setTextColor(...goldColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin + 5, yPos);

  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${serviceOrder.client?.name || 'Não informado'}`, margin + 5, yPos);
  
  yPos += 6;
  doc.text(`Telefone: ${serviceOrder.client?.phone || 'Não informado'}`, margin + 5, yPos);

  // Service Details Section
  yPos += 20;
  doc.setTextColor(...goldColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHES DO SERVIÇO', margin, yPos);

  yPos += 10;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 40, 3, 3, 'F');

  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Tipo de Serviço:', margin + 5, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  const serviceTypeLines = doc.splitTextToSize(serviceOrder.service_type, pageWidth - 2 * margin - 10);
  doc.text(serviceTypeLines, margin + 5, yPos);
  yPos += serviceTypeLines.length * 5;

  yPos += 5;
  doc.text(`Data de Execução: ${serviceOrder.execution_date ? formatDate(serviceOrder.execution_date) : 'Não definida'}`, margin + 5, yPos);

  // Notes Section
  if (serviceOrder.notes) {
    yPos += 20;
    doc.setTextColor(...goldColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES', margin, yPos);

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(serviceOrder.notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 5;
  }

  // Attachments Section
  const attachments = serviceOrder.attachments || [];
  if (attachments.length > 0) {
    yPos += 15;
    
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setTextColor(...goldColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`ANEXOS (${attachments.length})`, margin, yPos);

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    attachments.forEach((attachment: any, index: number) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      
      const bgColor = index % 2 === 0 ? [248, 248, 248] : [255, 255, 255];
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.roundedRect(margin, yPos - 3, pageWidth - 2 * margin, 10, 2, 2, 'F');
      
      doc.text(`${index + 1}. ${attachment.name}`, margin + 5, yPos + 3);
      yPos += 12;
    });
  }

  // Activity Log Section
  if (logs.length > 0) {
    yPos += 15;
    
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setTextColor(...goldColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DIÁRIO DA OS - HISTÓRICO DE ATIVIDADES', margin, yPos);

    yPos += 10;

    logs.forEach((log, index) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = margin;
      }

      // Log entry background
      doc.setFillColor(250, 250, 250);
      const descLines = doc.splitTextToSize(log.description, pageWidth - 2 * margin - 10);
      const boxHeight = 25 + (descLines.length * 5);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, boxHeight, 3, 3, 'F');

      // Header with author info
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(log.created_by_name || 'Usuário', margin + 5, yPos);

      // Role badge
      if (log.created_by_role) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const nameWidth = doc.getTextWidth(log.created_by_name || 'Usuário');
        doc.text(`(${log.created_by_role})`, margin + 5 + nameWidth + 5, yPos);
      }

      // Date/time on right
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(formatDateTime(log.created_at), pageWidth - margin - 5, yPos, { align: 'right' });

      // Description
      yPos += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(descLines, margin + 5, yPos);
      
      yPos += descLines.length * 5 + 15;
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...primaryColor);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(
      `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} | Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Save
  const clientName = serviceOrder.client?.name?.replace(/\s+/g, '_') || 'sem_cliente';
  const fileName = `OS_${clientName}_${formatDate(serviceOrder.created_at).replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
