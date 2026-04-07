import jsPDF from 'jspdf';
import { QuoteFormData } from '@/components/quotes/QuoteWizard';
import logoImpulse from '@/assets/logo-impulse.png';
import solarSystemCover from '@/assets/solar-system-cover.jpg';
import monitoringMobileApp from '@/assets/monitoring-mobile-app.jpg';
import monitoringWebDashboard from '@/assets/monitoring-web-dashboard.jpg';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number, decimals: number = 2) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);

// Impulse Brand Colors (converted from HSL to RGB)
const impulseDark: [number, number, number] = [12, 80, 80]; // Dark teal
const impulseGold: [number, number, number] = [245, 166, 35]; // Golden yellow
const impulseDarkDeep: [number, number, number] = [8, 56, 56]; // Deeper teal
const darkText: [number, number, number] = [30, 40, 50];
const grayText: [number, number, number] = [100, 110, 120];
const lightBg: [number, number, number] = [248, 250, 252];
const white: [number, number, number] = [255, 255, 255];

// Helper: Draw elegant section header with gold accent
function drawSectionHeader(doc: jsPDF, text: string, y: number, pageWidth: number, margin: number): number {
  // Gold accent line
  doc.setFillColor(...impulseGold);
  doc.rect(margin, y, 4, 12, 'F');
  
  // Dark teal background
  doc.setFillColor(...impulseDark);
  doc.rect(margin + 4, y, pageWidth * 0.5, 12, 'F');
  
  // Text
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(text, margin + 10, y + 8);
  
  return y + 18;
}

// Helper: Draw info box with icon-like styling
function drawInfoBox(doc: jsPDF, label: string, value: string, x: number, y: number, width: number, height: number): void {
  // Background
  doc.setFillColor(...lightBg);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');
  
  // Gold top border
  doc.setFillColor(...impulseGold);
  doc.rect(x, y, width, 2, 'F');
  
  // Label
  doc.setTextColor(...grayText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x + 5, y + 10);
  
  // Value
  doc.setTextColor(...impulseDark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + 5, y + 20);
}

// Helper: Draw table with modern styling
function drawModernTable(
  doc: jsPDF, 
  headers: string[], 
  rows: string[][], 
  y: number, 
  colWidths: number[], 
  startX: number
): number {
  const headerHeight = 10;
  const rowHeight = 8;
  let currentY = y;
  
  // Header row with dark teal
  doc.setFillColor(...impulseDark);
  let totalWidth = colWidths.reduce((a, b) => a + b, 0);
  doc.rect(startX, currentY, totalWidth, headerHeight, 'F');
  
  // Header text
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  let x = startX;
  headers.forEach((header, i) => {
    const align = i === 0 ? 'left' : 'center';
    const textX = i === 0 ? x + 3 : x + colWidths[i] / 2;
    doc.text(header, textX, currentY + 7, { align });
    x += colWidths[i];
  });
  currentY += headerHeight;
  
  // Data rows
  rows.forEach((row, rowIndex) => {
    // Alternate row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.rect(startX, currentY, totalWidth, rowHeight, 'F');
    }
    
    doc.setTextColor(...darkText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    x = startX;
    row.forEach((cell, i) => {
      const align = i === 0 ? 'left' : 'center';
      const textX = i === 0 ? x + 3 : x + colWidths[i] / 2;
      doc.text(cell, textX, currentY + 5.5, { align });
      x += colWidths[i];
    });
    
    // Bottom border
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.2);
    doc.line(startX, currentY + rowHeight, startX + totalWidth, currentY + rowHeight);
    
    currentY += rowHeight;
  });
  
  return currentY + 5;
}

