import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  IconButton,
  Chip,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  Pagination,
} from '@mui/material';
import { 
  EventBusy, 
  Delete,
  Person,
  DateRange,
  Edit,
  ExpandMore,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { ausenciasApi } from '../services/api';
import { Ausencia, ICONES_FUNCOES } from '../types';

interface AbsenceListProps {
  absences: Ausencia[];
  loading?: boolean;
  onAbsenceRemoved?: () => void;
}

const AbsenceList: React.FC<AbsenceListProps> = ({ absences, loading, onAbsenceRemoved }) => {
  const [editDialog, setEditDialog] = useState<{ open: boolean; absence: Ausencia | null }>({ open: false, absence: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; absence: Ausencia | null }>({ open: false, absence: null });
  const [editFormData, setEditFormData] = useState({ startDate: '', endDate: '', reason: '' });
  const [editTipoAusencia, setEditTipoAusencia] = useState<'especifica' | 'periodo'>('especifica');
  const [loading2, setLoading2] = useState(false);
  
  // Estados para expansão e paginação - ano e mês atual abertos por padrão
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = `${currentYear}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({ [currentYear]: true });
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({ [currentMonth]: true });
  const [currentPagePerMonth, setCurrentPagePerMonth] = useState<Record<string, number>>({});
  const [currentYearPage, setCurrentYearPage] = useState(1);
  
  const YEARS_PER_PAGE = 5;
  const ABSENCES_PER_PAGE = 10;
  
  // Funções de agrupamento
  const groupAbsencesByYear = (absences: Ausencia[]) => {
    const grouped: Record<string, Ausencia[]> = {};
    absences.forEach(absence => {
      const year = absence.data_inicio.split('/')[2].split(' ')[0];
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(absence);
    });
    return grouped;
  };
  
  const groupAbsencesByMonth = (absences: Ausencia[]) => {
    const grouped: Record<string, Ausencia[]> = {};
    
    absences.forEach(absence => {
      // Parse das datas de início e fim
      const parseDate = (dateStr: string) => {
        const cleanDateStr = dateStr.split(' ')[0];
        const [day, month, year] = cleanDateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      };
      
      const startDate = parseDate(absence.data_inicio);
      const endDate = parseDate(absence.data_fim);
      
      // Para ausências de período longo, adicionar em todos os meses do período
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const monthKey = `${year}-${month}`;
        
        if (!grouped[monthKey]) grouped[monthKey] = [];
        
        // Só adicionar se ainda não estiver na lista (evitar duplicatas)
        const alreadyExists = grouped[monthKey].some(existing => 
          existing.id === absence.id
        );
        
        if (!alreadyExists) {
          grouped[monthKey].push(absence);
        }
        
        // Avançar para o próximo mês
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1); // Garantir que não pule meses com menos dias
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
  
  const handleEdit = (absence: Ausencia) => {
    // Remover horário das datas antes de comparar
    const startDateOnly = absence.data_inicio.split(' ')[0];
    const endDateOnly = absence.data_fim.split(' ')[0];
    const isEspecifica = startDateOnly === endDateOnly;
    
    // Converter datas do formato DD/MM/YYYY para YYYY-MM-DD (formato input date)
    const convertDateFormat = (dateStr: string): string => {
      const [dia, mes, ano] = dateStr.split(' ')[0].split('/');
      return `${ano}-${mes}-${dia}`;
    };
    
    const formattedStartDate = convertDateFormat(absence.data_inicio);
    const formattedEndDate = convertDateFormat(absence.data_fim);
    
    setEditFormData({
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      reason: absence.motivo || '',
    });
    setEditTipoAusencia(isEspecifica ? 'especifica' : 'periodo');
    setEditDialog({ open: true, absence });
  };

  const handleEditTipoAusenciaChange = (event: React.MouseEvent<HTMLElement>, novoTipo: 'especifica' | 'periodo' | null) => {
    if (novoTipo !== null) {
      setEditTipoAusencia(novoTipo);
      
      // Se mudou para data específica, igualar data fim à data início
      if (novoTipo === 'especifica') {
        setEditFormData(prev => ({
          ...prev,
          endDate: prev.startDate
        }));
      }
    }
  };

  const handleEditStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setEditFormData(prev => ({
      ...prev,
      startDate: newStartDate,
      // Se é data específica, igualar data fim. Senão validar que fim >= início
      endDate: editTipoAusencia === 'especifica' 
        ? newStartDate 
        : (new Date(prev.endDate) < new Date(newStartDate) ? newStartDate : prev.endDate),
    }));
  };

  const handleCloseEditDialog = () => {
    setEditDialog({ open: false, absence: null });
    setEditFormData({ startDate: '', endDate: '', reason: '' });
    setEditTipoAusencia('especifica');
  };

  const handleDelete = (absence: Ausencia) => {
    setDeleteDialog({ open: true, absence });
  };

  const handleEditSave = async () => {
    if (!editDialog.absence) return;
    
    // Validação básica
    if (!editFormData.startDate) {
      toast.error('Data de início é obrigatória');
      return;
    }
    
    setLoading2(true);
    try {
      // Garantir que as datas não sejam vazias
      const startDate = editFormData.startDate;
      const endDate = editFormData.endDate || startDate; // Se data fim vazia, usar data início
      
      const dadosParaAtualizar = {
        data_inicio: startDate,
        data_fim: endDate,
        motivo: editFormData.reason.trim() || undefined,
      };
      
      await ausenciasApi.atualizar(editDialog.absence.id, dadosParaAtualizar);
      
      toast.success('Ausência atualizada com sucesso!');
      handleCloseEditDialog();
      onAbsenceRemoved?.(); // Recarregar lista
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar ausência');
    } finally {
      setLoading2(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.absence) return;
    
    setLoading2(true);
    try {
      await ausenciasApi.excluir(deleteDialog.absence.id);
      toast.success('Ausência removida com sucesso!');
      setDeleteDialog({ open: false, absence: null });
      onAbsenceRemoved?.(); // Recarregar lista
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao remover ausência');
    } finally {
      setLoading2(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return dateString.split(' ')[0]; // Remove horário, mantém apenas DD/MM/YYYY
  };

  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    if (start === end) {
      return start; // Data específica
    }
    
    return `${start} até ${end}`; // Período
  };

  const getAbsenceStatus = (startDate: string, endDate: string): {
    status: 'programada' | 'ativa' | 'finalizada';
    label: string;
    color: 'info' | 'success' | 'default';
  } => {
    // Data atual: 2025-07-31 (31/julho/2025)
    const now = new Date();
    
    // Converter DD/MM/YYYY para Date
    const parseDate = (dateStr: string) => {
      const cleanDateStr = dateStr.split(' ')[0]; // Remove horário se houver
      const [day, month, year] = cleanDateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    };
    
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    // Ajustar para comparar apenas datas (sem horário)
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    

    if (now < start) {
      return {
        status: 'programada',
        label: 'Programada',
        color: 'info'
      };
    } else if (now >= start && now <= end) {
      return {
        status: 'ativa',
        label: 'Ativa',
        color: 'success'
      };
    } else {
      return {
        status: 'finalizada',
        label: 'Finalizada',
        color: 'default'
      };
    }
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography>Carregando ausências...</Typography>
      </Paper>
    );
  }

  if (absences.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <EventBusy sx={{ mr: 1, fontSize: 28, color: 'warning.main' }} />
          <Typography variant="h6" component="h2">
            Registro de Ausências
          </Typography>
        </Box>
        <Alert severity="info">
          Nenhuma ausência marcada. Todos os membros estão disponíveis para escalação!
        </Alert>
      </Paper>
    );
  }

  const absencesByYear = groupAbsencesByYear(absences);
  const sortedYears = Object.keys(absencesByYear).sort((a, b) => parseInt(b) - parseInt(a));
  
  // Paginação de anos
  const totalYearPages = Math.ceil(sortedYears.length / YEARS_PER_PAGE);
  const startYearIndex = (currentYearPage - 1) * YEARS_PER_PAGE;
  const paginatedYears = sortedYears.slice(startYearIndex, startYearIndex + YEARS_PER_PAGE);

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center">
          <EventBusy sx={{ mr: 1, fontSize: 28, color: 'warning.main' }} />
          <Typography variant="h6" component="h2">
            Registro de Ausências
          </Typography>
        </Box>
        <Chip 
          label={`${absences.length} ausência${absences.length !== 1 ? 's' : ''}`}
          color="warning"
          size="small"
        />
      </Box>

      <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
        {paginatedYears.map(year => {
          const yearAbsences = absencesByYear[year];
          const absencesByMonth = groupAbsencesByMonth(yearAbsences);
          const sortedMonths = Object.keys(absencesByMonth).sort((a, b) => {
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
                  label={`${yearAbsences.length} ausência${yearAbsences.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white'
                  }}
                />
              </Box>
              
              {/* Conteúdo do Ano */}
              <Collapse in={expandedYears[year]} timeout="auto" unmountOnExit>
                {sortedMonths.map(monthKey => {
                  const monthAbsences = absencesByMonth[monthKey];
                  const currentPage = currentPagePerMonth[monthKey] || 1;
                  const totalPages = Math.ceil(monthAbsences.length / ABSENCES_PER_PAGE);
                  const startIndex = (currentPage - 1) * ABSENCES_PER_PAGE;
                  const paginatedAbsences = monthAbsences.slice(startIndex, startIndex + ABSENCES_PER_PAGE);
                  
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
                          mb: 0.5
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
                          label={`${monthAbsences.length} ausência${monthAbsences.length !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{ 
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            color: 'white'
                          }}
                        />
                      </Box>
                      
                      {/* Conteúdo do Mês */}
                      <Collapse in={expandedMonths[monthKey]} timeout="auto" unmountOnExit>
                        <List sx={{ ml: 1 }}>
                          {paginatedAbsences.map((absence, index) => {
                            const status = getAbsenceStatus(absence.data_inicio, absence.data_fim);
            
                            return (
                              <ListItem 
                                key={absence.id}
                                sx={{
                                  backgroundColor: index % 2 === 0 ? 'grey.50' : 'white',
                                  borderRadius: 1,
                                  mb: 1,
                                  border: '1px solid #e0e0e0',
                                  py: 1,
                                  pr: { xs: 1, sm: 8 } // Adicionar padding direito no desktop para os botões
                                }}
                                secondaryAction={
                                  <Box sx={{ 
                                    display: { xs: 'none', sm: 'flex' }, 
                                    gap: 0.5 
                                  }}>
                                    <Tooltip title="Editar ausência">
                                      <IconButton 
                                        size="small"
                                        onClick={() => handleEdit(absence)}
                                        color="primary"
                                        sx={{ 
                                          border: '1px solid rgba(25, 118, 210, 0.5)', 
                                          borderRadius: 1,
                                          '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.12)' }
                                        }}
                                      >
                                        <Edit fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remover ausência">
                                      <IconButton 
                                        size="small"
                                        onClick={() => handleDelete(absence)}
                                        color="error"
                                        sx={{ 
                                          border: '1px solid rgba(211, 47, 47, 0.5)', 
                                          borderRadius: 1,
                                          '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.12)' }
                                        }}
                                      >
                                        <Delete fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                }
                              >
                                <ListItemIcon>
                                  🎵
                                </ListItemIcon>
                                <Box sx={{ width: '100%' }}>
                                  {/* Cabeçalho Principal */}
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Person fontSize="small" />
                                    <Typography variant="subtitle2" fontWeight="bold">
                                      {absence.nome_membro}
                                    </Typography>
                                    <Chip 
                                      label={status.label}
                                      size="small"
                                      color={status.color}
                                      sx={{ ml: 1 }}
                                    />
                                  </Box>
                                  
                                  {/* Informações Secundárias */}
                                  <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                    <DateRange fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                      {formatDateRange(absence.data_inicio, absence.data_fim)}
                                    </Typography>
                                  </Box>
                                  
                                  {absence.motivo && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                      <strong>Motivo:</strong> {absence.motivo}
                                    </Typography>
                                  )}
                                  
                                  {/* Botões para mobile */}
                                  <Box sx={{ 
                                    display: { xs: 'flex', sm: 'none' }, 
                                    gap: 1, 
                                    justifyContent: 'center',
                                    mt: 1.5,
                                    pt: 1,
                                    borderTop: '1px solid rgba(0, 0, 0, 0.08)'
                                  }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      startIcon={<Edit fontSize="small" />}
                                      onClick={() => handleEdit(absence)}
                                      sx={{ flex: 1, minWidth: 'auto' }}
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      startIcon={<Delete fontSize="small" />}
                                      onClick={() => handleDelete(absence)}
                                      sx={{ flex: 1, minWidth: 'auto' }}
                                    >
                                      Remover
                                    </Button>
                                  </Box>
                                </Box>
                              </ListItem>
                            );
                          })}
                        </List>
                        
                        {/* Paginação do Mês */}
                        {totalPages > 1 && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
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

      <Alert severity="warning" sx={{ mt: 2 }}>
        ⚠️ <strong>Ausências em andamento</strong> não serão escaladas automaticamente até o fim do período.
      </Alert>

      {/* Modal de Edição */}
      <Dialog 
        open={editDialog.open} 
        onClose={handleCloseEditDialog} 
        maxWidth="sm" 
        fullWidth
        disablePortal={false}
        keepMounted={false}
        disableRestoreFocus
      >
        <DialogTitle>
          ✏️ Editar Ausência
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              📅 <strong>Editando ausência de:</strong> {editDialog.absence?.nome_membro}
            </Alert>

            <Box display="flex" justifyContent="center" mb={3}>
              <ToggleButtonGroup
                value={editTipoAusencia}
                exclusive
                onChange={handleEditTipoAusenciaChange}
                aria-label="tipo de ausência"
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  borderRadius: 2,
                  '& .MuiToggleButton-root': {
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.5)',
                    fontWeight: 'normal',
                    '&.Mui-selected': {
                      backgroundColor: '#1976d2',
                      color: 'white',
                      fontWeight: 'bold',
                      border: '1px solid #1976d2',
                      '&:hover': {
                        backgroundColor: '#1565c0',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.9)',
                    },
                  },
                }}
              >
                <ToggleButton value="especifica" aria-label="data especifica">
                  📅 Data Específica
                </ToggleButton>
                <ToggleButton value="periodo" aria-label="periodo">
                  📅 Período
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                label={editTipoAusencia === 'especifica' ? 'Data da Ausência' : 'Data de Início'}
                type="date"
                value={editFormData.startDate}
                onChange={handleEditStartDateChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: dayjs().format('YYYY-MM-DD') }}
                fullWidth
              />
              
              {editTipoAusencia === 'periodo' && (
                <TextField
                  label="Data de Fim"
                  type="date"
                  value={editFormData.endDate}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ 
                    min: editFormData.startDate >= dayjs().format('YYYY-MM-DD') 
                      ? editFormData.startDate 
                      : dayjs().format('YYYY-MM-DD')
                  }}
                  fullWidth
                />
              )}
            </Box>
            <TextField
              label="Motivo (opcional)"
              multiline
              rows={3}
              value={editFormData.reason}
              onChange={(e) => setEditFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Ex: Férias, Viagem, Trabalho..."
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancelar</Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={loading2}
          >
            {loading2 ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação de Deleção */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, absence: null })}
        maxWidth="sm"
        disablePortal={false}
        keepMounted={false}
        disableRestoreFocus
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover a ausência de <strong>
              {deleteDialog.absence?.nome_membro}
            </strong>?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            ℹ️ Esta ação não pode ser desfeita, mas o membro voltará a ficar disponível para escalação.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, absence: null })}>Cancelar</Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={loading2}
          >
            {loading2 ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AbsenceList;
