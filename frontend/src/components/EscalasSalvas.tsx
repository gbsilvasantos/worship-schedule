import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextField,
  Grid,
  Collapse,
  Pagination,
} from '@mui/material';
import { 
  FormatListBulleted,
  CalendarToday,
  Edit,
  Delete,
  Add,
  Remove,
  DateRange,
  ExpandMore,
} from '@mui/icons-material';

import toast from 'react-hot-toast';
import { escalasApi } from '../services/api';
import socketService from '../services/socket';
import { ICONES_FUNCOES, Membro, Funcao } from '../types';
import { obterNomeMes, obterCoresMes, obterCoresDiaSemana } from '../utils/dateColors';

interface EscalasSalvasProps {
  membros: Membro[]; // Receber membros do App
  onEscalasModificadas?: () => Promise<void>;
}

const EscalasSalvas: React.FC<EscalasSalvasProps> = ({ membros, onEscalasModificadas }) => {
  const [escalas, setEscalas] = useState<{[data: string]: any}>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  // Estados para modal de edição
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [dataEditando, setDataEditando] = useState<string>('');
  const [escalaEditando, setEscalaEditando] = useState<any>(null);
  const [novaData, setNovaData] = useState<string>('');
  const [novoHorario, setNovoHorario] = useState<string>('');
  const [configuracaoOriginal, setConfiguracaoOriginal] = useState<Record<string, number>>({});
  const [mostrarAdicionarFuncao, setMostrarAdicionarFuncao] = useState(false);
  const [novaFuncaoSelecionada, setNovaFuncaoSelecionada] = useState<string>('');
  
  // Estados para modal de confirmação de exclusão
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState(false);
  const [dataParaExcluir, setDataParaExcluir] = useState<string>('');
  
  // Estados para agrupamento hierárquico e paginação - ano e mês atual abertos por padrão
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const monthNumber = currentDate.getMonth() + 1;
  const currentMonth = `${currentYear}-${monthNumber.toString().padStart(2, '0')}`;
  
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({ [currentYear]: true });
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({ [currentMonth]: true });
  const [currentPagePerMonth, setCurrentPagePerMonth] = useState<Record<string, number>>({});
  const [currentYearPage, setCurrentYearPage] = useState(1);
  
  const YEARS_PER_PAGE = 5;
  const SCHEDULES_PER_PAGE = 5;
  
  // Funções de agrupamento hierárquico
  const groupSchedulesByYear = (schedules: {[data: string]: any}) => {
    const grouped: Record<string, {[data: string]: any}> = {};
    Object.entries(schedules).forEach(([data, funcoes]) => {
      const year = data.split(' ')[0].split('/')[2];
      if (!grouped[year]) grouped[year] = {};
      grouped[year][data] = funcoes;
    });
    return grouped;
  };
  
  const groupSchedulesByMonth = (schedules: {[data: string]: any}) => {
    const grouped: Record<string, {[data: string]: any}> = {};
    Object.entries(schedules).forEach(([data, funcoes]) => {
      try {
        const datePart = data.split(' ')[0]; // Remove horário
        const dateParts = datePart.split('/');
        if (dateParts.length >= 3) {
          const month = dateParts[1];
          const year = dateParts[2];
          if (month && year && typeof month === 'string' && typeof year === 'string') {
            const monthKey = `${year}-${month.padStart(2, '0')}`;
            if (!grouped[monthKey]) grouped[monthKey] = {};
            grouped[monthKey][data] = funcoes;
          }
        }
      } catch (error) {
        console.error('Erro ao processar data para agrupamento por mês:', data, error);
      }
    });
    return grouped;
  };
  
  // Funções de controle de expansão
  const toggleYear = (year: string) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };
  
  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };
  
  const getMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthIndex = parseInt(month) - 1;
    const monthName = monthNames[monthIndex] || 'Mês Inválido';
    return `${monthName} ${year}`;
  };

  const buscarEscalasSalvas = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      // Buscar apenas escalas (membros vêm por props)
      const resultadoEscalas = await escalasApi.buscarSalvas();
      
      // Criar mapa de membros para busca rápida
      const mapaMembrosPorId = membros.reduce((mapa: any, membro: any) => {
        mapa[membro.id] = membro;
        return mapa;
      }, {});
      
      // Organizar as escalas por data para facilitar visualização
      const escalasPorData: {[data: string]: any} = {};
      
      resultadoEscalas.forEach((escalacao: any) => {
        // Manter o timestamp completo como chave para permitir exclusão correta
        const dataCompleta = escalacao.data_culto;
        
        if (!escalasPorData[dataCompleta]) {
          escalasPorData[dataCompleta] = {};
        }
        
        if (!escalasPorData[dataCompleta][escalacao.funcao]) {
          escalasPorData[dataCompleta][escalacao.funcao] = [];
        }
        
        // Buscar dados reais do membro
        const membro = mapaMembrosPorId[escalacao.membro_id];
        escalasPorData[dataCompleta][escalacao.funcao].push({
          id: escalacao.membro_id,
          nome: membro ? membro.nome : 'Membro',
          sobrenome: membro ? membro.sobrenome : 'Removido',
          funcao: escalacao.funcao
        });
      });
      

      setEscalas(escalasPorData);
    } catch (erro: any) {
      console.error('Erro ao buscar escalas salvas:', erro);
      setErro(erro.response?.data?.error || 'Erro ao buscar escalas salvas');
    } finally {
      setCarregando(false);
    }
  }, [membros]);

  // Configurar sockets para atualizações em tempo real e buscar dados iniciais
  useEffect(() => {
    // Buscar dados iniciais
    buscarEscalasSalvas();
    
    // Configurar listeners do socket para atualizações em tempo real
    socketService.connect();
    
    // Quando uma nova escala é gerada ou confirmada
    socketService.onScheduleGenerated(() => {
      buscarEscalasSalvas();
    });
    
    socketService.onScheduleConfirmed(() => {
      buscarEscalasSalvas();
    });
    
    // Limpar listeners ao desmontar componente
    return () => {
      socketService.removeScheduleListeners();
    };
  }, [buscarEscalasSalvas]);

  const handleEditarEscala = (data: string) => {
    setDataEditando(data);
    const escalaData = { ...escalas[data] };
    setEscalaEditando(escalaData);
    
    // Inicializar campos de data e horário
    // A API agora retorna formato DD/MM/YYYY HH24:MI:SS
    try {
      if (data.includes(' ')) {
        // Formato: "29/07/2025 19:00:00"
        const [datePart, timePart] = data.split(' ');
        const [dia, mes, ano] = datePart.split('/');
        const [hora, minuto] = timePart.split(':');
        
        // Converter para formato input date (YYYY-MM-DD)
        setNovaData(`${ano}-${mes}-${dia}`);
        setNovoHorario(`${hora}:${minuto}`);
      } else {
        // Se é só data no formato DD/MM/YYYY
        const [dia, mes, ano] = data.split('/');
        setNovaData(`${ano}-${mes}-${dia}`);
        setNovoHorario('19:00');
      }
    } catch (error) {
      // Fallback para data inválida
      console.error('Erro ao processar data:', data, error);
      setNovaData('');
      setNovoHorario('19:00');
    }
    
    // Para escalas salvas, usamos uma lógica mais flexivel:
    // Se tem poucos membros (ex: 2 vocalistas mas foi configurado para 5),
    // permitimos adicionar até um limite razoável baseado na função
    const config: Record<string, number> = {
      'Vocalista': 5,    // Máximo comum para vocalistas
      'Tecladista': 2,   // Máximo comum para tecladistas
      'Violão': 2,       // Máximo comum para violão
      'Baixista': 2,     // Máximo comum para baixistas
      'Baterista': 2,    // Máximo comum para bateristas
      'Guitarrista': 2   // Máximo comum para guitarristas
    };
    
    // Ajustar o limite baseado no que já está escalado (nunca menos que o atual)
    Object.entries(escalaData).forEach(([funcao, membros]) => {
      if (Array.isArray(membros) && membros.length > 0) {
        const quantidadeAtual = membros.length;
        const limiteComum = config[funcao] || quantidadeAtual;
        config[funcao] = Math.max(quantidadeAtual, limiteComum);
      }
    });
    
    setConfiguracaoOriginal(config);
    setModalEdicaoAberto(true);
  };

  const handleAbrirModalExclusao = (data: string) => {
    setDataParaExcluir(data);
    setModalExclusaoAberto(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!dataParaExcluir) return;

    try {
      setCarregando(true);
      await escalasApi.excluir(dataParaExcluir);
      
      // Atualizar localmente
      setEscalas(prev => {
        const novasEscalas = { ...prev };
        delete novasEscalas[dataParaExcluir];
        return novasEscalas;
      });
      
      toast.success(`Escala de ${formatarData(dataParaExcluir)} excluída com sucesso!`);
      setModalExclusaoAberto(false);
      setDataParaExcluir('');
      
      // Atualizar estatísticas dos membros
      if (onEscalasModificadas) {
        await onEscalasModificadas();
      }
    } catch (erro: any) {
      console.error('Erro ao excluir escala:', erro);
      toast.error(erro.response?.data?.error || 'Erro ao excluir escala');
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!dataEditando || !escalaEditando || !novaData || !novoHorario) return;

    try {
      setCarregando(true);
      
      // Criar novo timestamp combinando data e horário
      const novaDataCulto = `${novaData}T${novoHorario}:00`;
      
      // Validar se a data é válida antes de continuar
      const dataValidacao = new Date(novaDataCulto);
      if (isNaN(dataValidacao.getTime())) {
        throw new Error('Data ou horário inválido');
      }
      
      // VALIDAÇÃO RIGOROSA: Todos os membros devem estar preenchidos
      const escalaLimpa: { [funcao: string]: any[] } = {};
      let temMembrosVazios = false;
      let funcaoComProblema = '';
      
      Object.entries(escalaEditando).forEach(([funcao, membros]) => {
        const membrosArray = membros as any[];
        
        // Se a função tem membros, todos devem estar preenchidos
        if (membrosArray.length > 0) {
          const membrosValidos = membrosArray.filter(membro => 
            membro && membro.id && membro.nome && membro.nome.trim() !== ''
          );
          
          // Verificar se todos os membros estão preenchidos
          if (membrosValidos.length !== membrosArray.length) {
            temMembrosVazios = true;
            funcaoComProblema = funcao;
            return;
          }
          
          // Só incluir se todos os membros estão válidos
          escalaLimpa[funcao] = membrosValidos;
        }
      });
      
      // Verificar se há membros vazios
      if (temMembrosVazios) {
        toast.error(`Por favor, selecione todos os membros da função ${funcaoComProblema} ou remova os campos vazios.`);
        return;
      }
      
      // Verificar se ainda há funções para salvar
      if (Object.keys(escalaLimpa).length === 0) {
        toast.error('Nenhuma função válida para salvar. Adicione pelo menos um membro em uma função.');
        return;
      }
      
      // Usar nova API de editar escala
      await escalasApi.editar({
        data_original: dataEditando,
        nova_data_culto: novaDataCulto,
        membros: escalaLimpa
      });
      
      // Atualizar localmente
      setEscalas(prev => {
        const newEscalas = { ...prev };
        // Remover escala antiga se a data mudou
        if (dataEditando !== novaDataCulto) {
          delete newEscalas[dataEditando];
        }
        // Adicionar/atualizar escala na nova data
        newEscalas[novaDataCulto] = escalaLimpa;
        return newEscalas;
      });
      
      // Formatação segura da data para o toast
      let dataFormatada = '';
      let horarioFormatado = '';
      
      try {
        const dataObj = new Date(novaDataCulto);
        dataFormatada = dataObj.toLocaleDateString('pt-BR');
        horarioFormatado = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } catch (formatError) {
        // Fallback para formatação manual
        const [datePart, timePart] = novaDataCulto.split('T');
        const [ano, mes, dia] = datePart.split('-');
        const [hora, minuto] = timePart.split(':');
        dataFormatada = `${dia}/${mes}/${ano}`;
        horarioFormatado = `${hora}:${minuto}`;
      }
      
      toast.success(`Escala atualizada para ${dataFormatada} às ${horarioFormatado}!`);
      setModalEdicaoAberto(false);
      setDataEditando('');
      setEscalaEditando(null);
      setNovaData('');
      setNovoHorario('');
      
      // Atualizar estatísticas dos membros
      if (onEscalasModificadas) {
        await onEscalasModificadas();
      }
    } catch (erro: any) {
      console.error('Erro ao salvar edição:', erro);
      toast.error(erro.response?.data?.error || 'Erro ao salvar edição');
    } finally {
      setCarregando(false);
    }
  };

  const handleAlterarMembro = (funcao: string, novoMembroId: string, indice: number) => {
    if (!escalaEditando) return;
    
    const novoMembro = membros.find(m => m.id.toString() === novoMembroId);
    if (!novoMembro) return;

    setEscalaEditando((prev: any) => {
      const novaEscala = { ...prev };
      if (!novaEscala[funcao]) {
        novaEscala[funcao] = [];
      }
      
      // Atualizar o membro no índice específico
      novaEscala[funcao][indice] = {
        id: novoMembro.id,
        nome: novoMembro.nome,
        sobrenome: novoMembro.sobrenome,
        funcao: funcao
      };
      
      return novaEscala;
    });
  };
  
  const handleRemoverMembro = (funcao: string, indice: number) => {
    if (!escalaEditando) return;
    
    setEscalaEditando((prev: any) => {
      const novaEscala = { ...prev };
      if (novaEscala[funcao] && Array.isArray(novaEscala[funcao])) {
        novaEscala[funcao].splice(indice, 1);
        // Se não há mais membros, remover a função
        if (novaEscala[funcao].length === 0) {
          delete novaEscala[funcao];
        }
      }
      return novaEscala;
    });
  };
  
  const handleAdicionarMembro = (funcao: string) => {
    if (!escalaEditando) return;
    
    const quantidadeAtual = escalaEditando[funcao]?.length || 0;
    const limiteOriginal = configuracaoOriginal[funcao] || quantidadeAtual;
    
    if (quantidadeAtual >= limiteOriginal) {
      toast.error(`Limite máximo de ${limiteOriginal} ${funcao}(s) atingido`);
      return;
    }
    
    setEscalaEditando((prev: any) => {
      const novaEscala = { ...prev };
      if (!novaEscala[funcao]) {
        novaEscala[funcao] = [];
      }
      
      // Adicionar slot vazio
      novaEscala[funcao].push({
        id: '',
        nome: '',
        sobrenome: '',
        funcao: funcao
      });
      
      return novaEscala;
    });
  };

  const handleAdicionarNovaFuncao = () => {
    if (!novaFuncaoSelecionada || !escalaEditando) return;
    
    // Verificar se a função já existe
    if (escalaEditando[novaFuncaoSelecionada]) {
      toast.error(`A função ${novaFuncaoSelecionada} já existe nesta escala`);
      return;
    }
    
    setEscalaEditando((prev: any) => {
      const novaEscala = { ...prev };
      novaEscala[novaFuncaoSelecionada] = [{
        id: '',
        nome: '',
        sobrenome: '',
        funcao: novaFuncaoSelecionada
      }];
      return novaEscala;
    });
    
    // Limpar seleção e fechar modal
    setNovaFuncaoSelecionada('');
    setMostrarAdicionarFuncao(false);
    toast.success(`Função ${novaFuncaoSelecionada} adicionada com sucesso!`);
  };

  const obterFuncoesDisponiveis = () => {
    const todasFuncoes = Object.keys(ICONES_FUNCOES);
    const funcoesExistentes = escalaEditando ? Object.keys(escalaEditando) : [];
    return todasFuncoes.filter(funcao => !funcoesExistentes.includes(funcao));
  };

  const formatarData = (stringData: string): string => {
    // A API já retorna 'DD/MM/YYYY HH:mm:ss', extrair apenas a data
    const datePart = stringData.split(' ')[0]; // '29/07/2025'
    return datePart;
  };
  
  const obterHorario = (stringData: string): string => {
    // A API já retorna no formato 'YYYY-MM-DD HH:mm:ss', extrair apenas o horário
    if (!stringData || typeof stringData !== 'string') {
      return '00:00';
    }
    
    const parts = stringData.split(' ');
    if (parts.length < 2) {
      return '00:00';
    }
    
    const timePart = parts[1];
    if (!timePart || typeof timePart !== 'string') {
      return '00:00';
    }
    
    return timePart.substring(0, 5) || '00:00';
  };

  // Função helper para converter data brasileira DD/MM/YYYY para Date
  const converterDataBrasileiraParaDate = (stringData: string): Date => {
    const datePart = stringData.split(' ')[0]; // '29/07/2025'
    const [dia, mes, ano] = datePart.split('/');
    return new Date(`${ano}-${mes}-${dia}T00:00:00`);
  };

  const obterDiaSemana = (stringData: string): string => {
    // Extrair data e converter DD/MM/YYYY para formato Date
    const date = converterDataBrasileiraParaDate(stringData);
    const dayOfWeek = date.getDay();
    const dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    return dias[dayOfWeek];
  };

  if (carregando && Object.keys(escalas).length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <FormatListBulleted sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h6" component="h2">
            Escalas Salvas
          </Typography>
        </Box>
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center">
          <FormatListBulleted sx={{ mr: 1, fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h6" component="h2">
            Escalas Salvas
          </Typography>
        </Box>
        {carregando && <CircularProgress size={20} sx={{ ml: 2 }} />}
      </Box>

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      {Object.keys(escalas).length === 0 ? (
        <Alert severity="info">
          Nenhuma escala salva encontrada. Gere e confirme uma nova escala para visualizar aqui.
        </Alert>
      ) : (
        <Box>
          {(() => {
            const schedulesByYear = groupSchedulesByYear(escalas);
            const sortedYears = Object.keys(schedulesByYear).sort((a, b) => parseInt(b) - parseInt(a));
            
            // Paginação de anos
            const totalYearPages = Math.ceil(sortedYears.length / YEARS_PER_PAGE);
            const startYearIndex = (currentYearPage - 1) * YEARS_PER_PAGE;
            const paginatedYears = sortedYears.slice(startYearIndex, startYearIndex + YEARS_PER_PAGE);
            
            return (
              <>
                <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
                  {paginatedYears.map(year => {
                    const yearSchedules = schedulesByYear[year];
                    const schedulesByMonth = groupSchedulesByMonth(yearSchedules);
                    const sortedMonths = Object.keys(schedulesByMonth).sort((a, b) => {
                      const [yearA, monthA] = a.split('-').map(Number);
                      const [yearB, monthB] = b.split('-').map(Number);
                      return yearA - yearB || monthA - monthB; // Ordem crescente: janeiro para dezembro
                    });
                    
                    return (
                      <Box key={year} sx={{ mb: 2 }}>
                        {/* Cabeçalho do Ano */}
                        <Box 
                          onClick={() => toggleYear(year)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 1.5,
                            backgroundColor: 'primary.main',
                            color: 'white',
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'primary.dark' },
                            mb: 1
                          }}
                        >
                          <IconButton size="small" sx={{ color: 'white', mr: 1 }}>
                            <ExpandMore 
                              sx={{
                                transform: expandedYears[year] ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: 'transform 0.2s'
                              }}
                            />
                          </IconButton>
                          <DateRange sx={{ mr: 1 }} />
                          <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            {year}
                          </Typography>
                          <Chip 
                            label={`${Object.keys(yearSchedules).length} escala${Object.keys(yearSchedules).length !== 1 ? 's' : ''}`}
                            size="small"
                            sx={{ 
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              color: 'white'
                            }}
                          />
                        </Box>
                        
                        {/* Meses do Ano */}
                        <Collapse in={expandedYears[year]} timeout="auto" unmountOnExit>
                          {sortedMonths.map(monthKey => {
                            const monthSchedules = schedulesByMonth[monthKey];
                            const currentPage = currentPagePerMonth[monthKey] || 1;
                            const scheduleEntries = Object.entries(monthSchedules);
                            const totalPages = Math.ceil(scheduleEntries.length / SCHEDULES_PER_PAGE);
                            const startIndex = (currentPage - 1) * SCHEDULES_PER_PAGE;
                            const paginatedSchedules = scheduleEntries.slice(startIndex, startIndex + SCHEDULES_PER_PAGE);
                            
                            return (
                              <Box key={monthKey} sx={{ ml: 2, mb: 1 }}>
                                {/* Cabeçalho do Mês */}
                                <Box 
                                  onClick={() => toggleMonth(monthKey)}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    p: 1,
                                    backgroundColor: 'secondary.main',
                                    color: 'white',
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: 'secondary.dark' },
                                    mb: 1
                                  }}
                                >
                                  <IconButton size="small" sx={{ color: 'white', mr: 1 }}>
                                    <ExpandMore 
                                      sx={{
                                        transform: expandedMonths[monthKey] ? 'rotate(0deg)' : 'rotate(-90deg)',
                                        transition: 'transform 0.2s'
                                      }}
                                    />
                                  </IconButton>
                                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                                    {getMonthName(monthKey)}
                                  </Typography>
                                  <Chip 
                                    label={`${scheduleEntries.length} escala${scheduleEntries.length !== 1 ? 's' : ''}`}
                                    size="small"
                                    sx={{ 
                                      backgroundColor: 'rgba(255,255,255,0.2)',
                                      color: 'white'
                                    }}
                                  />
                                </Box>
                                
                                {/* Escalas do Mês */}
                                <Collapse in={expandedMonths[monthKey]} timeout="auto" unmountOnExit>
                                  <Box sx={{ ml: 1 }}>
                                    {paginatedSchedules.map(([data, funcoes], index) => {
            
            return (
              <Box 
                key={data} 
                position="relative"
                sx={{
                  backgroundColor: index % 2 === 0 ? 'grey.50' : 'white',
                  borderRadius: 1,
                  border: '1px solid #e0e0e0',
                  p: 2,
                  mb: 2
                }}
              >
                {/* Removido Divider pois agora temos espaçamento visual pelo fundo */}
                
                {/* Cabeçalho da data com botões de ação */}
                <Box 
                  display="flex" 
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  mb={1} 
                  justifyContent="space-between"
                  flexDirection={{ xs: 'column', sm: 'row' }}
                  gap={{ xs: 1.5, sm: 0 }}
                >
                  <Box display="flex" alignItems="center" gap={{ xs: 0.3, sm: 0.5 }} sx={{ minWidth: 0 }}>
                    <CalendarToday sx={{ mr: { xs: 0.5, sm: 1 }, color: 'primary.main', fontSize: { xs: 18, sm: 24 } }} />
                    <Chip 
                      label={obterNomeMes(converterDataBrasileiraParaDate(data))}
                      size="small"
                      sx={{
                        mr: { xs: 0.3, sm: 1 },
                        backgroundColor: obterCoresMes(obterNomeMes(converterDataBrasileiraParaDate(data))).bg,
                        color: obterCoresMes(obterNomeMes(converterDataBrasileiraParaDate(data))).color,
                        fontWeight: 'bold',
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        height: { xs: 20, sm: 24 },
                        '& .MuiChip-label': {
                          px: { xs: 0.5, sm: 1 }
                        }
                      }}
                    />
                    <Typography 
                      variant="subtitle1" 
                      color="primary.main" 
                      fontWeight="bold"
                      sx={{ 
                        fontSize: { xs: '0.85rem', sm: '1rem' },
                        minWidth: 'max-content'
                      }}
                    >
                      {formatarData(data)}
                    </Typography>
                    <Typography 
                      variant="subtitle1" 
                      color="secondary.main" 
                      fontWeight="bold" 
                      sx={{ 
                        ml: { xs: 0.3, sm: 1 }, 
                        fontSize: { xs: '0.75rem', sm: '1rem' },
                        minWidth: 'max-content'
                      }}
                    >
                      {obterHorario(data)}
                    </Typography>
                    <Chip 
                      label={obterDiaSemana(data)}
                      size="small"
                      sx={{
                        ml: { xs: 0.3, sm: 1 },
                        backgroundColor: obterCoresDiaSemana(obterDiaSemana(data)).bg,
                        color: obterCoresDiaSemana(obterDiaSemana(data)).color,
                        fontWeight: 'bold',
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        height: { xs: 20, sm: 24 },
                        '& .MuiChip-label': {
                          px: { xs: 0.5, sm: 1 }
                        }
                      }}
                    />
                  </Box>
                  
                  {/* Botões de editar e deletar - apenas desktop */}
                  <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
                    <Tooltip title="Editar escala">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditarEscala(data)}
                        sx={{ 
                          border: '1px solid rgba(25, 118, 210, 0.5)', 
                          borderRadius: 1,
                          '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.12)' }
                        }}
                      >
                        <Edit fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir escala">
                      <IconButton 
                        size="small" 
                        onClick={() => handleAbrirModalExclusao(data)}
                        sx={{ 
                          border: '1px solid rgba(211, 47, 47, 0.5)', 
                          borderRadius: 1,
                          '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.12)' }
                        }}
                      >
                        <Delete fontSize="small" color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Escalações por função */}
                <Box pl={4}>
                  {funcoes && Object.entries(funcoes)
                    .filter(([_, membros]) => Array.isArray(membros) && membros.length > 0)
                    .map(([funcao, membros]) => (
                      <Box key={funcao} mb={1}>
                        <Typography variant="body2" component="div">
                          <Box display="flex" alignItems="center" gap={1}>
                            <span style={{ fontSize: '1.2em' }}>
                              {ICONES_FUNCOES[funcao as keyof typeof ICONES_FUNCOES]}
                            </span>
                            <strong>{funcao}:</strong>
                            <span>
                              {Array.isArray(membros) 
                                ? membros.map((membro: any) => 
                                    `${membro.nome} ${membro.sobrenome}`
                                  ).join(', ')
                                : 'Dados inválidos'
                              }
                            </span>
                          </Box>
                        </Typography>
                      </Box>
                    ))}
                </Box>
                
                {/* Botões para mobile */}
                <Box sx={{ 
                  display: { xs: 'flex', sm: 'none' }, 
                  gap: 1, 
                  justifyContent: 'center',
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid rgba(0, 0, 0, 0.08)'
                }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<Edit fontSize="small" />}
                    onClick={() => handleEditarEscala(data)}
                    sx={{ flex: 1, minWidth: 'auto' }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Delete fontSize="small" />}
                    onClick={() => handleAbrirModalExclusao(data)}
                    sx={{ flex: 1, minWidth: 'auto' }}
                  >
                    Excluir
                  </Button>
                </Box>
              </Box>
                                      );
                                    })}
                                    
                                    {/* Paginação por Mês */}
                                    {totalPages > 1 && (
                                      <Box display="flex" justifyContent="center" mt={2}>
                                        <Pagination
                                          count={totalPages}
                                          page={currentPage}
                                          onChange={(_, page) => {
                                            setCurrentPagePerMonth(prev => ({ ...prev, [monthKey]: page }));
                                          }}
                                          size="small"
                                          color="primary"
                                        />
                                      </Box>
                                    )}
                                  </Box>
                                </Collapse>
                              </Box>
                            );
                          })}
                        </Collapse>
                      </Box>
                    );
                  })}
                </Box>
                
                {/* Paginação de Anos */}
                {totalYearPages > 1 && (
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Pagination
                      count={totalYearPages}
                      page={currentYearPage}
                      onChange={(_, page) => setCurrentYearPage(page)}
                      color="primary"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            );
          })()}
        </Box>
      )}
      
      {/* Modal de Edição */}
      <Dialog
        open={modalEdicaoAberto}
        onClose={() => setModalEdicaoAberto(false)}
        maxWidth="md"
        fullWidth
        disablePortal={false}
        keepMounted={false}
        disableRestoreFocus
      >
        <DialogTitle sx={{ pb: 1 }}>
          Editar Escala - {dataEditando ? formatarData(dataEditando) : ''}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* Campos de Data e Horário */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Data e Horário do Culto
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Data"
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '1rem',
                      padding: '12px 14px'
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Horário"
                  type="time"
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '1rem',
                      padding: '12px 14px'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {/* Lista de Membros por Função */}
          {escalaEditando && Object.entries(escalaEditando)
            .filter(([funcao, membrosEscala]) => Array.isArray(membrosEscala) && membrosEscala.length > 0)
            .map(([funcao, membrosEscala]) => {
              const membrosArray = Array.isArray(membrosEscala) ? membrosEscala : [];
              
              return (
                <Box key={funcao} mb={3}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <span style={{ fontSize: '1.2em' }}>
                        {ICONES_FUNCOES[funcao as keyof typeof ICONES_FUNCOES]}
                      </span>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {funcao} ({membrosArray.length})
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => handleAdicionarMembro(funcao)}
                      startIcon={<Add />}
                      variant="outlined"
                    >
                      Adicionar
                    </Button>
                  </Box>
                  
                  {membrosArray.map((membro: any, indice: number) => {
                    // Filtrar membros já selecionados na mesma função (exceto o atual)
                    const membrosJaSelecionados = membrosArray
                      .filter((_, i) => i !== indice)
                      .map((m: any) => m.id)
                      .filter(Boolean);
                    
                    const membrosDisponiveis = membros.filter((m: Membro) => 
                      m.funcoes.includes(funcao as Funcao) && !membrosJaSelecionados.includes(m.id)
                    );
                    
                    return (
                      <Box key={indice} display="flex" alignItems="center" gap={1} mb={1}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Selecionar membro {indice + 1}</InputLabel>
                          <Select
                            value={membro.id?.toString() || ''}
                            label={`Selecionar membro ${indice + 1}`}
                            onChange={(e: SelectChangeEvent) => handleAlterarMembro(funcao, e.target.value, indice)}
                          >
                            <MenuItem value="">
                              <em>Selecionar membro</em>
                            </MenuItem>
                            {membrosDisponiveis.map((m: Membro) => (
                              <MenuItem key={m.id} value={m.id.toString()}>
                                {m.nome} {m.sobrenome}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoverMembro(funcao, indice)}
                          color="error"
                          sx={{ 
                            border: '1px solid rgba(211, 47, 47, 0.5)', 
                            borderRadius: 1,
                            '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.12)' }
                          }}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          
          {/* Botão para adicionar nova função */}
          <Box mt={2}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Add />}
              onClick={() => setMostrarAdicionarFuncao(true)}
              disabled={obterFuncoesDisponiveis().length === 0}
            >
              Adicionar Nova Função
            </Button>
          </Box>
          
          {/* Modal para adicionar nova função */}
          <Dialog
            open={mostrarAdicionarFuncao}
            onClose={() => {
              setMostrarAdicionarFuncao(false);
              setNovaFuncaoSelecionada('');
            }}
            maxWidth="sm"
            fullWidth
            disablePortal={false}
            keepMounted={false}
            disableRestoreFocus
          >
            <DialogTitle>Adicionar Nova Função</DialogTitle>
            <DialogContent>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Selecionar função</InputLabel>
                <Select
                  value={novaFuncaoSelecionada}
                  label="Selecionar função"
                  onChange={(e: SelectChangeEvent) => setNovaFuncaoSelecionada(e.target.value)}
                >
                  {obterFuncoesDisponiveis().map((funcao) => (
                    <MenuItem key={funcao} value={funcao}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{ICONES_FUNCOES[funcao as keyof typeof ICONES_FUNCOES]}</span>
                        <span>{funcao}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setMostrarAdicionarFuncao(false);
                setNovaFuncaoSelecionada('');
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAdicionarNovaFuncao}
                variant="contained"
                disabled={!novaFuncaoSelecionada}
              >
                Adicionar
              </Button>
            </DialogActions>
          </Dialog>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalEdicaoAberto(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSalvarEdicao}
            variant="contained"
            disabled={carregando}
          >
            Salvar Edição
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de Confirmação de Exclusão */}
      <Dialog
        open={modalExclusaoAberto}
        onClose={() => setModalExclusaoAberto(false)}
        maxWidth="sm"
        disablePortal={false}
        keepMounted={false}
        disableRestoreFocus
      >
        <DialogTitle>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography>
            Deseja realmente excluir a escala de <strong>{formatarData(dataParaExcluir)}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalExclusaoAberto(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmarExclusao}
            variant="contained"
            color="error"
            disabled={carregando}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default EscalasSalvas;
