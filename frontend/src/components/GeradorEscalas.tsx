import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
  Modal,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { 
  Settings,
  CalendarMonth,
  AutoFixHigh,
  Add,
  Remove,
  Settings as SettingsIcon
} from '@mui/icons-material';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { escalasApi } from '../services/api';
import { DadosEscala, ICONES_FUNCOES } from '../types';
import ResultadoEscala from './ResultadoEscala';
import { obterNomeMes, obterDiaSemana, obterCoresMes, obterCoresDiaSemana } from '../utils/dateColors';

interface PropsGeradorEscalas {
  onEscalasModificadas?: () => Promise<void>;
}

const GeradorEscalas: React.FC<PropsGeradorEscalas> = ({ onEscalasModificadas }) => {
  const [datasSelecionadas, setDatasSelecionadas] = useState<Date[]>([]);
  const [carregando, setCarregando] = useState(false);
  
  // Estados para controle do modal de resultado
  const [modalAberto, setModalAberto] = useState(false);
  const [resultadoEscala, setResultadoEscala] = useState<DadosEscala | null>(null);
  
  // Estados para modal de seleção de horários
  const [modalHorariosAberto, setModalHorariosAberto] = useState(false);
  // Mudando para array de objetos para simplificar
  const [datasComHorarios, setDatasComHorarios] = useState<{id: string, data: Date, horario: string}[]>([]);
  
  // Estados para adicionar novas datas no modal
  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('19:00');
  
  // Estado para configuração do número de membros por função
  const [configuracao, setConfiguracao] = useState<Record<string, number>>({
    'Vocalista': 5,
    'Tecladista': 1,
    'Violão': 1,
    'Baixista': 1,
    'Baterista': 1,
    'Guitarrista': 1
  });
  
  const handleCliqueData = (valor: any) => {
    if (!valor || Array.isArray(valor)) return;
    
    const dataClicada = valor as Date;
    const stringData = dayjs(dataClicada).format('YYYY-MM-DD');
    
    // Verificar se a data já está selecionada
    const estaSelecionada = datasSelecionadas.some(data => 
      dayjs(data).format('YYYY-MM-DD') === stringData
    );

    if (estaSelecionada) {
      // Remover data
      setDatasSelecionadas(prev => 
        prev.filter(data => dayjs(data).format('YYYY-MM-DD') !== stringData)
      );
    } else {
      // Adicionar data
      setDatasSelecionadas(prev => [...prev, dataClicada]);
    }
  };

  const handleAbrirModalHorarios = () => {
    if (datasSelecionadas.length === 0) return;
    
    // Converter datas selecionadas para o novo formato
    const datasIniciais = datasSelecionadas.map((data, index) => ({
      id: `data-${Date.now()}-${index}`,
      data: data,
      horario: '19:00'
    }));
    
    setDatasComHorarios(datasIniciais);
    setModalHorariosAberto(true);
  };

  const handleGerarEscalaComHorarios = async () => {
    if (datasComHorarios.length === 0) return;

    setCarregando(true);
    try {
      // Converter as datas para o formato esperado pela API (incluindo horário)
      const datas = datasComHorarios.map(item => {
        const dataFormatada = dayjs(item.data).format('YYYY-MM-DD');
        // Enviar no formato simples que o backend aceita: YYYY-MM-DDTHH:mm:ss
        return `${dataFormatada}T${item.horario}:00`;
      });

      // Chamar a API para gerar a escala
      const resultado = await escalasApi.gerar(datas, configuracao);

      
      // Verificar se resultado.escalas existe e tem o formato esperado
      if (!resultado.escalas || typeof resultado.escalas !== 'object') {
        throw new Error('Resposta da API não contém escalas válidas');
      }
      
      // Fechar modal de horários
      handleFecharModalHorarios();
      
      // Definir o resultado e abrir o modal
      setResultadoEscala(resultado.escalas);
      setModalAberto(true);
      
      toast.success(`Escala gerada para ${datas.length} data${datas.length !== 1 ? 's' : ''}!`);
    } catch (erro: any) {
      console.error('Erro ao gerar escala:', erro);
      toast.error(erro.response?.data?.error || 'Erro ao gerar escala');
    } finally {
      setCarregando(false);
    }
  };

  const handleLimparDatas = () => {
    setDatasSelecionadas([]);
  };
  
  // Função para adicionar nova data no modal
  const handleAdicionarNovaData = () => {
    if (!novaData) {
      toast.error('Selecione uma data');
      return;
    }
    
    const novaDataObj = new Date(novaData + 'T00:00:00');
    const dataStr = dayjs(novaDataObj).format('YYYY-MM-DD');
    
    // Verificar se já existe a mesma data com o mesmo horário
    const jaExisteDataHorario = datasComHorarios.some(item => 
      dayjs(item.data).format('YYYY-MM-DD') === dataStr && item.horario === novoHorario
    );
    
    if (jaExisteDataHorario) {
      toast.error('Já existe uma escala para esta data e horário');
      return;
    }
    
    // Adicionar a nova data com horário
    const novoItem = {
      id: `data-${Date.now()}-${Math.random()}`,
      data: novaDataObj,
      horario: novoHorario
    };
    
    setDatasComHorarios(prev => [...prev, novoItem]);
    
    // Limpar os campos
    setNovaData('');
    setNovoHorario('19:00');
    
    toast.success('Data adicionada com sucesso!');
  };
  
  // Função para remover data individual por ID
  const handleRemoverDataIndividual = (id: string) => {
    setDatasComHorarios(prev => prev.filter(item => item.id !== id));
  };
  
  // Função para fechar o modal de horários
  const handleFecharModalHorarios = () => {
    setModalHorariosAberto(false);
  };
  
  // Função para fechar o modal de resultado
  const fecharModal = () => {
    setModalAberto(false);
  };
  
  // Função chamada quando a escala é confirmada/salva no modal
  const handleEscalaConfirmada = () => {
    fecharModal();
    toast.success('Escala salva com sucesso!');
    // Opcional: limpar as datas selecionadas após salvar
    setDatasSelecionadas([]);
  };
  
  // Função chamada quando o usuário cancela o modal
  const handleCancelarModal = () => {
    fecharModal();
    // Não mostra mensagem de sucesso ao cancelar
  };
  
  // Método para ajustar a quantidade de cada função
  const handleAjustarQuantidade = (funcao: string, delta: number) => {
    const novoValor = Math.max(0, (configuracao[funcao] || 0) + delta);
    setConfiguracao(prev => ({
      ...prev,
      [funcao]: novoValor
    }));
  };

  // Renderiza o controle para cada função
  const renderControleQuantidade = (funcao: string, icone: React.ReactNode) => {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          bgcolor: 'rgba(255,255,255,0.8)',
          borderRadius: 1,
          p: 0.5,
          my: 1,
          boxShadow: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: 120, ml: 1 }}>
          {icone}
          <Typography variant="body2" sx={{ ml: 1, fontWeight: 500, color: '#333' }}>{funcao}</Typography>
        </Box>
        
        <IconButton 
          size="small" 
          onClick={() => handleAjustarQuantidade(funcao, -1)}
          disabled={configuracao[funcao] <= 0}
          sx={{ color: '#f44336' }}
        >
          <Remove fontSize="small" />
        </IconButton>
        
        <Typography 
          variant="body1" 
          sx={{ 
            mx: 1, 
            fontWeight: 'bold',
            minWidth: 24, 
            textAlign: 'center',
            color: '#333'
          }}
        >
          {configuracao[funcao] || 0}
        </Typography>
        
        <IconButton 
          size="small" 
          onClick={() => handleAjustarQuantidade(funcao, 1)}
          sx={{ color: '#4caf50' }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Box>
    );
  };

  const classeDoTile = ({ date }: { date: Date }) => {
    const estaSelecionada = datasSelecionadas.some(dataSelecionada => 
      dayjs(dataSelecionada).format('YYYY-MM-DD') === dayjs(date).format('YYYY-MM-DD')
    );
    
    const ehPassado = dayjs(date).isBefore(dayjs(), 'day');

    let nomeClasse = '';
    
    if (ehPassado) {
      nomeClasse += ' past-date';
    } else if (estaSelecionada) {
      nomeClasse += ' selected-date';
    }

    return nomeClasse;
  };

  const conteudoDoTile = () => {
    return null;
  };

  const formatarDatasSelecionadas = () => {
    return datasSelecionadas
      .sort((a, b) => a.getTime() - b.getTime())
      .map(data => {
        return dayjs(data).format('DD/MM/YYYY');
      });
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mb: 3,
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        color: 'white'
      }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        <Settings sx={{ mr: 1, fontSize: 28 }} />
        <Typography variant="h6" component="h2">
          Gerar Escalas
        </Typography>
      </Box>

      {/* Calendário */}
      <Box mb={3}>
        <Box display="flex" alignItems="center" mb={2}>
          <CalendarMonth sx={{ mr: 1 }} />
          <Typography variant="subtitle1">
            Selecionar datas no calendário:
          </Typography>
        </Box>
        
        <Box 
          sx={{ 
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 2,
            p: 2,
            '& .react-calendar': {
              width: '100%',
              border: 'none',
              fontFamily: 'inherit',
            },
            '& .react-calendar__tile': {
              position: 'relative',
              padding: '10px',
              cursor: 'pointer',
              color: '#333 !important',
              '&:hover': {
                backgroundColor: '#e3f2fd !important',
              },
            },
            '& .selected-date': {
              backgroundColor: '#2196f3 !important',
              color: 'white !important',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#1976d2 !important',
              },
            },
            '& .past-date': {
              color: '#ccc !important',
              cursor: 'not-allowed !important',
              '&:hover': {
                backgroundColor: 'transparent !important',
              },
            },
            '& .react-calendar__month-view__weekdays': {
              '& .react-calendar__month-view__weekdays__weekday': {
                color: '#1976d2 !important',
                fontWeight: 'bold !important',
                fontSize: '0.9rem',
                padding: '8px 0',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                border: '1px solid rgba(25, 118, 210, 0.2)',
              },
            },
            // Remover cor vermelha dos fins de semana
            '& .react-calendar__month-view__days__day--weekend': {
              color: '#333 !important',
            },
            // Fins de semana passados devem ficar cinza
            '& .react-calendar__month-view__days__day--weekend.past-date': {
              color: '#ccc !important',
            },
            '& .react-calendar__tile--now': {
              backgroundColor: 'rgba(255,255,255,0.3) !important',
              color: '#333 !important',
              border: '2px solid #1976d2 !important',
            },
            // Data atual quando selecionada
            '& .react-calendar__tile--now.selected-date': {
              backgroundColor: '#2196f3 !important',
              color: 'white !important',
              border: '2px solid #1976d2 !important',
              '&:hover': {
                backgroundColor: '#1976d2 !important',
              },
            },

          }}
        >
          <Calendar
            onChange={handleCliqueData}
            value={null}
            tileClassName={classeDoTile}
            tileContent={conteudoDoTile}
            minDate={new Date()}
            locale="pt-BR"
          />
        </Box>


      </Box>

      {/* Datas selecionadas */}
      {datasSelecionadas.length > 0 && (
        <Box mb={3}>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Typography variant="subtitle1">
              Datas selecionadas:
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleLimparDatas}
              disabled={carregando}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              Limpar
            </Button>
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {formatarDatasSelecionadas().map((stringData, index) => (
              <Chip
                key={index}
                label={stringData}
                onDelete={() => {
                  setDatasSelecionadas(prev => prev.filter((_, i) => i !== index));
                }}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '& .MuiChip-deleteIcon': {
                    color: 'rgba(255,255,255,0.8)',
                    '&:hover': {
                      color: 'white',
                    },
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}
      
      {/* Configuração de quantidade por função */}
      <Box mb={3}>
        <Box display="flex" alignItems="center" mb={2}>
          <SettingsIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">
            Configurar número de membros por função:
          </Typography>
        </Box>
        <Grid container spacing={2} sx={{ 
          backgroundColor: 'rgba(255,255,255,0.2)', 
          borderRadius: 2, 
          p: 1.5, 
          mb: 2 
        }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            {renderControleQuantidade('Vocalista', <span style={{fontSize: '1.2rem'}}>{ICONES_FUNCOES['Vocalista']}</span>)}
            {renderControleQuantidade('Tecladista', <span style={{fontSize: '1.2rem'}}>{ICONES_FUNCOES['Tecladista']}</span>)}
            {renderControleQuantidade('Violão', <span style={{fontSize: '1.2rem'}}>{ICONES_FUNCOES['Violão']}</span>)}
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            {renderControleQuantidade('Guitarrista', <span style={{fontSize: '1.2rem'}}>{ICONES_FUNCOES['Guitarrista']}</span>)}
            {renderControleQuantidade('Baixista', <span style={{fontSize: '1.2rem'}}>{ICONES_FUNCOES['Baixista']}</span>)}
            {renderControleQuantidade('Baterista', <span style={{fontSize: '1.2rem'}}>{ICONES_FUNCOES['Baterista']}</span>)}
          </Grid>
        </Grid>
      </Box>



      {/* Botão */}
      <Box>
        <Button
          variant="contained"
          size="large"
          onClick={handleAbrirModalHorarios}
          disabled={carregando || datasSelecionadas.length === 0}
          startIcon={carregando ? <CircularProgress size={20} color="inherit" /> : <AutoFixHigh />}
          sx={{
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.3)',
            },
            '&:disabled': {
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
            },
          }}
        >
          {carregando ? 'Gerando...' : 'GERAR ESCALA DAS DATAS SELECIONADAS'}
        </Button>
      </Box>

      <Alert 
        severity="info" 
        sx={{ 
          mt: 2, 
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'white',
          '& .MuiAlert-icon': {
            color: 'white',
          },
        }}
      >
        💡 Clique nas datas do calendário para selecioná-las. O algoritmo distribuirá automaticamente baseado na disponibilidade e igualdade.
      </Alert>

      {/* Modal de Seleção de Horários */}
      <Dialog
        open={modalHorariosAberto}
        onClose={handleFecharModalHorarios}
        maxWidth="md"
        fullWidth
        disablePortal={false}
        keepMounted={false}
        disableRestoreFocus
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CalendarMonth />
            <Typography variant="h6">Definir Horários das Escalas</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Defina o horário para cada data selecionada:
          </Typography>
          
          <Grid container spacing={2}>
            {datasComHorarios
              .sort((a, b) => {
                // Primeiro ordenar por data
                const dateDiff = a.data.getTime() - b.data.getTime();
                if (dateDiff !== 0) return dateDiff;
                
                // Se a data for igual, ordenar por horário
                return a.horario.localeCompare(b.horario);
              })
              .map((item) => {
                const dataStr = dayjs(item.data).format('YYYY-MM-DD');
                const dataFormatada = dayjs(item.data).format('DD/MM/YYYY');
                const nomeMes = obterNomeMes(item.data);
                const diaSemana = obterDiaSemana(item.data);
                const coresMes = obterCoresMes(nomeMes);
                const coresDiaSemana = obterCoresDiaSemana(diaSemana);
                
                // Contar quantas vezes esta data aparece
                const datasIguais = datasComHorarios.filter(d => 
                  dayjs(d.data).format('YYYY-MM-DD') === dataStr
                ).length;
                
                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
                    <Box 
                      sx={{ 
                        p: 2, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        borderRadius: 1,
                        backgroundColor: 'background.paper'
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip 
                            label={nomeMes}
                            size="small"
                            sx={{
                              backgroundColor: coresMes.bg,
                              color: coresMes.color,
                              fontWeight: 'bold',
                              fontSize: '0.75rem'
                            }}
                          />
                          <Typography variant="subtitle1" fontWeight="bold">
                            {dataFormatada}
                          </Typography>
                          <Chip 
                            label={diaSemana}
                            size="small"
                            sx={{
                              backgroundColor: coresDiaSemana.bg,
                              color: coresDiaSemana.color,
                              fontWeight: 'bold'
                            }}
                          />
                          {datasIguais > 1 && (
                            <Chip 
                              label={`${item.horario}`}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => handleRemoverDataIndividual(item.id)}
                          color="error"
                          title="Remover data"
                        >
                          <Remove />
                        </IconButton>
                      </Box>
                      
                      <TextField
                        fullWidth
                        label="Horário"
                        type="time"
                        value={item.horario}
                        onChange={(e) => {
                          setDatasComHorarios(prev => 
                            prev.map(prevItem => 
                              prevItem.id === item.id 
                                ? { ...prevItem, horario: e.target.value }
                                : prevItem
                            )
                          );
                        }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        size="small"
                      />
                    </Box>
                  </Grid>
                );
              })
            }
          </Grid>
          
          {/* Seção para adicionar novas datas */}
          <Box sx={{ mt: 4, p: 2, border: '1px dashed', borderColor: 'primary.main', borderRadius: 1, bgcolor: 'primary.50' }}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Add /> Adicionar Nova Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use esta seção para incluir datas adicionais, por exemplo, caso o mesmo dia tenha 2 horários diferentes.
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Nova Data"
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Horário"
                  type="time"
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleAdicionarNovaData}
                  startIcon={<Add />}
                  disabled={!novaData}
                >
                  Adicionar Data
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharModalHorarios}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGerarEscalaComHorarios}
            variant="contained"
            disabled={carregando}
            startIcon={carregando ? <CircularProgress size={16} /> : <AutoFixHigh />}
          >
            {carregando ? 'Gerando...' : 'Gerar Escalas'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Resultado */}
      <Modal
        open={modalAberto}
        onClose={fecharModal}
        aria-labelledby="modal-resultado-escala"
        disableRestoreFocus
        keepMounted={false}
        BackdropProps={{
          style: { backgroundColor: 'rgba(0,0,0,0.6)' }
        }}
      >
        <Box sx={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%', 
          maxWidth: 900, 
          maxHeight: '90vh', 
          overflow: 'auto',
          backgroundColor: 'white',
          borderRadius: 2,
          boxShadow: 24,
          p: 3,
        }}>
          {resultadoEscala ? (
            <>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Resultado da Escala
              </Typography>
              <ResultadoEscala 
                escala={resultadoEscala} 
                aoConfirmarEscala={handleEscalaConfirmada}
                aoCancelarEscala={handleCancelarModal}
                onEscalasModificadas={onEscalasModificadas}
              />
            </>
          ) : (
            <Typography>Nenhum dado de escala disponível</Typography>
          )}
        </Box>
      </Modal>
    </Paper>
  );
};

export default GeradorEscalas;
