import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  Chip,
  Fab,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import { 
  MusicNote, 
  Wifi, 
  WifiOff,
  Refresh,
} from '@mui/icons-material';

// Componentes
import FormularioMembro from './components/FormularioMembro';
import ListaMembros from './components/ListaMembros';
import FormularioAusencia from './components/FormularioAusencia';
import ListaAusencias from './components/ListaAusencias';
import GeradorEscalas from './components/GeradorEscalas';
import EscalasSalvas from './components/EscalasSalvas';

// Serviços
import { membrosApi, ausenciasApi } from './services/api';
import socketService from './services/socket';

// Tipos
import { Membro, Ausencia } from './types';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

const App: React.FC = () => {
  // Estados principais
  const [members, setMembers] = useState<Membro[]>([]);
  const [absences, setAbsences] = useState<Ausencia[]>([]);
  
  // Estados de carregamento
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [absencesLoading, setAbsencesLoading] = useState(false);
  
  // Estados de conexão
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Carregar na ordem correta: membros/estatisticas, depois ausencias
      await loadMembers();
      await loadAbsences();
      // EscalasSalvas será chamado automaticamente pelo useEffect quando membros estiverem prontos
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const membersData = await membrosApi.listarTodosComEstatisticas();
      setMembers(membersData);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const loadAbsences = async () => {
    setAbsencesLoading(true);
    try {
      const absencesData = await ausenciasApi.listarTodas();
      setAbsences(absencesData);
    } catch (error) {
      console.error('Erro ao carregar ausências:', error);
    } finally {
      setAbsencesLoading(false);
    }
  };

  const setupSocketConnection = useCallback(() => {
    const socket = socketService.connect();

    // Eventos de conexão
    socket.on('connect', () => {
      setIsConnected(true);
      setShowConnectionAlert(false);
      // Carregar dados APÓS conexão estabelecida
      loadInitialData();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setShowConnectionAlert(true);
    });

    // Eventos de membros
    socketService.onMemberRegistered((member) => {

      loadMembers(); // Recarregar lista com estatísticas
    });

    socketService.onMemberUpdated((member) => {

      loadMembers(); // Recarregar lista com estatísticas
    });

    socketService.onMemberDeleted((data) => {

      setMembers(prev => prev.filter(m => m.id !== data.id));
      // Recarregar ausências pois as do membro removido também foram excluídas
      loadAbsences();
      // Recarregar membros para atualizar escalas que continham o membro removido
      loadMembers();
    });

    socketService.onMemberStatsUpdated((stats) => {

      setMembers(stats);
    });

    // Eventos de ausências
    socketService.onAbsenceMarked((absence) => {
      loadAbsences(); // Recarregar lista de ausências
      loadMembers(); // Recarregar estatísticas dos membros
    });

    socketService.onAbsenceUpdated((absence) => {
      loadAbsences(); // Recarregar lista de ausências
      loadMembers(); // Recarregar estatísticas dos membros
    });

    socketService.onAbsenceRemoved((data) => {
      setAbsences(prev => prev.filter(a => a.id !== data.id));
      loadMembers(); // Recarregar estatísticas dos membros
    });

    socketService.onAbsencesUpdated(() => {
      loadAbsences(); // Recarregar lista de ausências
      loadMembers(); // Recarregar estatísticas dos membros
    });

    // Eventos de escalas
    socketService.onScheduleConfirmed(() => {
      loadMembers(); // Recarregar para atualizar estatísticas
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Configurar conexão - dados serão carregados após conectar
  useEffect(() => {
    setupSocketConnection();
    
    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vazio garante execução apenas uma vez

  const handleMemberAdded = () => {
    // O socket.io já vai atualizar automaticamente
    // Mas podemos forçar um reload se necessário
  };

  const handleAbsenceAdded = () => {
    // O socket.io já vai atualizar automaticamente
  };



  const handleReconnect = () => {
    socketService.reconnect();
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            textAlign: 'center',
            px: 2
          }}
        >
          {/* Ícone animado */}
          <Box 
            sx={{ 
              fontSize: '4rem',
              mb: 3,
              animation: 'bounce 2s infinite',
              '@keyframes bounce': {
                '0%, 20%, 50%, 80%, 100%': {
                  transform: 'translateY(0)'
                },
                '40%': {
                  transform: 'translateY(-30px)'
                },
                '60%': {
                  transform: 'translateY(-15px)'
                }
              }
            }}
          >
            🎵
          </Box>

          {/* Título principal */}
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 'bold', 
              mb: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            OPS! 🤔
          </Typography>

          {/* Mensagem */}
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 3,
              opacity: 0.9,
              maxWidth: '600px'
            }}
          >
            Estamos aguardando o backend ficar disponível para carregar o sistema de escalas...
          </Typography>

          {/* Loading spinner */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <CircularProgress 
              size={24} 
              sx={{ 
                color: 'white',
                animation: 'spin 1s linear infinite'
              }} 
            />
            <Typography variant="body1" sx={{ opacity: 0.8 }}>
              Conectando-se ao servidor...
            </Typography>
          </Box>

          {/* Dica técnica */}
          <Box 
            sx={{
              mt: 4,
              p: 2,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              💡 <strong>Dica:</strong> Verifique se o servidor backend está rodando na porta 4000
            </Typography>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Cabeçalho */}
        <Box textAlign="center" mb={4}>
          <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
            <MusicNote sx={{ fontSize: 40, color: 'primary.main', mr: 1 }} />
            <Typography 
              variant="h4" 
              component="h1" 
              color="primary.main"
              fontWeight="bold"
            >
              QUADRO DE ESCALAS - MINISTÉRIO DE LOUVOR
            </Typography>
          </Box>
          
          <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
            <Chip 
              icon={isConnected ? <Wifi /> : <WifiOff />}
              label={isConnected ? 'Online' : 'Offline'}
              color={isConnected ? 'success' : 'error'}
              size="small"
            />
            <Chip 
              label={`${members.length} membro${members.length !== 1 ? 's' : ''}`}
              color="primary"
              size="small"
            />
            <Chip 
              label={`${absences.length} ausência${absences.length !== 1 ? 's' : ''}`}
              color="warning"
              size="small"
            />
          </Box>
        </Box>

        {/* Formulário de cadastro */}
        <FormularioMembro onMemberAdded={handleMemberAdded} />

        {/* Lista de membros */}
        <ListaMembros members={members} loading={membersLoading} onMembroUpdated={handleMemberAdded} />

        {/* Formulário de ausências */}
        <FormularioAusencia members={members} onAbsenceAdded={handleAbsenceAdded} />

        {/* Lista de ausências */}
        <ListaAusencias 
          absences={absences} 
          loading={absencesLoading}
          onAbsenceRemoved={loadAbsences}
        />

        {/* Gerador de escalas */}
        <GeradorEscalas 
          onEscalasModificadas={loadMembers}
        />
        
        {/* Escalas salvas */}
        <EscalasSalvas membros={members} onEscalasModificadas={loadMembers} />

        {/* FAB para reconectar */}
        {!isConnected && (
          <Fab
            color="secondary"
            aria-label="reconnect"
            onClick={handleReconnect}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
          >
            <Refresh />
          </Fab>
        )}

        {/* Alert de conexão */}
        <Snackbar
          open={showConnectionAlert}
          autoHideDuration={6000}
          onClose={() => setShowConnectionAlert(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            severity="warning" 
            onClose={() => setShowConnectionAlert(false)}
            sx={{ width: '100%' }}
          >
            Conexão perdida. Tentando reconectar automaticamente...
          </Alert>
        </Snackbar>

        {/* Footer */}
        <Box textAlign="center" mt={6} py={3}>
          <Typography variant="body2" color="text.secondary">
            🎵 Sistema de Escalas do Ministério • Desenvolvido por Gabriel Santos • Versão 1.0.0
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Atualizações em tempo real • Sem necessidade de refresh
          </Typography>
        </Box>

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4caf50',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#f44336',
                secondary: '#fff',
              },
            },
          }}
        />
      </Container>
    </ThemeProvider>
  );
};

export default App;