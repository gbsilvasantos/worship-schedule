// Cores para meses do ano
export const CORES_MESES = {
  'JANEIRO': { color: '#1976d2', bg: '#e3f2fd' },    // Azul
  'FEVEREIRO': { color: '#ffa726', bg: '#fff3e0' },  // Laranja
  'MARÇO': { color: '#66bb6a', bg: '#e8f5e8' },      // Verde
  'ABRIL': { color: '#ab47bc', bg: '#f3e5f5' },      // Roxo
  'MAIO': { color: '#ef5350', bg: '#ffebee' },       // Vermelho
  'JUNHO': { color: '#26c6da', bg: '#e0f2f1' },      // Ciano
  'JULHO': { color: '#ff7043', bg: '#fbe9e7' },      // Laranja profundo
  'AGOSTO': { color: '#9ccc65', bg: '#f1f8e9' },     // Verde claro
  'SETEMBRO': { color: '#5c6bc0', bg: '#e8eaf6' },   // Índigo
  'OUTUBRO': { color: '#ffb74d', bg: '#fff8e1' },    // Âmbar
  'NOVEMBRO': { color: '#8d6e63', bg: '#efebe9' },   // Marrom
  'DEZEMBRO': { color: '#e57373', bg: '#ffebee' }    // Rosa
};

// Cores para dias da semana
export const CORES_DIAS_SEMANA = {
  'DOM': { color: '#e53e3e', bg: '#fed7d7' },        // Vermelho
  'SEG': { color: '#3182ce', bg: '#bee3f8' },        // Azul
  'TER': { color: '#38a169', bg: '#c6f6d5' },        // Verde
  'QUA': { color: '#d69e2e', bg: '#faf089' },        // Amarelo
  'QUI': { color: '#805ad5', bg: '#e9d8fd' },        // Roxo
  'SEX': { color: '#dd6b20', bg: '#fed7aa' },        // Laranja
  'SÁB': { color: '#319795', bg: '#b2f5ea' }         // Teal
};

// Função para obter o nome do mês em português
export const obterNomeMes = (data: Date | string): string => {
  const meses = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];
  
  let dateObj: Date;
  if (typeof data === 'string') {
    // Se for string no formato DD/MM/YYYY
    if (data.includes('/')) {
      const [dia, mes, ano] = data.split(' ')[0].split('/');
      dateObj = new Date(`${ano}-${mes}-${dia}`);
    } else {
      dateObj = new Date(data);
    }
  } else {
    dateObj = data;
  }
  
  return meses[dateObj.getMonth()];
};

// Função para obter o dia da semana em português
export const obterDiaSemana = (data: Date | string): string => {
  const dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  
  let dateObj: Date;
  if (typeof data === 'string') {
    // Se for string no formato DD/MM/YYYY
    if (data.includes('/')) {
      const [dia, mes, ano] = data.split(' ')[0].split('/');
      dateObj = new Date(`${ano}-${mes}-${dia}`);
    } else {
      dateObj = new Date(data);
    }
  } else {
    dateObj = data;
  }
  
  return dias[dateObj.getDay()];
};

// Função para obter as cores do mês
export const obterCoresMes = (nomeMes: string) => {
  return CORES_MESES[nomeMes as keyof typeof CORES_MESES] || CORES_MESES['JANEIRO'];
};

// Função para obter as cores do dia da semana
export const obterCoresDiaSemana = (diaSemana: string) => {
  return CORES_DIAS_SEMANA[diaSemana as keyof typeof CORES_DIAS_SEMANA] || CORES_DIAS_SEMANA['DOM'];
};
