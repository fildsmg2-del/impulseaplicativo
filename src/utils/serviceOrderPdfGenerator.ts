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
  const serviceTypeLines = doc.splitTextToSize(serviceOrder.service_type, pageWidth - 2 * margin - 10);
  const detailsBoxHeight = 35 + (serviceTypeLines.length * 5);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, detailsBoxHeight, 3, 3, 'F');

  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Tipo de Serviço:', margin + 5, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(serviceTypeLines, margin + 5, yPos);
  yPos += serviceTypeLines.length * 5;

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Responsável:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(serviceOrder.technician?.name || 'Não atribuído', margin + 35, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Data Abertura:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(serviceOrder.created_at), margin + 35, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Data Execução:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(serviceOrder.execution_date ? formatDate(serviceOrder.execution_date) : 'Não definida', margin + 35, yPos);

  if (serviceOrder.deadline_date) {
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Prazo Final:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    const deadlineColor: [number, number, number] = new Date(serviceOrder.deadline_date) < new Date() ? [220, 38, 38] : [0, 0, 0];
    doc.setTextColor(...deadlineColor);
    doc.text(formatDate(serviceOrder.deadline_date), margin + 35, yPos);
    doc.setTextColor(0, 0, 0);
  }

  // Checklist Section
  if (serviceOrder.checklist_state && serviceOrder.checklist_state.length > 0) {
    yPos += 15;
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    doc.setTextColor(...goldColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CHECKLIST DE SERVIÇO', margin, yPos);

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    const checklistCols = 2;
    const colWidth = (pageWidth - 2 * margin) / checklistCols;
    
    serviceOrder.checklist_state.forEach((item, index) => {
      const col = index % checklistCols;
      const row = Math.floor(index / checklistCols);
      const x = margin + (col * colWidth);
      const currentY = yPos + (row * 6);

      if (currentY > pageHeight - 20) {
        // This is simplified, for many items it might skip rows. 
        // But OS checklists are usually short.
      }

      // Draw checkbox
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, currentY - 3.5, 4, 4);
      if (item.checked) {
        doc.setFont('zapfdingbats');
        doc.text('4', x + 0.5, currentY - 0.5); // Checkmark in ZapfDingbats
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      
      const labelLines = doc.splitTextToSize(item.label, colWidth - 10);
      doc.text(labelLines[0], x + 6, currentY);
    });
    
    yPos += (Math.ceil(serviceOrder.checklist_state.length / checklistCols) * 6) + 5;
  }

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

  // Attachments & Images Section
  const attachments = serviceOrder.attachments || [];
  const images = attachments.filter(a => a.type?.startsWith('image/'));
  const otherFiles = attachments.filter(a => !a.type?.startsWith('image/'));

  if (images.length > 0) {
    yPos += 15;
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setTextColor(...goldColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('REGISTRO FOTOGRÁFICO', margin, yPos);

    yPos += 10;
    
    const imgWidth = (pageWidth - 2 * margin - 10) / 2;
    const imgHeight = 60;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const col = i % 2;
      const x = margin + (col * (imgWidth + 10));

      if (col === 0 && i > 0) {
        yPos += imgHeight + 15;
      }

      if (yPos + imgHeight > pageHeight - 20) {
        doc.addPage();
        yPos = margin + 10;
      }

      try {
        const base64 = await storageService.getImageAsBase64(img.path || img.url);
        if (base64) {
          doc.addImage(base64, 'JPEG', x, yPos, imgWidth, imgHeight, undefined, 'FAST');
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(img.name, x, yPos + imgHeight + 4, { maxWidth: imgWidth });
        }
      } catch (err) {
        console.error("Error adding image to PDF", err);
        doc.rect(x, yPos, imgWidth, imgHeight);
        doc.text("Erro ao carregar imagem", x + 5, yPos + imgHeight/2);
      }
    }
    yPos += imgHeight + 20;
  }

  if (otherFiles.length > 0) {
    yPos += 10;
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    doc.setTextColor(...goldColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('OUTROS ANEXOS', margin, yPos);

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    otherFiles.forEach((attachment: any, index: number) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(`${index + 1}. ${attachment.name} (${attachment.sector || 'Geral'})`, margin + 5, yPos);
      yPos += 6;
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
