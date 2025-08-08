import { io, Socket } from 'socket.io-client';
import { Member, Absence, ScheduleData } from '../types';

// Usar URL relativa para funcionar tanto localmente quanto via proxy reverso
const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || window.location.origin;

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  // Conectar ao servidor
  connect(): Socket {
    if (this.socket) {
      return this.socket;
    }


    
    this.socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // Polling primeiro para evitar warnings
      timeout: 20000,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10, // Limitar tentativas para evitar spam
      reconnectionDelay: 5000, // Aumentar delay entre tentativas
      reconnectionDelayMax: 10000, // Delay máximo entre tentativas
      randomizationFactor: 0.5,
      upgrade: true, // Permite upgrade para websocket
      rememberUpgrade: false, // Não lembra o upgrade
      forceNew: false, // Reutilizar conexão quando possível
      multiplex: true // Multiplexar namespace
    });

    // Eventos de conexão
    this.socket.on('connect', () => {

      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {

      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      // Silenciar completamente erros de conexão quando servidor está offline
      // Apenas logar em modo desenvolvimento se necessário
      // console.debug('Socket: Tentando conectar ao servidor...');
    });

    this.socket.on('connected', (data) => {

    });

    // Silenciar eventos de reconnect
    this.socket.on('reconnect_attempt', () => {
      // Silencioso
    });
    
    this.socket.on('reconnect_error', () => {
      // Silencioso
    });
    
    this.socket.on('reconnect_failed', () => {
      // Silencioso
    });
    
    // Suprimir outros eventos que podem gerar warnings
    this.socket.on('error', () => {
      // Silencioso
    });
    
    // Interceptar e silenciar warnings do transporte
    if (this.socket.io && this.socket.io.engine) {
      this.socket.io.engine.on('upgradeError', () => {
        // Silencioso
      });
    }

    return this.socket;
  }

  // Desconectar
  disconnect(): void {
    if (this.socket && this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Verificar se está conectado
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Obter instância do socket
  getSocket(): Socket | null {
    return this.socket;
  }

  // ==================== EVENTOS DE MEMBROS ====================

  onMemberRegistered(callback: (member: Member) => void): void {
    this.socket?.on('member-registered', callback);
  }

  onMemberUpdated(callback: (member: Member) => void): void {
    this.socket?.on('member-updated', callback);
  }

  onMemberDeleted(callback: (data: { id: number }) => void): void {
    this.socket?.on('member-deleted', callback);
  }

  onMemberStatsUpdated(callback: (stats: Member[]) => void): void {
    this.socket?.on('member-stats-updated', callback);
  }

  // ==================== EVENTOS DE AUSÊNCIAS ====================

  onAbsenceMarked(callback: (absence: Absence) => void): void {
    this.socket?.on('absence-marked', callback);
  }

  onAbsenceUpdated(callback: (absence: Absence) => void): void {
    this.socket?.on('absence-updated', callback);
  }

  onAbsenceRemoved(callback: (data: { id: number }) => void): void {
    this.socket?.on('absence-removed', callback);
  }

  onAbsencesUpdated(callback: () => void): void {
    this.socket?.on('absences-updated', callback);
  }

  // ==================== EVENTOS DE ESCALAS ====================

  onScheduleGenerated(callback: (schedule: ScheduleData) => void): void {
    this.socket?.on('schedule-generated', callback);
  }

  onScheduleConfirmed(callback: (schedule: ScheduleData) => void): void {
    this.socket?.on('schedule-confirmed', callback);
  }

  // ==================== REMOVER LISTENERS ====================

  removeMemberListeners(): void {
    this.socket?.off('member-registered');
    this.socket?.off('member-updated');
    this.socket?.off('member-deleted');
    this.socket?.off('member-stats-updated');
  }

  removeAbsenceListeners(): void {
    this.socket?.off('absence-marked');
    this.socket?.off('absence-updated');
    this.socket?.off('absence-removed');
    this.socket?.off('absences-updated');
  }

  removeScheduleListeners(): void {
    this.socket?.off('schedule-generated');
    this.socket?.off('schedule-confirmed');
  }

  removeAllListeners(): void {
    this.removeMemberListeners();
    this.removeAbsenceListeners();
    this.removeScheduleListeners();
  }

  // ==================== UTILITÁRIOS ====================

  // Enviar ping para manter conexão
  ping(): void {
    this.socket?.emit('ping');
  }

  // Entrar em uma sala
  joinRoom(room: string): void {
    this.socket?.emit('join-room', room);
  }

  // Sair de uma sala
  leaveRoom(room: string): void {
    this.socket?.emit('leave-room', room);
  }

  // Reconectar manualmente
  reconnect(): void {
    if (this.socket) {

      this.socket.connect();
    }
  }
}

// Instância singleton
const socketService = new SocketService();

export default socketService;
