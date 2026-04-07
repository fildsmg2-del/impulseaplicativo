import jsPDF from 'jspdf';
import { Project } from '@/services/projectService';
import { ProjectActivityLog } from '@/services/projectActivityLogService';
import { buildProjectStagesFromTemplate, getStageChecklist, getStageProgress } from '@/components/projects/projectStagesConfig';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { storageService } from '@/services/storageService';
import { projectChecklistTemplateService } from '@/services/projectChecklistTemplateService';

interface ClientInfo {
  name: string;
  phone: string;
  email: string;
  address?: string;
}

interface DocumentFile {
  name: string;
  url: string;
  type: string;
  uploaded_at: string;
}

interface GenerateProjectPdfParams {
  project: Project;
  clientInfo: ClientInfo | null;
  locationInfo: string;
  activityLogs: ProjectActivityLog[];
  stageDocuments: Record<string, DocumentFile[]>;
  checklist: Record<string, boolean>;
  companySettings?: {
    name: string;
    cnpj?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
  };
}

export async function generateProjectPdf({
  project,
  clientInfo,
  locationInfo,
  activityLogs,
  stageDocuments,
  checklist,
  companySettings,
}: GenerateProjectPdfParams): Promise<void> {
  const checklistTemplate = await projectChecklistTemplateService.getTemplate();
  const stages = buildProjectStagesFromTemplate(checklistTemplate);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Header
  pdf.setFillColor(0, 77, 77); // impulse-dark
  pdf.rect(0, 0, pageWidth, 50, 'F');
  
  // Load and add logo if available
  let logoWidth = 0;
  if (companySettings?.logo_url) {
    try {
      const path = storageService.extractPathFromUrl(companySettings.logo_url);
      let logoBase64: string | null = null;
      
      if (path) {
        logoBase64 = await storageService.getImageAsBase64(path);
      } else {
        const response = await fetch(companySettings.logo_url);
        const blob = await response.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', margin, 8, 35, 35);
        logoWidth = 40;
      }
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companySettings?.name || 'Impulse Soluções em Energia', margin + logoWidth, 18);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  let headerY = 25;
  if (companySettings?.cnpj) {
    pdf.text(`CNPJ: ${companySettings.cnpj}`, margin + logoWidth, headerY);
    headerY += 5;
  }
  if (companySettings?.phone) {
    pdf.text(`Tel: ${companySettings.phone}`, margin + logoWidth, headerY);
    headerY += 5;
  }
  if (companySettings?.email) {
    pdf.text(companySettings.email, margin + logoWidth, headerY);
  }
  
  // Document type on right
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RELATÓRIO DO PROJETO', pageWidth - margin, 20, { align: 'right' });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(format(new Date(), 'dd/MM/yyyy', { locale: ptBR }), pageWidth - margin, 28, { align: 'right' });

  yPos = 60;

  // Project Info Box
  pdf.setFillColor(245, 245, 245);
  pdf.roundedRect(margin, yPos, contentWidth, 45, 3, 3, 'F');
  
  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Informações do Projeto', margin + 5, yPos + 8);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Potência: ${project.power_kwp || '-'} kWp`, margin + 5, yPos + 18);
  
  const currentStage = stages.find(s => s.key === project.status);
  pdf.text(`Setor: ${currentStage?.label || project.status}`, margin + 5, yPos + 26);
  
  if (project.start_date) {
    pdf.text(`Início: ${format(new Date(project.start_date), 'dd/MM/yyyy', { locale: ptBR })}`, margin + 5, yPos + 34);
  }
  if (project.estimated_end_date) {
    pdf.text(`Previsão: ${format(new Date(project.estimated_end_date), 'dd/MM/yyyy', { locale: ptBR })}`, margin + contentWidth / 2, yPos + 34);
  }

  yPos += 55;

  // Client Info
  if (clientInfo) {
    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Cliente', margin + 5, yPos + 8);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${clientInfo.name}`, margin + 5, yPos + 18);
    pdf.text(`Telefone: ${clientInfo.phone}`, margin + 5, yPos + 26);
    pdf.text(`Email: ${clientInfo.email}`, margin + contentWidth / 2, yPos + 26);
    
    yPos += 45;
  }

  // Location
  if (locationInfo) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Local de Instalação:', margin, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 6;
    pdf.text(locationInfo, margin, yPos);
    yPos += 15;
  }

  // Checklist por Setor
  addNewPageIfNeeded(30);
  
  pdf.setTextColor(0, 77, 77);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CHECKLIST POR SETOR', margin, yPos);
  yPos += 10;

  for (const stage of stages) {
    addNewPageIfNeeded(40);
    
    const stageChecklist = getStageChecklist(stage.key, project.installation_type, stages, checklistTemplate);
    const stageProgress = getStageProgress(stage.key, checklist, project.installation_type, stages, checklistTemplate);
    
    // Stage header
    pdf.setFillColor(218, 165, 32); // impulse-gold
    pdf.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F');
    pdf.setTextColor(0, 77, 77);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${stage.label} - ${stageProgress}%`, margin + 3, yPos + 6);
    yPos += 12;

    // Checklist items
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    for (const item of stageChecklist) {
      addNewPageIfNeeded(8);
      // Use only item.key - same format as stored in database
      const isChecked = checklist[item.key] || false;
      
      // Checkbox
      pdf.setDrawColor(100, 100, 100);
      pdf.rect(margin + 3, yPos - 3, 4, 4);
      if (isChecked) {
        // Draw green filled checkbox
        pdf.setFillColor(34, 139, 34);
        pdf.rect(margin + 3, yPos - 3, 4, 4, 'F');
        // Draw white checkmark inside the box
        pdf.setDrawColor(255, 255, 255);
        pdf.setLineWidth(0.7);
        // Checkmark starts from bottom-left, goes to bottom-middle, then to top-right
        pdf.line(margin + 3.5, yPos - 1.2, margin + 4.5, yPos - 0.3); // left stroke down
        pdf.line(margin + 4.5, yPos - 0.3, margin + 6.3, yPos - 2.5); // right stroke up
        pdf.setLineWidth(0.2);
        pdf.setDrawColor(100, 100, 100);
      }
      
      pdf.text(item.label, margin + 10, yPos);
      yPos += 6;
    }

    yPos += 5;
  }

  // Activity Logs
  if (activityLogs.length > 0) {
    addNewPageIfNeeded(30);
    
    pdf.setTextColor(0, 77, 77);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HISTÓRICO DE ATIVIDADES', margin, yPos);
    yPos += 10;

    for (const log of activityLogs) {
      addNewPageIfNeeded(25);
      
      const stageLabel = stages.find(s => s.key === log.stage)?.label || log.stage;
      
      pdf.setFillColor(250, 250, 250);
      pdf.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
      
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      pdf.text(
        `${format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - ${log.created_by_name || 'Usuário'} (${log.created_by_role || '-'})`,
        margin + 3,
        yPos + 5
      );
      
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`[${stageLabel}]`, margin + 3, yPos + 12);
      pdf.setFont('helvetica', 'normal');
      
      const descLines = pdf.splitTextToSize(log.description, contentWidth - 10);
      pdf.text(descLines[0] || '', margin + 30, yPos + 12);
      
      yPos += 25;
    }
  }

  // Attachments with photos
  const hasAttachments = Object.values(stageDocuments).some(docs => docs && docs.length > 0);
  if (hasAttachments) {
    addNewPageIfNeeded(30);
    
    pdf.setTextColor(0, 77, 77);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANEXOS', margin, yPos);
    yPos += 10;

    for (const [stageName, docs] of Object.entries(stageDocuments)) {
      if (!docs || docs.length === 0) continue;
      
      addNewPageIfNeeded(15);
      const stageLabel = stages.find(s => s.key === stageName)?.label || stageName;
      
      pdf.setTextColor(0, 77, 77);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stageLabel, margin, yPos);
      yPos += 6;

      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');

      for (const doc of docs) {
        const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(doc.type.toLowerCase());
        
        if (isImage && doc.url) {
          // Add image to PDF
          addNewPageIfNeeded(70);
          
          try {
            // Extract path from URL and proxy through edge function to avoid CORS
            const path = storageService.extractPathFromUrl(doc.url);
            let base64: string;
            
            if (path) {
              // Use proxy to get image as base64
              base64 = await storageService.getImageAsBase64(path);
            } else {
              // Fallback to direct fetch
              const response = await fetch(doc.url);
              const blob = await response.blob();
              base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            }
            
            // Add image with max dimensions
            const imgWidth = Math.min(contentWidth - 10, 80);
            const imgHeight = 60;
            
            pdf.text(`• ${doc.name}`, margin + 5, yPos);
            yPos += 5;
            
            // Determine format from base64 header or file type
            const format = doc.type.toLowerCase() === 'png' ? 'PNG' : 'JPEG';
            pdf.addImage(base64, format, margin + 5, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 8;
          } catch (error) {
            console.error('Error loading image for PDF:', error);
            pdf.text(`• ${doc.name} (${doc.type.toUpperCase()}) - Erro ao carregar imagem`, margin + 5, yPos);
            yPos += 5;
          }
        } else {
          addNewPageIfNeeded(8);
          pdf.text(`• ${doc.name} (${doc.type.toUpperCase()})`, margin + 5, yPos);
          yPos += 5;
        }
      }
      
      yPos += 5;
    }
  }

  // Footer on each page
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save
  const fileName = `projeto_${project.id.substring(0, 8)}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  pdf.save(fileName);
}
