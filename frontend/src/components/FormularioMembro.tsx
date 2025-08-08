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
  SelectChangeEvent,
  Chip,
  OutlinedInput,
} from '@mui/material';
import { Person } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { membrosApi } from '../services/api';
import { DadosFormularioMembro, FUNCOES, Funcao, ICONES_FUNCOES } from '../types';

interface MemberFormProps {
  onMemberAdded?: () => void;
}

const MemberForm: React.FC<MemberFormProps> = ({ onMemberAdded }) => {
  const [formData, setFormData] = useState<DadosFormularioMembro>({
    primeiroNome: '',
    ultimoNome: '',
    funcoes: ['Vocalista'], // Array com pelo menos uma função
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.primeiroNome.trim() || !formData.ultimoNome.trim()) {
      toast.error('Nome e sobrenome são obrigatórios');
      return;
    }

    if (formData.funcoes.length === 0) {
      toast.error('Selecione pelo menos uma função');
      return;
    }

    setLoading(true);
    try {
      const result = await membrosApi.criar({
        nome: formData.primeiroNome.trim(),
        sobrenome: formData.ultimoNome.trim(),
        funcoes: formData.funcoes,
      });

      const funcoesTexto = formData.funcoes.join(', ');
      toast.success(`${formData.primeiroNome} cadastrado(a) com as funções: ${funcoesTexto}!`);

      // Limpar formulário
      setFormData({
        primeiroNome: '',
        ultimoNome: '',
        funcoes: ['Vocalista'],
      });

      // Callback para atualizar lista
      onMemberAdded?.();
    } catch (error: any) {
      console.error('Erro ao cadastrar membro:', error);
      toast.error(error.response?.data?.error || 'Erro ao cadastrar membro');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: 'primeiroNome' | 'ultimoNome') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleFuncoesChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    const funcoes = typeof value === 'string' ? [value as Funcao] : value as Funcao[];
    setFormData(prev => ({ 
      ...prev, 
      funcoes
    }));
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mb: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        <Person sx={{ mr: 1, fontSize: 28 }} />
        <Typography variant="h6" component="h2">
          Cadastro Rápido
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2} mb={2}>
          <TextField
            label="Nome"
            variant="outlined"
            value={formData.primeiroNome}
            onChange={handleChange('primeiroNome')}
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.9)',
              },
            }}
          />
          
          <TextField
            label="Sobrenome"
            variant="outlined"
            value={formData.ultimoNome}
            onChange={handleChange('ultimoNome')}
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.9)',
              },
            }}
          />
          
          <FormControl 
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.9)',
              },
            }}
          >
            <InputLabel>Funções</InputLabel>
            <Select
              multiple
              value={formData.funcoes}
              onChange={handleFuncoesChange}
              input={<OutlinedInput label="Funções" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={`${ICONES_FUNCOES[value as Funcao]} ${value}`}
                      size="small"
                      sx={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                    />
                  ))}
                </Box>
              )}
              required
            >
              {FUNCOES.map(funcao => (
                <MenuItem key={funcao} value={funcao}>
                  <span style={{ marginRight: 8, fontSize: 16 }}>{ICONES_FUNCOES[funcao] || '🎵'}</span>
                  {funcao}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
          {loading ? 'Cadastrando...' : 'CADASTRAR'}
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
        Preencha os campos para cadastrar um novo membro da equipe.
      </Alert>
    </Paper>
  );
};

export default MemberForm;
