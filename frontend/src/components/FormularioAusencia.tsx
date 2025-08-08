import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Box,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { EventBusy } from '@mui/icons-material';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { ausenciasApi } from '../services/api';
import { Membro, DadosFormularioAusencia, ICONES_FUNCOES } from '../types';

interface AbsenceFormProps {
  members: Membro[];
  onAbsenceAdded?: () => void;
}

const AbsenceForm: React.FC<AbsenceFormProps> = ({ members, onAbsenceAdded }) => {
  const [tipoAusencia, setTipoAusencia] = useState<'especifica' | 'periodo'>('especifica');
  const [formData, setFormData] = useState<DadosFormularioAusencia>({
    membroId: 0,
    dataInicio: dayjs().format('YYYY-MM-DD'),
    dataFim: dayjs().format('YYYY-MM-DD'),
    motivo: '',
  });
  const [loading, setLoading] = useState(false);

  const handleTipoAusenciaChange = (event: React.MouseEvent<HTMLElement>, novoTipo: 'especifica' | 'periodo' | null) => {
    if (novoTipo !== null) {
      setTipoAusencia(novoTipo);
      
      // Se mudou para data específica, igualar data fim à data início
      if (novoTipo === 'especifica') {
        setFormData(prev => ({
          ...prev,
          dataFim: prev.dataInicio
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.membroId) {
      toast.error('Selecione um membro');
      return;
    }

    if (!formData.dataInicio || !formData.dataFim) {
      toast.error('Selecione as datas de início e fim');
      return;
    }

    if (dayjs(formData.dataInicio).isAfter(dayjs(formData.dataFim))) {
      toast.error('Data de início deve ser anterior à data de fim');
      return;
    }

    setLoading(true);
    try {
      await ausenciasApi.criar({
        membro_id: formData.membroId,
        data_inicio: formData.dataInicio,
        data_fim: formData.dataFim,
        motivo: formData.motivo.trim() || undefined,
      });

      const selectedMember = members.find(m => m.id === formData.membroId);
      const memberName = selectedMember ? `${selectedMember.nome} ${selectedMember.sobrenome}` : 'Membro';
      
      toast.success(`Ausência de ${memberName} marcada com sucesso!`);

      // Limpar formulário
      setFormData({
        membroId: 0,
        dataInicio: dayjs().format('YYYY-MM-DD'),
        dataFim: dayjs().format('YYYY-MM-DD'),
        motivo: '',
      });

      // Callback para atualizar lista
      onAbsenceAdded?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao marcar ausência');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberChange = (e: any) => {
    setFormData(prev => ({
      ...prev,
      membroId: e.target.value,
    }));
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setFormData(prev => ({
      ...prev,
      dataInicio: newStartDate,
      // Se é data específica, igualar data fim. Se é período e data fim for anterior, ajustar
      dataFim: tipoAusencia === 'especifica' 
        ? newStartDate 
        : dayjs(prev.dataFim).isBefore(dayjs(newStartDate)) ? newStartDate : prev.dataFim,
    }));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      dataFim: e.target.value,
    }));
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      motivo: e.target.value,
    }));
  };

  if (members.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <EventBusy sx={{ mr: 1, fontSize: 28, color: 'warning.main' }} />
          <Typography variant="h6" component="h2">
            Marcar Ausência
          </Typography>
        </Box>
        <Alert severity="warning">
          Cadastre pelo menos um membro antes de marcar ausências.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mb: 3,
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: 'white'
      }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        <EventBusy sx={{ mr: 1, fontSize: 28 }} />
        <Typography variant="h6" component="h2">
          Marcar Ausência
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Box display="flex" flexDirection="column" gap={2} mb={2}>
          <FormControl 
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.9)',
              },
            }}
          >
            <InputLabel>Pessoa</InputLabel>
            <Select
              value={formData.membroId}
              onChange={handleMemberChange}
              label="Pessoa"
              required
            >
              <MenuItem value={0} disabled>
                Selecione um membro
              </MenuItem>
              {members.map((member) => {
                // Processar funções do membro
                let memberFuncoes: string[] = [];
                const rawFuncoes = member.funcoes as any;
                
                if (typeof rawFuncoes === 'string' && rawFuncoes.startsWith('{') && rawFuncoes.endsWith('}')) {
                  // Array PostgreSQL - remover chaves e dividir por vírgula
                  memberFuncoes = rawFuncoes.slice(1, -1).split(',').map((f: string) => f.trim()).filter((f: string) => f !== '');
                } else if (typeof rawFuncoes === 'string') {
                  memberFuncoes = [rawFuncoes];
                } else if (Array.isArray(rawFuncoes)) {
                  memberFuncoes = rawFuncoes as string[];
                }
                
                const emojis = memberFuncoes.length > 0 
                  ? memberFuncoes.map(funcao => ICONES_FUNCOES[funcao as keyof typeof ICONES_FUNCOES] || '🎵').join(' ')
                  : '🎵';
                
                return (
                  <MenuItem key={member.id} value={member.id}>
                    {emojis} {member.nome} {member.sobrenome}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Tipo de Ausência */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Tipo de Ausência
            </Typography>
            <ToggleButtonGroup
              value={tipoAusencia}
              exclusive
              onChange={handleTipoAusenciaChange}
              aria-label="tipo de ausencia"
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  color: '#666',
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
              label={tipoAusencia === 'especifica' ? 'Data da Ausência' : 'Data de Início'}
              type="date"
              value={formData.dataInicio}
              onChange={handleStartDateChange}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: dayjs().format('YYYY-MM-DD'),
              }}
              required
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.9)',
                },
              }}
            />
            
            {tipoAusencia === 'periodo' && (
              <TextField
                label="Data de Fim"
                type="date"
                value={formData.dataFim}
                onChange={handleEndDateChange}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: formData.dataInicio >= dayjs().format('YYYY-MM-DD') 
                    ? formData.dataInicio 
                    : dayjs().format('YYYY-MM-DD'),
                }}
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  },
                }}
              />
            )}
          </Box>
          
          <TextField
            label="Motivo (opcional)"
            variant="outlined"
            value={formData.motivo}
            onChange={handleReasonChange}
            placeholder="Ex: Férias, Viagem, Trabalho..."
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.9)',
              },
            }}
          />
        </Box>

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          fullWidth
          sx={{
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
          {loading ? 'Marcando...' : 'MARCAR AUSÊNCIA'}
        </Button>
      </form>

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
        {tipoAusencia === 'especifica' 
          ? 'Na data marcada, a pessoa não será escalada automaticamente.'
          : 'Durante o período marcado, a pessoa não será escalada automaticamente.'
        }
      </Alert>
    </Paper>
  );
};

export default AbsenceForm;
