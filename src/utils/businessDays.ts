import { addDays, format, getDay, isSunday } from 'date-fns';

// Feriados nacionais brasileiros (fixos) - formato MM-DD
const FIXED_HOLIDAYS: string[] = [
  '01-01', // Ano Novo
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25', // Natal
];

// Feriados móveis brasileiros (calculados para cada ano)
// Estes precisam ser atualizados anualmente ou calculados
const MOBILE_HOLIDAYS_2024: string[] = [
  '2024-02-12', // Carnaval
  '2024-02-13', // Carnaval
  '2024-03-29', // Sexta-feira Santa
  '2024-03-31', // Páscoa
  '2024-05-30', // Corpus Christi
];

const MOBILE_HOLIDAYS_2025: string[] = [
  '2025-03-03', // Carnaval
  '2025-03-04', // Carnaval
  '2025-04-18', // Sexta-feira Santa
  '2025-04-20', // Páscoa
  '2025-06-19', // Corpus Christi
];

const MOBILE_HOLIDAYS_2026: string[] = [
  '2026-02-16', // Carnaval
  '2026-02-17', // Carnaval
  '2026-04-03', // Sexta-feira Santa
  '2026-04-05', // Páscoa
  '2026-06-04', // Corpus Christi
];

// Combina todos os feriados móveis conhecidos
const ALL_MOBILE_HOLIDAYS = [
  ...MOBILE_HOLIDAYS_2024,
  ...MOBILE_HOLIDAYS_2025,
  ...MOBILE_HOLIDAYS_2026,
];

/**
 * Verifica se uma data é feriado
 */
export function isHoliday(date: Date): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');
  const monthDay = format(date, 'MM-dd');
  
  // Verifica feriados fixos
  if (FIXED_HOLIDAYS.includes(monthDay)) {
    return true;
  }
  
  // Verifica feriados móveis
  if (ALL_MOBILE_HOLIDAYS.includes(dateStr)) {
    return true;
  }
  
  return false;
}

/**
 * Verifica se uma data é dia útil (não é domingo nem feriado)
 */
export function isBusinessDay(date: Date): boolean {
  // Domingo
  if (isSunday(date)) {
    return false;
  }
  
  // Feriado
  if (isHoliday(date)) {
    return false;
  }
  
  return true;
}

/**
 * Retorna o próximo dia útil a partir de uma data
 */
export function getNextBusinessDay(date: Date): Date {
  let nextDay = date;
  
  while (!isBusinessDay(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }
  
  return nextDay;
}

/**
 * Adiciona N dias úteis a uma data
 */
export function addBusinessDays(startDate: Date, days: number): Date {
  let currentDate = startDate;
  let remainingDays = days;
  
  while (remainingDays > 0) {
    currentDate = addDays(currentDate, 1);
    if (isBusinessDay(currentDate)) {
      remainingDays--;
    }
  }
  
  return currentDate;
}

/**
 * Verifica se uma data foi ajustada por feriado e retorna o feriado
 */
export function getHolidaysBetween(startDate: Date, endDate: Date): { date: Date; isHoliday: boolean }[] {
  const holidays: { date: Date; isHoliday: boolean }[] = [];
  let currentDate = startDate;
  
  while (currentDate <= endDate) {
    if (isHoliday(currentDate) || isSunday(currentDate)) {
      holidays.push({ date: new Date(currentDate), isHoliday: isHoliday(currentDate) });
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return holidays;
}

/**
 * Calcula a data de conclusão prevista considerando dias úteis
 * Retorna também uma lista de feriados que foram pulados
 */
export function calculateEstimatedEndDate(
  startDate: Date, 
  businessDaysToAdd: number
): { 
  endDate: Date; 
  skippedHolidays: Date[];
  hasHolidayWarning: boolean;
} {
  const skippedHolidays: Date[] = [];
  let currentDate = startDate;
  let remainingDays = businessDaysToAdd;
  
  while (remainingDays > 0) {
    currentDate = addDays(currentDate, 1);
    
    if (isSunday(currentDate)) {
      // Pula domingo
      continue;
    }
    
    if (isHoliday(currentDate)) {
      skippedHolidays.push(new Date(currentDate));
      continue;
    }
    
    remainingDays--;
  }
  
  // Garante que a data final também é dia útil
  while (!isBusinessDay(currentDate)) {
    if (isHoliday(currentDate)) {
      skippedHolidays.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return {
    endDate: currentDate,
    skippedHolidays,
    hasHolidayWarning: skippedHolidays.length > 0,
  };
}

/**
 * Formata a data para exibição
 */
export function formatDateBR(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}
