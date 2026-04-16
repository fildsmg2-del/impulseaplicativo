import jsPDF from 'jspdf';
import { DroneService } from '@/services/droneService';
import { CompanySettings } from '@/services/companySettingsService';
import { storageService } from '@/services/storageService';

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Não informada';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente',
    TECNICO: 'Em Campo',
    REVISAO: 'Em Revisão',
    FINALIZADO: 'Finalizado',
  };
  return labels[status] || status;
};

async function loadLogoAsBase64(logoUrl: string): Promise<string | null> {
  try {
    const path = storageService.extractPathFromUrl(logoUrl);
    if (path) {
      const base64 = await storageService.getImageAsBase64(path);
      return base64.startsWith('data:image') ? base64 : `data:image/png;base64,${base64}`;
    }
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

export async function generateDroneServicePDF(
  service: DroneService,
  companySettings?: CompanySettings | null
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [15, 52, 60];
  const droneColor: [number, number, number] = [14, 165, 233]; // Blue characteristic for drone services

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
  doc.text(companySettings?.name || 'Impulse Aplicativo', margin + logoWidth, yPos);

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
  doc.text(getStatusLabel(service.status), pageWidth - margin, 20, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('ORDEM DE SERVIÇO - DRONE', pageWidth - margin, 30, { align: 'right' });
  if (service.display_code) {
    doc.text(service.display_code, pageWidth - margin, 36, { align: 'right' });
  }

  // Client Section
  yPos = 55;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');

  yPos += 8;
  doc.setTextColor(...droneColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin + 5, yPos);

  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${service.client_name || service.client?.name || 'Não informado'}`, margin + 5, yPos);
  
  yPos += 6;
  doc.text(`Telefone: ${service.client_phone || 'Não informado'}`, margin + 5, yPos);

  yPos += 6;
  doc.text(`Endereço: ${service.client_address_street || 'Não informado'}`, margin + 5, yPos);

  // Service Details Section
  yPos += 15;
  doc.setTextColor(...droneColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHES DA OPERAÇÃO', margin, yPos);

  yPos += 10;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 66, 3, 3, 'F');

  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Piloto Responsável:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(service.technician?.name || 'Não atribuído', margin + 45, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Área Total (ha):', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${service.area_hectares || '0'} ha`, margin + 45, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Data Abertura:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(service.opening_date), margin + 45, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Data Execução:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(service.execution_date), margin + 45, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Prev. Início:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(service.estimated_start_date), margin + 45, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Prev. Conclusão:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(service.estimated_completion_date), margin + 45, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('GPS / Link:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  const locationLines = doc.splitTextToSize(service.location_link || 'Não informado', pageWidth - margin - 55);
  doc.text(locationLines, margin + 45, yPos);
  yPos += (locationLines.length * 5);

  // Description Section
  if (service.service_description) {
    yPos += 15;
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.setTextColor(...droneColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIÇÃO DO SERVIÇO', margin, yPos);

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(service.service_description, pageWidth - 2 * margin);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 5;
  }

  // Photo Registry
  const images = (service.attachments || []).filter(a => a.type?.startsWith('image/'));
  if (images.length > 0) {
    yPos += 20;
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setTextColor(...droneColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('REGISTRO FOTOGRÁFICO DE CAMPO', margin, yPos);

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
        let base64 = await storageService.getImageAsBase64(img.path || img.url);
        if (base64) {
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/jpeg;base64,${base64}`;
          }
          doc.addImage(base64, 'JPEG', x, yPos, imgWidth, imgHeight, undefined, 'FAST');
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(img.name, x, yPos + imgHeight + 4, { maxWidth: imgWidth });
        }
      } catch (err) {
        doc.rect(x, yPos, imgWidth, imgHeight);
        doc.text("Erro ao carregar imagem", x + 5, yPos + imgHeight/2);
      }
    }
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
  const clientName = (service.client_name || service.client?.name || 'sem_cliente').replace(/\s+/g, '_');
  const fileName = `Drone_OS_${clientName}_${formatDate(service.created_at).replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