// Helper: Add elegant footer
function addFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageNum: number, totalPages: number): void {
  const website = 'www.impulsenergia.com.br';
  
  // Gold accent line at bottom
  doc.setFillColor(...impulseGold);
  doc.rect(0, pageHeight - 10, pageWidth, 1, 'F');
  
  // Page number
  doc.setTextColor(...grayText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${pageNum}/${totalPages}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
  
  // Website
  doc.setTextColor(...impulseDark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(website.toUpperCase(), pageWidth - 15, pageHeight - 4, { align: 'right' });
}

// Generate static map URL
function getStaticMapUrl(lat: number, lng: number): string {
  // Using OpenStreetMap static tiles
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=400x200&markers=${lat},${lng},red`;
}

// Generate cash flow data for 25 years
function generateCashFlowData(formData: QuoteFormData): Array<{
  year: number;
  generation: number;
  energyPrice: number;
  savings: number;
  investment: number;
  cumulative: number;
}> {
  const data = [];
  const initialInvestment = formData.total || 0;
  const annualGeneration = (formData.estimated_generation_kwh || 0) * 12;
  const initialTariff = formData.tariff || 0.80;
  const degradationRate = 0.008;
  const tariffIncrease = 0.095;
  const inverterReplacement = initialInvestment * 0.20;
  
  let cumulative = -initialInvestment;
  
  for (let year = 0; year <= 24; year++) {
    const generation = annualGeneration * Math.pow(1 - degradationRate, year);
    const energyPrice = initialTariff * Math.pow(1 + tariffIncrease, year);
    const savings = generation * energyPrice;
    const investment = year === 0 ? -initialInvestment : (year === 15 ? -inverterReplacement : 0);
    
    cumulative += savings + (year === 0 ? 0 : (year === 15 ? -inverterReplacement : 0));
    
    data.push({
      year,
      generation: Math.round(generation),
      energyPrice,
      savings,
      investment,
      cumulative,
    });
  }
  
  return data;
}

export async function generateQuotePDF(formData: QuoteFormData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const totalPages = 8;
  
  const companyName = 'Impulse Soluções em Energia';
  const clientName = formData.client?.name || 'Cliente';
  const clientEmail = formData.client?.email || '';
  const clientPhone = formData.client?.phone || '';
  const website = 'www.impulsenergia.com.br';
  
  
  // ============= PAGE 1: COVER =============
  // Full page dark teal background gradient
  doc.setFillColor(...impulseDarkDeep);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Lighter teal accent area (no black line)
  doc.setFillColor(...impulseDark);
  doc.rect(pageWidth * 0.5, 0, pageWidth * 0.5, pageHeight * 0.65, 'F');
  
  // Logo at top left
  try {
    doc.addImage(logoImpulse, 'PNG', margin, margin, 55, 28);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPULSE', margin + 5, 35);
  }
  
  // Gold accent line
  doc.setFillColor(...impulseGold);
  doc.rect(margin, 55, 60, 3, 'F');
  
  // Main title
  doc.setTextColor(...white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('PROPOSTA', margin, 75);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('COMERCIAL', margin, 92);
  
  // Solar system image in center-right
  try {
    doc.addImage(solarSystemCover, 'JPEG', pageWidth * 0.35, 105, pageWidth * 0.58, 80);
  } catch (e) {
    // Fallback design element
    doc.setFillColor(...impulseGold);
    doc.circle(pageWidth * 0.7, 145, 25, 'F');
  }
  
  // Gold decorative element
  doc.setFillColor(...impulseGold);
  doc.rect(0, pageHeight - 80, pageWidth * 0.4, 4, 'F');
  
  // Client info box at bottom
  doc.setFillColor(255, 255, 255, 0.1);
  doc.roundedRect(margin, pageHeight - 70, contentWidth, 50, 3, 3, 'F');
  
  doc.setTextColor(...impulseGold);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('ELABORADO PARA', margin + 10, pageHeight - 55);
  
  doc.setTextColor(...white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(clientName.toUpperCase(), margin + 10, pageHeight - 42);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (clientEmail) doc.text(clientEmail, margin + 10, pageHeight - 32);
  if (clientPhone) doc.text(clientPhone, margin + 10, pageHeight - 24);
  
  // Date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setTextColor(...impulseGold);
  doc.setFontSize(9);
  doc.text(formattedDate.toUpperCase(), pageWidth - margin, pageHeight - 25, { align: 'right' });
  
  // ============= PAGE 2: QUEM SOMOS =============
  doc.addPage();
  let yPos = margin + 10;
  
  // Header with logo
  try {
    doc.addImage(logoImpulse, 'PNG', margin, margin, 40, 20);
  } catch (e) {}
  
  yPos = 45;
  yPos = drawSectionHeader(doc, 'QUEM SOMOS', yPos, pageWidth, margin);
  
  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const quemSomosText = 'Somos uma empresa focada em energia solar, atuando há anos em Minas Gerais. Fornecemos uma solução completa para implantação de energia solar, seja para baixa ou alta tensão. Somos fornecedores das melhores marcas do mercado, preocupados sempre em oferecer alta qualidade na instalação dos produtos ou no serviço prestado.';
  const lines = doc.splitTextToSize(quemSomosText, contentWidth);
  doc.text(lines, margin, yPos);
  yPos += lines.length * 5 + 12;
  
  // Benefits icons row
  const benefits = [
    { title: 'ECONOMIA', desc: 'Até 95% na conta' },
    { title: 'SUSTENTÁVEL', desc: 'Energia limpa' },
    { title: 'VALORIZAÇÃO', desc: 'Do seu imóvel' },
  ];
  
  const benefitWidth = (contentWidth - 20) / 3;
  benefits.forEach((benefit, i) => {
    const bx = margin + i * (benefitWidth + 10);
    doc.setFillColor(...impulseDark);
    doc.roundedRect(bx, yPos, benefitWidth, 30, 2, 2, 'F');
    
    doc.setTextColor(...impulseGold);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(benefit.title, bx + benefitWidth / 2, yPos + 12, { align: 'center' });
    
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(benefit.desc, bx + benefitWidth / 2, yPos + 22, { align: 'center' });
  });
  yPos += 40;
  
  // Soluções section
  yPos = drawSectionHeader(doc, 'NOSSAS SOLUÇÕES', yPos, pageWidth, margin);
  
  const solutions = ['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'RURAL'];
  const solWidth = (contentWidth - 15) / 4;
  solutions.forEach((sol, i) => {
    const sx = margin + i * (solWidth + 5);
    doc.setFillColor(...impulseGold);
    doc.roundedRect(sx, yPos, solWidth, 20, 2, 2, 'F');
    
    doc.setTextColor(...impulseDarkDeep);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(sol, sx + solWidth / 2, yPos + 12, { align: 'center' });
  });
  yPos += 30;
  
  doc.setTextColor(...darkText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const solucoesText = 'A geração de energia elétrica através da energia solar já é mais barata que a energia gerada por outras fontes. Com o aumento constante das tarifas de energia elétrica, a geração solar ficou ainda mais atrativa. Em 5 anos as tarifas subiram mais de 80%. Com um sistema fotovoltaico, você gera sua própria energia e fica imune aos aumentos tarifários.';
  const solucoesLines = doc.splitTextToSize(solucoesText, contentWidth);
  doc.text(solucoesLines, margin, yPos);
  yPos += solucoesLines.length * 4.5 + 12;
  
  // O planeta agradece
  yPos = drawSectionHeader(doc, 'O PLANETA AGRADECE', yPos, pageWidth, margin);
  
  const planetaText = 'A energia solar é limpa e livre de geração de gases de efeito estufa. Diferente da geração termoelétrica ou nuclear, onde gases e resíduos são gerados. Ao instalar um sistema solar, você contribui ativamente para um futuro mais sustentável.';
  const planetaLines = doc.splitTextToSize(planetaText, contentWidth);
  doc.text(planetaLines, margin, yPos);
  
  addFooter(doc, pageWidth, pageHeight, 2, totalPages);
  
  // ============= PAGE 3: SISTEMA PROPOSTO =============
  doc.addPage();
  yPos = margin + 10;
  
  try {
    doc.addImage(logoImpulse, 'PNG', margin, margin, 40, 20);
  } catch (e) {}
  
  yPos = 45;
  yPos = drawSectionHeader(doc, 'SISTEMA FOTOVOLTAICO PROPOSTO', yPos, pageWidth, margin);
  
  // Key metrics boxes
  const boxWidth = (contentWidth - 20) / 3;
  const boxHeight = 28;
  
  drawInfoBox(doc, 'POTÊNCIA DO SISTEMA', `${formatNumber(formData.recommended_power_kwp || 0)} kWp`, margin, yPos, boxWidth, boxHeight);
  drawInfoBox(doc, 'GERAÇÃO MENSAL', `${formatNumber(formData.estimated_generation_kwh || 0, 0)} kWh`, margin + boxWidth + 10, yPos, boxWidth, boxHeight);
  drawInfoBox(doc, 'MÓDULOS', `${formData.modules_quantity || 0} unidades`, margin + (boxWidth + 10) * 2, yPos, boxWidth, boxHeight);
  yPos += boxHeight + 10;
  
  // Second row of boxes
  const minArea = Math.round((formData.modules_quantity || 0) * 2.5);
  drawInfoBox(doc, 'ÁREA NECESSÁRIA', `${minArea} m²`, margin, yPos, boxWidth, boxHeight);
  drawInfoBox(doc, 'CONSUMO MÉDIO', `${formatNumber(formData.average_monthly_kwh || 0, 0)} kWh`, margin + boxWidth + 10, yPos, boxWidth, boxHeight);
  drawInfoBox(doc, 'ECONOMIA', `~${formatNumber(((formData.estimated_generation_kwh || 0) / Math.max(formData.average_monthly_kwh || 1, 1)) * 100, 0)}%`, margin + (boxWidth + 10) * 2, yPos, boxWidth, boxHeight);
  yPos += boxHeight + 15;
  
  // Equipment table
  yPos = drawSectionHeader(doc, 'EQUIPAMENTOS', yPos, pageWidth, margin);
  
  const equipmentRows: string[][] = [];
  if (formData.modules) {
    equipmentRows.push(['Módulos Fotovoltaicos', formData.modules, String(formData.modules_quantity || 0)]);
  }
  if (formData.inverter) {
    equipmentRows.push(['Inversor Solar', formData.inverter, '1']);
  }
  if (formData.structure) {
    equipmentRows.push(['Estrutura de Fixação', formData.structure, '1']);
  }
  equipmentRows.push(['Cabos e Conectores', 'Kit completo MC4/Solar', '1']);
  equipmentRows.push(['String Box', 'Proteção CC/CA', '1']);
  
  yPos = drawModernTable(
    doc,
    ['Componente', 'Descrição', 'Qtd'],
    equipmentRows,
    yPos,
    [50, 95, 25],
    margin
  );
  yPos += 10;
  
  // Local de instalação
  yPos = drawSectionHeader(doc, 'LOCAL DE INSTALAÇÃO', yPos, pageWidth, margin);
  
  const fullAddress = [
    formData.address_street,
    formData.address_number,
    formData.address_neighborhood,
    formData.address_city,
    formData.address_state,
    formData.address_zip_code
  ].filter(Boolean).join(', ') || 'Endereço a confirmar';
  
  doc.setTextColor(...darkText);
  doc.setFontSize(9);
  doc.text(fullAddress, margin, yPos);
  yPos += 8;
  
  // Roof type info
  const roofTypeLabel = formData.roof_type === 'CERAMICA' ? 'Cerâmica' : 
                        formData.roof_type === 'FIBROCIMENTO' ? 'Fibrocimento' :
                        formData.roof_type === 'METALICA' ? 'Metálica' : 
                        formData.roof_type === 'LAJE' ? 'Laje' : 'A consultar';
  
  doc.setTextColor(...grayText);
  doc.setFontSize(8);
  doc.text(`Tipo de telhado: ${roofTypeLabel}`, margin, yPos);
  
  addFooter(doc, pageWidth, pageHeight, 3, totalPages);
  
  // ============= PAGE 4: ANÁLISE FINANCEIRA =============
  doc.addPage();
  yPos = margin + 10;
  
  try {
    doc.addImage(logoImpulse, 'PNG', margin, margin, 40, 20);
  } catch (e) {}
  
  yPos = 45;
  yPos = drawSectionHeader(doc, 'ANÁLISE FINANCEIRA DO INVESTIMENTO', yPos, pageWidth, margin);
  
  // Main investment box
  doc.setFillColor(...impulseDark);
  doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
  
  doc.setTextColor(...impulseGold);
  doc.setFontSize(10);
  doc.text('INVESTIMENTO TOTAL', margin + 15, yPos + 12);
  
  doc.setTextColor(...white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(formData.total || 0), margin + 15, yPos + 28);
  
  // Power info on right
  doc.setTextColor(...impulseGold);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatNumber(formData.recommended_power_kwp || 0)} kWp`, contentWidth - 10, yPos + 20, { align: 'right' });
  
  yPos += 45;
  
  // Financial metrics
  const paybackYears = Math.floor((formData.payback_months || 0) / 12);
  const paybackMonths = (formData.payback_months || 0) % 12;
  const monthlySavings = formData.monthly_savings || ((formData.estimated_generation_kwh || 0) * (formData.tariff || 0));
  const annualSavings = monthlySavings * 12;
  const roi25 = formData.roi_25_years || 0;
  
  const finBoxWidth = (contentWidth - 15) / 2;
  const finBoxHeight = 35;
  
  // Payback box
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, yPos, finBoxWidth, finBoxHeight, 2, 2, 'F');
  doc.setFillColor(...impulseGold);
  doc.rect(margin, yPos, 4, finBoxHeight, 'F');
  
  doc.setTextColor(...grayText);
  doc.setFontSize(9);
  doc.text('RETORNO DO INVESTIMENTO', margin + 10, yPos + 12);
  doc.setTextColor(...impulseDark);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${paybackYears} anos e ${paybackMonths} meses`, margin + 10, yPos + 27);
  
  // Monthly savings box
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin + finBoxWidth + 15, yPos, finBoxWidth, finBoxHeight, 2, 2, 'F');
  doc.setFillColor(...impulseGold);
  doc.rect(margin + finBoxWidth + 15, yPos, 4, finBoxHeight, 'F');
  
  doc.setTextColor(...grayText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('ECONOMIA MENSAL', margin + finBoxWidth + 25, yPos + 12);
  doc.setTextColor(...impulseDark);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(monthlySavings), margin + finBoxWidth + 25, yPos + 27);
  
  yPos += finBoxHeight + 10;
  
  // Second row - Annual savings and ROI
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, yPos, finBoxWidth, finBoxHeight, 2, 2, 'F');
  doc.setFillColor(...impulseGold);
  doc.rect(margin, yPos, 4, finBoxHeight, 'F');
  
  doc.setTextColor(...grayText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('ECONOMIA ANUAL', margin + 10, yPos + 12);
  doc.setTextColor(...impulseDark);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(annualSavings), margin + 10, yPos + 27);
  
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin + finBoxWidth + 15, yPos, finBoxWidth, finBoxHeight, 2, 2, 'F');
  doc.setFillColor(...impulseGold);
  doc.rect(margin + finBoxWidth + 15, yPos, 4, finBoxHeight, 'F');
  
  doc.setTextColor(...grayText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('RETORNO EM 25 ANOS', margin + finBoxWidth + 25, yPos + 12);
  doc.setTextColor(...impulseDark);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(roi25), margin + finBoxWidth + 25, yPos + 27);
  
  addFooter(doc, pageWidth, pageHeight, 4, totalPages);
  
  // ============= PAGE 5: FLUXO DE CAIXA COMPLETO =============
  doc.addPage();
  yPos = margin + 10;
  
  try {
    doc.addImage(logoImpulse, 'PNG', margin, margin, 40, 20);
  } catch (e) {}
  
  yPos = 45;
  yPos = drawSectionHeader(doc, 'PROJEÇÃO DE FLUXO DE CAIXA - 25 ANOS', yPos, pageWidth, margin);
  
  const cashFlowData = generateCashFlowData(formData);
  
  // Full table with all 25 years
  const cfColWidths = [22, 38, 32, 38, 40];
  const cfHeaderHeight = 9;
  const cfRowHeight = 7;
  
  // Header
  doc.setFillColor(...impulseDark);
  const cfTotalWidth = cfColWidths.reduce((a, b) => a + b, 0);
  doc.rect(margin, yPos, cfTotalWidth, cfHeaderHeight, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  const cfHeaders = ['Ano', 'Geração (kWh)', 'Preço (R$/kWh)', 'Economia (R$)', 'Acumulado (R$)'];
  let cfX = margin;
  cfHeaders.forEach((header, i) => {
    const align = i === 0 ? 'left' : 'center';
    const textX = i === 0 ? cfX + 3 : cfX + cfColWidths[i] / 2;
    doc.text(header, textX, yPos + 6, { align });
    cfX += cfColWidths[i];
  });
  yPos += cfHeaderHeight;
  
  // Data rows
  cashFlowData.forEach((row, rowIndex) => {
    // Alternate row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.rect(margin, yPos, cfTotalWidth, cfRowHeight, 'F');
    }
    
    // Highlight payback year
    const isPaybackYear = row.cumulative >= 0 && (rowIndex === 0 || cashFlowData[rowIndex - 1].cumulative < 0);
    if (isPaybackYear) {
      doc.setFillColor(...impulseGold);
      doc.rect(margin, yPos, cfTotalWidth, cfRowHeight, 'F');
    }
    
    doc.setTextColor(...(isPaybackYear ? impulseDarkDeep : darkText));
    doc.setFontSize(7);
    doc.setFont('helvetica', isPaybackYear ? 'bold' : 'normal');
    
    const cells = [
      String(row.year),
      formatNumber(row.generation, 0),
      formatNumber(row.energyPrice, 3),
      formatNumber(row.savings, 2),
      formatNumber(row.cumulative, 2),
    ];
    
    cfX = margin;
    cells.forEach((cell, i) => {
      const align = i === 0 ? 'left' : 'center';
      const textX = i === 0 ? cfX + 3 : cfX + cfColWidths[i] / 2;
      doc.text(cell, textX, yPos + 5, { align });
      cfX += cfColWidths[i];
    });
    
    // Bottom border
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.1);
    doc.line(margin, yPos + cfRowHeight, margin + cfTotalWidth, yPos + cfRowHeight);
    
    yPos += cfRowHeight;
  });
  
  yPos += 10;
  
  // Legend
  doc.setFillColor(...impulseGold);
  doc.rect(margin, yPos, 15, 8, 'F');
  doc.setTextColor(...darkText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('= Ano do retorno do investimento (Payback)', margin + 20, yPos + 6);
  
  yPos += 15;
  
  // Summary info
  doc.setTextColor(...grayText);
  doc.setFontSize(7);
  doc.text('* Considera degradação de 0,8% a.a. nos módulos e reajuste de 9,5% a.a. na tarifa de energia.', margin, yPos);
  doc.text('* Troca do inversor prevista no ano 15 (20% do investimento inicial).', margin, yPos + 5);
  
  addFooter(doc, pageWidth, pageHeight, 5, totalPages);
  
  // ============= PAGE 6: MONITORAMENTO =============
  doc.addPage();
  yPos = margin + 10;
  
  try {
    doc.addImage(logoImpulse, 'PNG', margin, margin, 40, 20);
  } catch (e) {}
  
  yPos = 45;
  
  // Title section with gold accent
  doc.setFillColor(...impulseGold);
  doc.rect(margin, yPos, contentWidth, 25, 'F');
  
  doc.setTextColor(...impulseDarkDeep);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('MONITORAMENTO DO SISTEMA', margin + 10, yPos + 10);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ACOMPANHE SUA GERAÇÃO EM TEMPO REAL', margin + 10, yPos + 21);
  
  yPos += 35;
  
  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const monitorText = 'Ao final da instalação, é fornecido acesso ao sistema de monitoramento, onde você pode acompanhar a geração do seu sistema fotovoltaico em tempo real através de qualquer dispositivo com conexão à Internet.';
  const monitorLines = doc.splitTextToSize(monitorText, contentWidth);
  doc.text(monitorLines, margin, yPos);
  yPos += monitorLines.length * 5 + 15;
  
  // Monitoring images side by side
  try {
    // Mobile app
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, yPos, 70, 95, 3, 3, 'F');
    doc.addImage(monitoringMobileApp, 'JPEG', margin + 5, yPos + 5, 60, 75);
    
    doc.setTextColor(...impulseDark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('APP MÓVEL', margin + 35, yPos + 88, { align: 'center' });
    
    // Web dashboard
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin + 80, yPos, 95, 95, 3, 3, 'F');
    doc.addImage(monitoringWebDashboard, 'JPEG', margin + 85, yPos + 5, 85, 75);
    
    doc.setTextColor(...impulseDark);
    doc.text('DASHBOARD WEB', margin + 127, yPos + 88, { align: 'center' });
  } catch (e) {
    // Fallback
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, yPos, contentWidth, 80, 3, 3, 'F');
    doc.setTextColor(...grayText);
    doc.text('Imagens do sistema de monitoramento', pageWidth / 2, yPos + 40, { align: 'center' });
  }
  
  yPos += 105;
  
  // Features list
  doc.setTextColor(...impulseDark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Recursos disponíveis:', margin, yPos);
  yPos += 8;
  
  const features = [
    '✓ Acompanhamento em tempo real da geração',
    '✓ Histórico de produção diário, mensal e anual',
    '✓ Alertas de funcionamento do sistema',
    '✓ Economia acumulada em reais',
  ];
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  features.forEach(feat => {
    doc.text(feat, margin + 5, yPos);
    yPos += 6;
  });
  
  addFooter(doc, pageWidth, pageHeight, 6, totalPages);
  
  // ============= PAGE 7: ESCOPO DO PROJETO =============
  doc.addPage();
  yPos = margin + 10;
  
  try {
    doc.addImage(logoImpulse, 'PNG', margin, margin, 40, 20);
  } catch (e) {}
  
  yPos = 45;
  yPos = drawSectionHeader(doc, 'ESCOPO E IMPLANTAÇÃO DO PROJETO', yPos, pageWidth, margin);
  
  doc.setTextColor(...darkText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const escopoIntro = 'A Impulse irá fornecer um sistema TURN KEY completo incluindo materiais, equipamentos e mão de obra de instalação. Todo o trabalho cumprirá os requisitos previstos por todas as leis aplicáveis.';
  const escopoIntroLines = doc.splitTextToSize(escopoIntro, contentWidth);
  doc.text(escopoIntroLines, margin, yPos);
  yPos += escopoIntroLines.length * 4.5 + 10;
  
  // Services included
  const services = [
    { title: 'PROJETO', items: ['Projeto elétrico completo', 'Memorial descritivo', 'Diagrama unifilar'] },
    { title: 'HOMOLOGAÇÃO', items: ['Solicitação junto à concessionária', 'Acompanhamento do processo', 'Aprovação do projeto'] },
    { title: 'INSTALAÇÃO', items: ['Instalação completa do sistema', 'Equipe técnica especializada', 'Testes e comissionamento'] },
    { title: 'PÓS-VENDA', items: ['Suporte técnico', 'Garantia de instalação', 'Monitoramento inicial'] },
  ];
  
  const serviceBoxWidth = (contentWidth - 15) / 2;
  const serviceBoxHeight = 45;
  
  services.forEach((service, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const sx = margin + col * (serviceBoxWidth + 15);
    const sy = yPos + row * (serviceBoxHeight + 8);
    
    doc.setFillColor(...lightBg);
    doc.roundedRect(sx, sy, serviceBoxWidth, serviceBoxHeight, 2, 2, 'F');
    
    doc.setFillColor(...impulseDark);
    doc.rect(sx, sy, serviceBoxWidth, 12, 'F');
    
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(service.title, sx + 5, sy + 8);
    
    doc.setTextColor(...darkText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    service.items.forEach((item, j) => {
      doc.text(`• ${item}`, sx + 5, sy + 20 + j * 7);
    });
  });
  
  yPos += (serviceBoxHeight + 8) * 2 + 15;
  
  // Timeline
  yPos = drawSectionHeader(doc, 'PRAZO DE EXECUÇÃO', yPos, pageWidth, margin);
  
  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.text('O projeto será concluído em aproximadamente 60 dias úteis, incluindo:', margin, yPos);
  yPos += 8;
  
  const timeline = [
    '• Projeto e aprovação: 15-20 dias',
    '• Instalação: 2-5 dias',
    '• Homologação e conexão: 30-40 dias',
  ];
  
  doc.setFontSize(9);
  timeline.forEach(item => {
    doc.text(item, margin + 5, yPos);
    yPos += 6;
  });
  
  addFooter(doc, pageWidth, pageHeight, 7, totalPages);
  
  // ============= PAGE 8: CONDIÇÕES COMERCIAIS =============
  doc.addPage();
  yPos = margin + 10;
  
  try {
    doc.addImage(logoImpulse, 'PNG', margin, margin, 40, 20);
  } catch (e) {}
  
  yPos = 45;
  yPos = drawSectionHeader(doc, 'CONDIÇÕES COMERCIAIS', yPos, pageWidth, margin);
  
  // Investment summary box
  doc.setFillColor(...impulseDark);
  doc.roundedRect(margin, yPos, contentWidth, 40, 3, 3, 'F');
  
  doc.setTextColor(...impulseGold);
  doc.setFontSize(10);
  doc.text('VALOR DO INVESTIMENTO', margin + 10, yPos + 12);
  
  doc.setTextColor(...white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(formData.total || 0), margin + 10, yPos + 30);
  
  doc.setTextColor(...impulseGold);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Sistema de ${formatNumber(formData.recommended_power_kwp || 0)} kWp`, contentWidth - 10, yPos + 25, { align: 'right' });
  
  yPos += 50;

  // Payment conditions
  doc.setTextColor(...impulseDark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES DE PAGAMENTO', margin, yPos);
  yPos += 10;
  
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, yPos, contentWidth, 45, 2, 2, 'F');
  
  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (formData.payment_type === 'financiado' && formData.financing_bank) {
    const downPayment = formData.financing_down_payment || 0;
    const installments = formData.financing_installments || 60;
    const installmentValue = formData.financing_installment_value || 0;
    const rate = formData.financing_rate || 0;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Financiamento via ${formData.financing_bank}`, margin + 10, yPos + 12);
    doc.setFont('helvetica', 'normal');
    
    let payY = yPos + 22;
    if (downPayment > 0) {
      doc.text(`Entrada: ${formatCurrency(downPayment)}`, margin + 10, payY);
      payY += 7;
    }
    doc.text(`${installments}x de ${formatCurrency(installmentValue)}`, margin + 10, payY);
    doc.setTextColor(...grayText);
    doc.setFontSize(8);
    doc.text(`Taxa: ${formatNumber(rate, 2)}% a.m.`, margin + 10, payY + 7);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text('À Vista', margin + 10, yPos + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(formData.total || 0), margin + 10, yPos + 22);
    doc.setTextColor(...grayText);
    doc.setFontSize(8);
    doc.text('ou 50% entrada + 3x no boleto (sem juros)', margin + 10, yPos + 32);
  }
  
  yPos += 55;
  
  // Warranty table
  yPos = drawSectionHeader(doc, 'GARANTIAS', yPos, pageWidth, margin);
  
  const warrantyRows = [
    ['Módulos Fotovoltaicos', '10 anos contra defeitos / 25 anos de performance'],
    ['Inversores', '5 anos de garantia do fabricante'],
    ['Estrutura de Fixação', '12 anos contra corrosão'],
    ['Instalação', '1 ano de garantia do serviço'],
  ];
  
  yPos = drawModernTable(
    doc,
    ['Componente', 'Garantia'],
    warrantyRows,
    yPos,
    [60, 110],
    margin
  );
  
  yPos += 10;
  
  // Validity and signatures
  doc.setTextColor(...grayText);
  doc.setFontSize(8);
  doc.text(`Esta proposta é válida por 20 dias a partir de ${formattedDate}.`, margin, yPos);
  yPos += 15;
  
  // Signature area
  const signatureAreaY = yPos;
  const clientSignatureX = margin;
  const companySignatureX = margin + 95;
  const signatureWidth = 75;
  const signatureHeight = 30;
  
  // Client signature
  if (formData.client_signature) {
    // Add the digital signature image
    try {
      doc.addImage(formData.client_signature, 'PNG', clientSignatureX, signatureAreaY - signatureHeight, signatureWidth, signatureHeight);
    } catch (e) {
      console.error('Error adding client signature to PDF:', e);
    }
    
    // Add signed date if available
    if (formData.client_signed_at) {
      doc.setTextColor(...grayText);
      doc.setFontSize(7);
      const signedDate = new Date(formData.client_signed_at).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Assinado em: ${signedDate}`, clientSignatureX, signatureAreaY + 8);
    }
  }
  
  // Signature lines
  doc.setDrawColor(...impulseDark);
  doc.setLineWidth(0.5);
  doc.line(clientSignatureX, signatureAreaY, clientSignatureX + signatureWidth, signatureAreaY);
  doc.line(companySignatureX, signatureAreaY, pageWidth - margin, signatureAreaY);
  
  yPos = signatureAreaY + 5;
  doc.setTextColor(...darkText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(clientName, clientSignatureX + signatureWidth / 2, yPos, { align: 'center' });
  doc.text(companyName, companySignatureX + (pageWidth - margin - companySignatureX) / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.text('Cliente', clientSignatureX + signatureWidth / 2, yPos, { align: 'center' });
  doc.text('Impulse Energia', companySignatureX + (pageWidth - margin - companySignatureX) / 2, yPos, { align: 'center' });
  
  addFooter(doc, pageWidth, pageHeight, 8, totalPages);
  
  // Save PDF
  const fileName = `Proposta_${clientName.replace(/\s+/g, '_')}_${today.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
