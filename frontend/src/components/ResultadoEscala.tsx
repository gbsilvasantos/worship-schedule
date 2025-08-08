import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextField,
  Grid,
} from '@mui/material';
import { 
  Assignment,
  Save,
  CalendarToday,
  Edit,
  Delete,
  Add,
  Remove,
} from '@mui/icons-material';

import toast from 'react-hot-toast';
import { escalasApi, membrosApi } from '../services/api';
import { DadosEscala, ICONES_FUNCOES, Membro, Funcao } from '../types';
import { obterNomeMes, obterCoresMes, obterCoresDiaSemana } from '../utils/dateColors';

interface PropsResultadoEscala {
  escala: DadosEscala | null;
  aoConfirmarEscala?: () => void;
  aoCancelarEscala?: () => void;
  onEscalasModificadas?: () => Promise<void>;
}

const ResultadoEscala: React.FC<PropsResultadoEscala> = ({ escala, aoConfirmarEscala, aoCancelarEscala, onEscalasModificadas }) => {
  const [escalaEditavel, setEscalaEditavel] = useState<DadosEscala | null>(escala);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [dataEditando, setDataEditando] = useState<string>('');
  const [novaData, setNovaData] = useState<string>('');
  const [novoHorario, setNovoHorario] = useState<string>('');
  const [salvando, setSalvando] = useState(false);
  const [todosOsMembros, setTodosOsMembros] = useState<Membro[]>([]);

  // Carregue todos os membros quando o componente montar
  React.useEffect(() => {
    const carregarMembros = async () => {
      try {
        const membros = await membrosApi.listarTodos();
        setTodosOsMembros(membros);
      } catch (error) {
        console.error('Erro ao carregar membros:', error);
      }
    };
    carregarMembros();
  }, []);

  // Atualizar escala editável quando a escala props mudar
  React.useEffect(() => {
    setEscalaEditavel(escala);
  }, [escala]);



  const handleEditarData = (data: string) => {
    setDataEditando(data);
    
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
    
    setModalEdicaoAberto(true);
  };

  const handleRemoverData = (data: string) => {
    if (!escalaEditavel) return;
    
    const novaEscala = { ...escalaEditavel };
    delete novaEscala[data];
    setEscalaEditavel(novaEscala);
    
    toast.success(`Escala de ${formatarData(data)} removida`);
    
    // Se não há mais datas, chamar callback
    if (Object.keys(novaEscala).length === 0) {
      aoConfirmarEscala?.();
    }
  };

  const handleSalvarEdicao = (novaEscalaData: { [funcao: string]: Membro[] }) => {
    if (!escalaEditavel || !dataEditando || !novaData || !novoHorario) return;
    
    // VALIDAÇÃO: Filtrar funções vazias antes de salvar
    const escalaLimpa: { [funcao: string]: Membro[] } = {};
    
    Object.entries(novaEscalaData).forEach(([funcao, membros]) => {
      // Verificar se há membros válidos (com ID) nesta função
      const membrosValidos = membros.filter(membro => 
        membro && membro.id && membro.nome && membro.nome.trim() !== ''
      );
      
      // Só incluir a função se houver membros válidos
      if (membrosValidos.length > 0) {
        escalaLimpa[funcao] = membrosValidos;
      }
    });
    
    // Verificar se ainda há funções para salvar
    if (Object.keys(escalaLimpa).length === 0) {
      toast.error('Nenhuma função válida para salvar. Adicione pelo menos um membro em uma função.');
      return;
    }
    
    // Criar nova string de data/horário no formato brasileiro
    const [ano, mes, dia] = novaData.split('-');
    const novaDataCulto = `${dia}/${mes}/${ano} ${novoHorario}:00`;
    
    const novaEscala = { ...escalaEditavel };
    
    // Se a data/horário mudou, remover da data antiga e adicionar na nova
    if (dataEditando !== novaDataCulto) {
      // Verificar se já existe escala na nova data
      if (novaEscala[novaDataCulto]) {
        toast.error('Já existe uma escala nesta data e horário!');
        return;
      }
      
      // Remover da data antiga
      delete novaEscala[dataEditando];
      
      // Adicionar na nova data
      novaEscala[novaDataCulto] = escalaLimpa;
      
      toast.success(`Escala movida para ${dia}/${mes}/${ano} às ${novoHorario}!`);
    } else {
      // Apenas atualizar os membros na mesma data
      novaEscala[dataEditando] = escalaLimpa;
      toast.success('Escala editada com sucesso!');
    }
    
    setEscalaEditavel(novaEscala);
    setModalEdicaoAberto(false);
    setDataEditando('');
    setNovaData('');
    setNovoHorario('');
  };

  const handleAlterarMembro = (funcao: string, novoMembroId: number | '', indice: number) => {
    if (!escalaEditavel || !dataEditando) return;
    
    const escalaAtual = escalaEditavel[dataEditando];
    const novaEscalaData = { ...escalaAtual };
    
    if (!novaEscalaData[funcao]) {
      novaEscalaData[funcao] = [];
    }
    
    if (novoMembroId === '') {
      // Remove membro do índice específico
      novaEscalaData[funcao] = novaEscalaData[funcao].filter((_, i) => i !== indice);
    } else {
      // Adiciona/substitui membro no índice específico
      const membro = todosOsMembros.find(m => m.id === novoMembroId);
      if (membro) {
        novaEscalaData[funcao][indice] = membro;
      }
    }
    
    const novaEscala = {
      ...escalaEditavel,
      [dataEditando]: novaEscalaData
    };
    
    setEscalaEditavel(novaEscala);
  };
  
  const handleAdicionarMembro = (funcao: string) => {
    if (!escalaEditavel || !dataEditando) return;
    
    const escalaAtual = escalaEditavel[dataEditando];
    const novaEscalaData = { ...escalaAtual };
    
    if (!novaEscalaData[funcao]) {
      novaEscalaData[funcao] = [];
    }
    
    // Adicionar slot vazio
    const membroVazio = {
      id: 0,
      nome: '',
      sobrenome: '',
      funcoes: [funcao as Funcao] // Array com a função atual
    } as Membro;
    
    novaEscalaData[funcao].push(membroVazio);
    
    const novaEscala = {
      ...escalaEditavel,
      [dataEditando]: novaEscalaData
    };
    
    setEscalaEditavel(novaEscala);
  };
  
  const handleRemoverMembro = (funcao: string, indice: number) => {
    if (!escalaEditavel || !dataEditando) return;
    
    const escalaAtual = escalaEditavel[dataEditando];
    const novaEscalaData = { ...escalaAtual };
    
    if (novaEscalaData[funcao]) {
      novaEscalaData[funcao] = novaEscalaData[funcao].filter((_, i) => i !== indice);
      
      // Se não há mais membros, remover a função completamente
      if (novaEscalaData[funcao].length === 0) {
        delete novaEscalaData[funcao];
      }
    }
    
    const novaEscala = {
      ...escalaEditavel,
      [dataEditando]: novaEscalaData
    };
    
    setEscalaEditavel(novaEscala);
  };

  const handleSalvarTodasEscalas = async () => {
    if (!escalaEditavel) return;

    setSalvando(true);
    try {
      // VALIDAÇÃO: Filtrar funções vazias antes de enviar para a API
      const escalaLimpa: { [data: string]: { [funcao: string]: Membro[] } } = {};
      
      Object.entries(escalaEditavel).forEach(([data, funcoes]) => {
        const funcoesComMembros: { [funcao: string]: Membro[] } = {};
        
        Object.entries(funcoes).forEach(([funcao, membros]) => {
          // Verificar se há membros válidos (com ID) nesta função
          const membrosValidos = (membros as Membro[]).filter(membro => 
            membro && membro.id && membro.nome && membro.nome.trim() !== ''
          );
          
          // Só incluir a função se houver membros válidos
          if (membrosValidos.length > 0) {
            funcoesComMembros[funcao] = membrosValidos;
          }
        });
        
        // Só incluir a data se houver pelo menos uma função com membros
        if (Object.keys(funcoesComMembros).length > 0) {
          escalaLimpa[data] = funcoesComMembros;
        }
      });
      
      // Verificar se ainda há escalas para salvar
      if (Object.keys(escalaLimpa).length === 0) {
        toast.error('Nenhuma escala válida para salvar. Adicione pelo menos um membro em uma função.');
        return;
      }
      
      await escalasApi.confirmar(escalaLimpa);
      toast.success('Todas as escalas foram salvas com sucesso!');
      
      // Atualizar estatísticas dos membros
      if (onEscalasModificadas) {
        await onEscalasModificadas();
      }
      
      aoConfirmarEscala?.();
    } catch (erro: any) {
      console.error('Erro ao salvar escalas:', erro);
      toast.error(erro.response?.data?.error || 'Erro ao salvar escalas');
    } finally {
      setSalvando(false);
    }
  };





  const formatarData = (stringData: string): string => {
    // A API já retorna 'DD/MM/YYYY HH:mm:ss', extrair apenas a data
    const datePart = stringData.split(' ')[0]; // '29/07/2025'
    return datePart;
  };

  const obterHorario = (stringData: string): string => {
    // Extrair parte do horário da string 'DD/MM/YYYY HH:mm:ss'
    return stringData.split(' ')[1]?.substring(0, 5) || '00:00';
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

  // Ordenar datas e converter para array para fácil manipulação
  const entradasEscala = escalaEditavel ? Object.entries(escalaEditavel)
    .sort(([dataA], [dataB]) => {
      // Converter DD/MM/YYYY HH:mm:ss para timestamp para comparação
      const parseDate = (dateStr: string) => {
        const [datePart, timePart] = dateStr.split(' ');
        const [dia, mes, ano] = datePart.split('/');
        return new Date(`${ano}-${mes}-${dia}T${timePart || '00:00:00'}`);
      };
      return parseDate(dataA).getTime() - parseDate(dataB).getTime();
    }) : [];

  if (!escalaEditavel || Object.keys(escalaEditavel).length === 0) {
    return null;
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="space-between" 
        mb={2}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={{ xs: 1, sm: 0 }}
      >
        <Box display="flex" alignItems="center">
          <Assignment sx={{ mr: 1, fontSize: 28, color: 'success.main' }} />
          <Typography variant="h6" component="h2">
            Escalas Geradas
          </Typography>
        </Box>
        <Chip 
          label={`${entradasEscala.length} data${entradasEscala.length !== 1 ? 's' : ''}`}
          color="primary"
          size="small"
        />
      </Box>

      <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
        {entradasEscala.map(([data, funcoes], index) => (
          <Box key={data}>
            {index > 0 && <Divider sx={{ my: 3 }} />}
            
            {/* Cabeçalho da data com botões */}
            <Box 
              display="flex" 
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between" 
              mb={2}
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
                  variant="h6"
                  color="primary.main" 
                  fontWeight="bold"
                  sx={{ 
                    fontSize: { xs: '0.85rem', sm: '1.25rem' },
                    minWidth: 'max-content'
                  }}
                >
                  {formatarData(data)}
                </Typography>
                <Typography 
                  variant="h6"
                  color="secondary.main" 
                  fontWeight="bold" 
                  sx={{ 
                    ml: { xs: 0.3, sm: 1 }, 
                    fontSize: { xs: '0.75rem', sm: '1.25rem' },
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
              
              {/* Botões de ação por data */}
              <Box 
                display="flex" 
                gap={1}
                alignSelf={{ xs: 'center', sm: 'auto' }}
                width={{ xs: '100%', sm: 'auto' }}
                justifyContent={{ xs: 'center', sm: 'flex-end' }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => handleEditarData(data)}
                  disabled={salvando}
                  sx={{ 
                    minWidth: { xs: 'auto', sm: 'auto' },
                    px: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => handleRemoverData(data)}
                  disabled={salvando}
                  sx={{ 
                    minWidth: { xs: 'auto', sm: 'auto' },
                    px: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}
                >
                  Remover
                </Button>
              </Box>
            </Box>

            {/* Escalações por função */}
            <Box pl={4}>
              {Object.entries(funcoes)
                .filter(([_, membros]) => membros.length > 0)
                .map(([funcao, membros]) => (
                  <Box key={funcao} mb={1}>
                    <Typography variant="body1" component="div">
                      <Box display="flex" alignItems="center" gap={1}>
                        <span style={{ fontSize: '1.2em' }}>
                          {ICONES_FUNCOES[funcao as keyof typeof ICONES_FUNCOES]}
                        </span>
                        <strong>{funcao}:</strong>
                        <span>
                          {membros.map(membro => `${membro.nome} ${membro.sobrenome}`).join(', ')}
                        </span>
                      </Box>
                    </Typography>
                  </Box>
                ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Botões para cancelar ou salvar todas as escalas */}
      <Box 
        display="flex" 
        justifyContent="center" 
        gap={2} 
        mt={3}
        flexDirection={{ xs: 'column', sm: 'row' }}
        alignItems="center"
      >
        <Button
          variant="outlined"
          size="large"
          onClick={aoCancelarEscala || aoConfirmarEscala}
          disabled={salvando}
          sx={{ 
            px: { xs: 3, sm: 4 }, 
            py: { xs: 1, sm: 1.5 },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '300px', sm: 'none' },
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleSalvarTodasEscalas}
          disabled={salvando}
          startIcon={salvando ? <CircularProgress size={20} color="inherit" /> : <Save />}
          sx={{ 
            px: { xs: 3, sm: 4 }, 
            py: { xs: 1, sm: 1.5 },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '300px', sm: 'none' },
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          {salvando ? 'Salvando...' : 'SALVAR TODAS AS ESCALAS'}
        </Button>
      </Box>

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
          
          {dataEditando && escalaEditavel && escalaEditavel[dataEditando] && (
            <Box>
              {Object.entries(escalaEditavel[dataEditando])
                .filter(([_, membros]) => Array.isArray(membros) && membros.length > 0)
                .map(([funcao, membros]) => {
                  const membrosArray = Array.isArray(membros) ? membros : [];
                  const membrosDisponiveis = todosOsMembros.filter(m => m.funcoes.includes(funcao as Funcao));
                  
                  return (
                    <Box key={funcao} sx={{ mb: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <span style={{ fontSize: '1.2em' }}>
                            {ICONES_FUNCOES[funcao as keyof typeof ICONES_FUNCOES]}
                          </span>
                          <Typography variant="h6">
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
                        
                        const membrosDisponiveisLocal = membrosDisponiveis.filter(m => 
                          !membrosJaSelecionados.includes(m.id)
                        );
                        
                        return (
                          <Box key={indice} display="flex" alignItems="center" gap={1} mb={1}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Selecionar membro {indice + 1}</InputLabel>
                              <Select
                                value={membro.id || ''}
                                label={`Selecionar membro ${indice + 1}`}
                                onChange={(event: SelectChangeEvent<number | string>) => 
                                  handleAlterarMembro(funcao, event.target.value as number | '', indice)
                                }
                              >
                                <MenuItem value="">
                                  <em>Selecionar membro</em>
                                </MenuItem>
                                {membrosDisponiveisLocal.map(m => (
                                  <MenuItem key={m.id} value={m.id}>
                                    {m.nome} {m.sobrenome}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                          <Button
                            size="small"
                            onClick={() => handleRemoverMembro(funcao, indice)}
                            variant="outlined"
                            color="error"
                            sx={{
                              minWidth: 'auto',
                              px: 1,
                              border: '1px solid rgba(211, 47, 47, 0.5)', 
                              borderRadius: 1,
                              '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.12)' }
                            }}
                          >
                            <Remove fontSize="small" />
                          </Button>
                        </Box>
                      );
                    })}
                  </Box>
                );
              })
            }
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setModalEdicaoAberto(false)}>
          Cancelar
        </Button>
        <Button 
          onClick={() => {
            if (dataEditando && escalaEditavel) {
              handleSalvarEdicao(escalaEditavel[dataEditando] || {});
            }
          }} 
          variant="contained"
        >
          Salvar Edição
        </Button>
      </DialogActions>
    </Dialog>
  </Paper>
  );
};

export default ResultadoEscala;