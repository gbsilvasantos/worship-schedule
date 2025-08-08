import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Collapse,
  OutlinedInput
} from '@mui/material';
import { 
  Group, 
  Schedule,
  QueryBuilder,
  TrendingUp,
  EventBusy,
  Person,
  Edit,
  Delete,
  ExpandMore
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { Membro, ICONES_FUNCOES, Funcao, FUNCOES } from '../types';
import { membrosApi } from '../services/api';

interface MembroListProps {
  members: Membro[];
  loading?: boolean;
  onMembroUpdated?: () => void;
}

const MembroList: React.FC<MembroListProps> = ({ members, loading, onMembroUpdated }) => {
  // Verificação de segurança: garantir que members seja sempre um array
  const safeMembers = useMemo(() => {
    
    if (!Array.isArray(members)) return [];
    
    // Processar cada membro para garantir que funcoes seja um array
    return members.map(member => {
      let processedFuncoes: Funcao[] = [];
      
      // Tratar diferentes formatos de funcoes que podem vir do backend
      const rawFuncoes = member.funcoes as any;
      
      // Se funcoes é uma string que começa com { e termina com }, é um array PostgreSQL
      if (typeof rawFuncoes === 'string' && rawFuncoes.startsWith('{') && rawFuncoes.endsWith('}')) {
        // Remover as chaves e dividir por vírgula
        const funcoesList = rawFuncoes.slice(1, -1).split(',').map((f: string) => f.trim()).filter((f: string) => f !== '');
        processedFuncoes = funcoesList as Funcao[];
      }
      // Se ainda é string, transformar em array
      else if (typeof rawFuncoes === 'string') {
        processedFuncoes = [rawFuncoes as Funcao];
      }
      // Se já é array, usar como está
      else if (Array.isArray(rawFuncoes)) {
        processedFuncoes = rawFuncoes as Funcao[];
      }
      
      return {
        ...member,
        funcoes: processedFuncoes
      };
    });
  }, [members]);
  const [editDialog, setEditDialog] = useState<{ open: boolean; member: Membro | null }>({ open: false, member: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; member: Membro | null }>({ open: false, member: null });
  const [editFormData, setEditFormData] = useState({ firstName: '', lastName: '', funcoes: ['Vocalista'] as Funcao[] });
  const [loading2, setLoading2] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Função para toggle das seções
  const toggleSection = (role: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [role]: !prev[role]
    }));
  };


  const formatLastSchedule = (member: Membro): string => {
    if (!member.ultima_escalacao) {
      return 'Nunca';
    }
    
    // A API retorna formato "DD/MM/YYYY HH24:MI:SS"
    const [datePart, timePart] = member.ultima_escalacao.split(' ');
    const [dia, mes, ano] = datePart.split('/');
    const [hora, minuto] = timePart.split(':');
    
    // Criar date para cálculos
    const dataEscalacao = new Date(`${ano}-${mes}-${dia}T00:00:00`);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const diffTime = dataEscalacao.getTime() - hoje.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const dateTimeFormatted = `${datePart} às ${hora}:${minuto}`;
    
    if (days === 0) {
      return `${dateTimeFormatted} (hoje)`;
    } else if (days === 1) {
      return `${dateTimeFormatted} (ontem)`;
    } else if (days > 0) {
      return `${dateTimeFormatted} (${days} dias atrás)`;
    } else {
      // Se a "última escalação" for uma data futura (erro de dados), 
      // ainda assim mostrar como se fosse passada
      const futureDays = Math.abs(days);
      if (futureDays === 1) {
        return `${dateTimeFormatted} (ontem)`;
      }
      return `${dateTimeFormatted} (${futureDays} dias atrás)`;
    }
  };

  const formatNextSchedule = (member: Membro): string => {
    if (!member.proxima_escalacao) {
      return 'Nenhuma';
    }
    
    // A API retorna formato "DD/MM/YYYY HH24:MI:SS"
    const [datePart, timePart] = member.proxima_escalacao.split(' ');
    const [dia, mes, ano] = datePart.split('/');
    const [hora, minuto] = timePart.split(':');
    
    // Criar date para cálculos
    const dataEscalacao = new Date(`${ano}-${mes}-${dia}T00:00:00`);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const diffTime = dataEscalacao.getTime() - hoje.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const dateTimeFormatted = `${datePart} às ${hora}:${minuto}`;
    
    if (days === 0) {
      return `${dateTimeFormatted} (hoje)`;
    } else if (days === 1) {
      return `${dateTimeFormatted} (amanhã)`;
    } else if (days > 0) {
      return `${dateTimeFormatted} (daqui a ${days} dias)`;
    } else {
      // Data passada (dias negativos)
      const pastDays = Math.abs(days);
      return `${dateTimeFormatted} (${pastDays} dias atrás)`;
    }
  };

  // Função auxiliar para calcular dias desde a última escalação
  const calculateDaysSinceLastSchedule = (member: Membro): number | null => {
    if (!member.ultima_escalacao) return null;
    
    // A API retorna formato "DD/MM/YYYY HH24:MI:SS"
    const [datePart] = member.ultima_escalacao.split(' ');
    const [dia, mes, ano] = datePart.split('/');
    const date = new Date(`${ano}-${mes}-${dia}T00:00:00`);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const diffTime = hoje.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Função auxiliar para calcular dias até a próxima escalação
  const calculateDaysToNextSchedule = (member: Membro): number | null => {
    if (!member.proxima_escalacao) return null;
    
    // A API retorna formato "DD/MM/YYYY HH24:MI:SS"
    const [datePart] = member.proxima_escalacao.split(' ');
    const [dia, mes, ano] = datePart.split('/');
    const date = new Date(`${ano}-${mes}-${dia}T00:00:00`);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const diffTime = date.getTime() - hoje.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysColor = (days: number | null | undefined): 'success' | 'warning' | 'error' | 'info' => {
    if (days === null || days === undefined) return 'error';
    if (days === 0) return 'info'; // Hoje = azul
    return 'error'; // Qualquer dia atrás = vermelho
  };

  const getNextScheduleColor = (days: number | null | undefined): 'success' | 'info' | 'error' => {
    if (days === null || days === undefined) return 'error'; // Nenhuma = vermelho
    if (days === 0) return 'info'; // Hoje = azul
    return 'success'; // Futuro (amanhã, daqui a X dias) = verde
  };

  const handleEdit = (member: Membro) => {
    setEditFormData({
      firstName: member.nome,
      lastName: member.sobrenome,
      funcoes: member.funcoes || ['Vocalista'],
    });
    setEditDialog({ open: true, member });
  };

  const handleDelete = (member: Membro) => {
    setDeleteDialog({ open: true, member });
  };

  const handleEditSave = async () => {
    if (!editDialog.member) return;
    
    if (editFormData.funcoes.length === 0) {
      toast.error('Selecione pelo menos uma função');
      return;
    }
    
    setLoading2(true);
    try {
      await membrosApi.atualizar(editDialog.member.id, {
        nome: editFormData.firstName.trim(),
        sobrenome: editFormData.lastName.trim(),
        funcoes: editFormData.funcoes,
      });
      
      toast.success('Membro atualizado com sucesso!');
      setEditDialog({ open: false, member: null });
      onMembroUpdated?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar membro');
    } finally {
      setLoading2(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.member) return;
    
    setLoading2(true);
    try {
      await membrosApi.excluir(deleteDialog.member.id);
      
      toast.success('Membro removido com sucesso!');
      setDeleteDialog({ open: false, member: null });
      onMembroUpdated?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao remover membro');
    } finally {
      setLoading2(false);
    }
  };

  const handleFuncoesChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    const funcoes = typeof value === 'string' ? [value as Funcao] : value as Funcao[];
    setEditFormData(prev => ({ ...prev, funcoes }));
  };

  // Agrupar membros por função (um membro pode aparecer em múltiplas funções)
  const groupedMembros = useMemo(() => {
    const grouped = safeMembers.reduce((acc, member) => {
      // Para cada função do membro, adicionar ele ao grupo da função
      if (Array.isArray(member.funcoes) && member.funcoes.length > 0) {
        member.funcoes.forEach(funcao => {
          if (funcao && funcao.trim()) { // Verificar se a função não é vazia
            if (!acc[funcao]) {
              acc[funcao] = [];
            }
            acc[funcao].push(member);
          }
        });
      }
      return acc;
    }, {} as Record<string, Membro[]>);
    
    return grouped;
  }, [safeMembers]);

  // Inicializar todas as seções como expandidas na primeira renderização
  React.useEffect(() => {
    if (safeMembers.length > 0) {
      // Criar um set de todas as funções disponíveis
      const allFuncoes = new Set<string>();
      safeMembers.forEach(member => {
        // Verificar se funcoes é um array antes de iterar
        if (Array.isArray(member.funcoes)) {
          member.funcoes.forEach(funcao => allFuncoes.add(funcao));
        } else if (member.funcoes && typeof member.funcoes === 'string') {
          // Caso a API retorne uma string ao invés de array (fallback)
          allFuncoes.add(member.funcoes as string);
        }
      });
      

      
      const initialExpanded: Record<string, boolean> = {};
      allFuncoes.forEach(funcao => {
        initialExpanded[funcao] = false; // Todas colapsadas por padrão
      });
      setExpandedSections(initialExpanded);
    }
  }, [safeMembers, groupedMembros]);

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography>Carregando membros...</Typography>
      </Paper>
    );
  }

  if (safeMembers.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Group sx={{ mr: 1, fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h6" component="h2">
            Membros Cadastrados
          </Typography>
        </Box>
        <Alert severity="info">
          Nenhum membro cadastrado ainda. Use o formulário acima para adicionar o primeiro membro!
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center">
          <Group sx={{ mr: 1, fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h6" component="h2">
            Membros Cadastrados
          </Typography>
        </Box>
        <Chip 
          label={`${safeMembers.length} membro${safeMembers.length !== 1 ? 's' : ''}`}
          color="primary"
          size="small"
        />
      </Box>

      <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
        {Object.keys(groupedMembros).length > 0 ? Object.entries(groupedMembros).map(([role, roleMembros]: [string, Membro[]], roleIndex) => (
          <Box key={role}>
            {roleIndex > 0 && <Divider sx={{ my: 2 }} />}
            
            {/* Cabeçalho da função */}
            <Box 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                mb: 1,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                },
                borderRadius: 1,
                padding: 0.5
              }}
              onClick={() => toggleSection(role)}
            >
              <IconButton 
                size="small" 
                sx={{ 
                  mr: 1, 
                  transform: expandedSections[role] ? 'rotate(0deg)' : 'rotate(-90deg)',
                  transition: 'transform 0.2s'
                }}
              >
                <ExpandMore />
              </IconButton>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 'bold',
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  flex: 1
                }}
              >
                <span style={{ fontSize: '1.2em', marginRight: 8 }}>
                  {ICONES_FUNCOES[role as keyof typeof ICONES_FUNCOES] || '🎵'}
                </span>
                {role} ({roleMembros.length})
              </Typography>
            </Box>

            <Collapse in={expandedSections[role]} timeout="auto" unmountOnExit>
              <List dense>
                {roleMembros.map((member: Membro, index: number) => (
                <ListItem
                  key={member.id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? 'grey.50' : 'white',
                    borderRadius: 1,
                    mb: 1,
                    border: '1px solid #e0e0e0',
                    py: 1.5,
                    position: 'relative'
                  }}
                  secondaryAction={
                    <Box sx={{ 
                      display: { xs: 'none', sm: 'flex' },
                      gap: 0.5
                    }}>
                      <Tooltip title="Editar membro">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(member)}
                          sx={{ 
                            border: '1px solid rgba(25, 118, 210, 0.5)', 
                            borderRadius: 1,
                            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.12)' }
                          }}
                        >
                          <Edit fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remover membro">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(member)}
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
                  }
                >  
                  <ListItemIcon sx={{ minWidth: 35 }}>
                    <Person color="action" />
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Typography fontWeight="medium" component="div" sx={{ fontSize: '0.9rem', pl: '2px' }}>
                        {member.nome} {member.sobrenome}
                      </Typography>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={
                      <>


                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Schedule fontSize="small" color="action" sx={{ fontSize: '1rem' }} />
                            <span style={{ fontSize: '0.7rem', color: 'rgba(0, 0, 0, 0.6)' }}>Última escalação:</span>
                          </div>
                          <Chip 
                            label={formatLastSchedule(member)} 
                            color={getDaysColor(calculateDaysSinceLastSchedule(member))}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, '& .MuiChip-label': { px: 1, py: 0, fontSize: '0.7rem' } }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <QueryBuilder fontSize="small" color="action" sx={{ fontSize: '1rem' }} />
                            <span style={{ fontSize: '0.7rem', color: 'rgba(0, 0, 0, 0.6)' }}>Próxima escalação:</span>
                          </div>
                          <Chip 
                            label={formatNextSchedule(member)} 
                            color={getNextScheduleColor(calculateDaysToNextSchedule(member))}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, '& .MuiChip-label': { px: 1, py: 0, fontSize: '0.7rem' } }}
                          />
                        </div>

                        {member.total_escalacoes_90_dias !== undefined && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', marginLeft: '-4px' }}>
                            <TrendingUp fontSize="small" color="action" sx={{ fontSize: '1rem' }} />
                            <span style={{ fontSize: '0.7rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                              Escalações nos últimos 90 dias: {member.total_escalacoes_90_dias}
                            </span>
                          </div>
                        )}
                        
                        {member.total_ausencias_90_dias !== undefined && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', marginLeft: '-4px' }}>
                            <EventBusy fontSize="small" color="action" sx={{ fontSize: '1rem' }} />
                            <span style={{ fontSize: '0.7rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                              Ausências nos últimos 90 dias: {member.total_ausencias_90_dias}
                            </span>
                          </div>
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
                            onClick={(e) => { e.stopPropagation(); handleEdit(member); }}
                            sx={{ flex: 1, minWidth: 'auto' }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Delete fontSize="small" />}
                            onClick={(e) => { e.stopPropagation(); handleDelete(member); }}
                            sx={{ flex: 1, minWidth: 'auto' }}
                          >
                            Remover
                          </Button>
                        </Box>
                      </>
                    }
                  />
                </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>
        )) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            Nenhum membro encontrado. Os membros podem não ter funções atribuídas corretamente.
          </Alert>
        )}
      </Box>

      {/* Modal de Edição */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, member: null })} maxWidth="sm" fullWidth disablePortal={false} keepMounted={false} disableRestoreFocus>
        <DialogTitle>Editar Membro</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Nome"
              value={editFormData.firstName}
              onChange={(e) => setEditFormData(prev => ({ ...prev, firstName: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Sobrenome"
              value={editFormData.lastName}
              onChange={(e) => setEditFormData(prev => ({ ...prev, lastName: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Funções</InputLabel>
              <Select
                multiple
                value={editFormData.funcoes}
                onChange={handleFuncoesChange}
                input={<OutlinedInput label="Funções" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={`${ICONES_FUNCOES[value as Funcao]} ${value}`}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {FUNCOES.map((role) => (
                  <MenuItem key={role} value={role}>
                    <span style={{ marginRight: 8, fontSize: 18 }}>{ICONES_FUNCOES[role]}</span>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, member: null })}>Cancelar</Button>
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
        onClose={() => setDeleteDialog({ open: false, member: null })}
        maxWidth="sm"
        disablePortal={false}
        keepMounted={false}
        disableRestoreFocus
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover <strong>
              {deleteDialog.member?.nome} {deleteDialog.member?.sobrenome}
            </strong> da lista de membros?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            ⚠️ Esta ação não pode ser desfeita. O histórico de escalações do membro será mantido.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, member: null })}>Cancelar</Button>
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

export default MembroList;
