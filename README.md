# 🎵 Worship Schedule - Sistema de Escalas Inteligente

<div align="center">

### 🚀 **Transforme seu localhost em um servidor público com Docker + Cloudflare Tunnel**

*Sistema web colaborativo para organizar escalas de cultos de forma automática, justa e transparente*

[![Demo Live](https://img.shields.io/badge/🌐_Demo_Live-hml.portadagraca.com.br-blue?style=for-the-badge)](https://hml.portadagraca.com.br)

![React](https://img.shields.io/badge/React-19.1.1-61DAFB?style=flat&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?style=flat&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-010101?style=flat&logo=socket.io&logoColor=white)

</div>

---

## 🎯 **O Problema que Resolvemos**

**Antes:** 📝 Escalas no papel, WhatsApp caótico, sempre os mesmos tocando...  
**Agora:** 🚀 Sistema inteligente que distribui de forma justa e automática!

## ✨ Principais Características

### 🎯 **Simplicidade Total**
- **Sem cadastros complicados** - apenas nome, sobrenome e função
- **Sem senhas** - acesso livre pelo link
- **Interface intuitiva** - qualquer pessoa consegue usar
- **Funciona no celular** - responsivo e touch-friendly

### 🔄 **Tempo Real**
- **Atualizações instantâneas** - mudanças aparecem para todos automaticamente
- **Socket.IO** - comunicação bidirecional em tempo real
- **Sem refresh** - nunca precisa recarregar a página

### 🧠 **Algoritmo Inteligente**
- **Distribuição justa** - prioriza quem está há mais tempo sem tocar
- **Respeita ausências** - não escala quem está viajando/indisponível
- **Balanceamento automático** - todos participam com a mesma frequência
- **Histórico persistente** - lembra de todas as escalações anteriores

### 👥 **Colaborativo**
- **Quadro compartilhado** - todos veem e interagem com os mesmos dados
- **Marcação de ausências** - fácil de avisar quando não pode participar
- **Transparência total** - todos veem quem está disponível/indisponível

## 🚀 **Quick Start - 3 Formas de Usar**

### **📱 1. Modo Usuário (Mais Simples)**
**Acesse a demo funcionando:** https://hml.portadagraca.com.br
- ✅ Sem instalação
- ✅ Funciona no celular  
- ✅ Dados de demonstração

### **💻 2. Desenvolvimento Local**
```bash
# Clone e execute
git clone https://github.com/gbsilvasantos/worship-schedule.git
cd worship-schedule
docker-compose up --build
```
**Pronto!** Acesse http://localhost:80

### **🌐 3. Servidor Público (Avançado) - Cloudflare Tunnel Magic! ✨**

**🎯 Por que Cloudflare Tunnel é revolucionário:**
- ❌ **Sem Port Forwarding** - Não precisa abrir portas no router
- ❌ **Sem IP Estático** - Funciona com IP dinâmico
- ❌ **Sem VPS** - Use sua própria máquina
- ✅ **SSL Automático** - HTTPS gratuito
- ✅ **DDoS Protection** - Cloudflare protege automaticamente
- ✅ **Edge Computing** - CDN global incluído

#### **🚀 Setup Completo (Testado e Funcionando):**

```bash
# 1. Setup do projeto
docker-compose up -d --build

# 2. Instalar Cloudflared (Ubuntu/Debian)
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# 3. Login no Cloudflare (abrirá o browser)
cloudflared tunnel login

# 4. Criar tunnel
cloudflared tunnel create hml-tunnel
# ✅ Anote o TUNNEL_ID que aparecerá!

# 5. Criar DNS record
cloudflared tunnel route dns hml-tunnel hml.portadagraca.com.br

# 6. Criar arquivo de configuração
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

#### **📄 Conteúdo do config.yml:**
```yaml
tunnel: 1d1ab1d3-3dc8-461c-b83f-fd9658c49982
credentials-file: /home/ubuntu/.cloudflared/1d1ab1d3-3dc8-461c-b83f-fd9658c49982.json

ingress:
  - hostname: hml.portadagraca.com.br
    service: http://localhost:80
  - service: http_status:404
```

#### **🔧 Finalizando a instalação:**
```bash
# 7. Testar manualmente
sudo cloudflared tunnel --config /etc/cloudflared/config.yml run

# 8. Se funcionou, instalar como serviço
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# 9. Verificar status
sudo systemctl status cloudflared
```

**🎉 Resultado:** Sua aplicação localhost agora é **https://hml.portadagraca.com.br** - acessível globalmente!

### **2. Para os Membros**
1. **Receba o link** no WhatsApp do grupo
2. **Abra no celular** (não precisa baixar nada)
3. **Se cadastre** em 30 segundos:
   - Nome: João
   - Sobrenome: Silva  
   - Função: Guitarrista
4. **Marque ausências** quando necessário:
   - Período de férias
   - Datas específicas que não pode

### **3. Para os Líderes**
1. **Acesse o mesmo link** que todos
2. **Veja membros cadastrados** em tempo real
3. **Selecione datas** no calendário interativo
4. **Clique "Gerar Escala"** - sistema faz tudo automaticamente
5. **Compartilhe resultado** no grupo

## 🛠️ **Stack Tecnológico**

<div align="center">

| **Categoria** | **Tecnologia** | **Versão** | **Por que escolhemos** |
|---------------|----------------|------------|------------------------|
| **Frontend** | React + TypeScript | 19.1.1 | Interface moderna e tipagem segura |
| **UI Library** | Material-UI | 7.2.0 | Componentes prontos e responsivos |
| **State Management** | React Hooks | Nativo | Simplicidade e performance |
| **Real-time** | Socket.IO Client | 4.7.5 | Comunicação bidirecional |
| **Date Handling** | Day.js | 1.11.0 | Leve e intuitivo |
| **HTTP Client** | Axios | 1.6.0 | Interceptors e tratamento de erros |
| **Backend** | Node.js + Express | 20+ | Ecossistema robusto e TypeScript |
| **API Documentation** | Swagger UI | 5.0.1 | Documentação interativa da API |
| **WebSockets** | Socket.IO | 4.7.5 | Real-time com fallback |
| **Database** | PostgreSQL | 17-alpine | ACID, performance e confiabilidade |
| **ORM/Query** | Pure SQL | Nativo | Controle total e performance |
| **Security** | Helmet + CORS | Latest | Proteção contra vulnerabilidades |
| **Rate Limiting** | Express-rate-limit | 8.0.1 | Proteção contra DDoS |
| **Containerization** | Docker + Compose | Latest | Isolamento e portabilidade |
| **Reverse Proxy** | Nginx | Alpine | Load balancing e SSL |
| **Tunnel** | Cloudflare Tunnel | Latest | Exposição pública segura |
| **Virtualization** | Multipass | Latest | VM isolada no macOS |

</div>

### **🏗️ Arquitetura do Sistema**

```mermaid
graph TB
    A[🌐 Internet] --> B[☁️ Cloudflare Tunnel + SSL + DDoS]
    B --> C[🖥️ Multipass VM Ubuntu]
    C --> D[🐳 Docker Compose Stack]
    D --> E[⚛️ React Frontend :80]
    D --> F[🟢 Node.js API :4000 + Swagger]
    F --> G[🐘 PostgreSQL :5432]
    F --> H[📊 PgAdmin :8080]
    
    E <--> I[🔌 Socket.IO Real-time]
    F <--> I
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#e8f5e8
    style E fill:#e3f2fd
    style F fill:#e8f5e8
    style G fill:#fff8e1
```

## 📁 Estrutura do Projeto

```
worship-schedule/
├── 📋 docker-compose.yml      # Orquestração dos containers
├── 📚 README.md              # Este arquivo
│
├── 🎨 frontend/              # Aplicação React
│   ├── 🐳 Dockerfile
│   ├── 📦 package.json
│   ├── 🔧 tsconfig.json
│   ├── 🌐 public/
│   │   └── index.html
│   └── 📝 src/
│       ├── App.tsx           # Componente principal
│       ├── index.tsx         # Entry point
│       ├── 🧩 components/    # Componentes React
│       │   ├── MemberForm.tsx
│       │   ├── MemberList.tsx
│       │   ├── AbsenceForm.tsx
│       │   ├── AbsenceList.tsx
│       │   ├── ScheduleGenerator.tsx
│       │   └── ScheduleResult.tsx
│       ├── 🔧 services/      # APIs e Socket.IO
│       │   ├── api.ts
│       │   └── socket.ts
│       └── 📝 types/         # Tipos TypeScript
│           └── index.ts
│
├── ⚙️ backend/               # API Node.js
│   ├── 🐳 Dockerfile
│   ├── 📦 package.json
│   ├── 🔧 tsconfig.json
│   └── 📝 src/
│       ├── server.ts         # Servidor principal
│       ├── 🛣️ routes/        # Rotas da API
│       │   ├── members.ts
│       │   ├── absences.ts
│       │   └── schedule.ts
│       ├── 🔧 services/      # Lógica de negócio
│       │   └── scheduleGenerator.ts
│       ├── 🗄️ database/      # Conexão com DB
│       │   └── connection.ts
│       └── 📝 types/         # Tipos TypeScript
│           └── index.ts
│
└── 🗄️ database/             # PostgreSQL
    └── init/
        └── 01_esquema_tabelas.sql  # Schema inicial com todas as tabelas
```

## 🎼 Funções Musicais Disponíveis

| Função | Quantidade | Ícone |
|--------|------------|--------|
| **Vocalista** | 2 por culto | 🎤 |
| **Guitarrista** | 1 por culto | 🎸 |
| **Violão** | 1 por culto | 🎸 |
| **Baixista** | 1 por culto | 🎵 |
| **Baterista** | 1 por culto | 🥁 |
| **Tecladista** | 1 por culto | 🎹 |
| **Percussão** | 1 por culto | 🪘 |

## 🧮 Como Funciona o Algoritmo

### **Regra Principal**
> "Se não marcou ausência = está disponível"

### **Priorização (em ordem)**
1. **🚨 Nunca escalado** - Prioridade máxima
2. **📅 Mais dias sem escalar** - Quem está há mais tempo parado
3. **📊 Menos escalações recentes** - Nos últimos 90 dias  
4. **⏰ Cadastro mais antigo** - Desempate final

### **Exemplo Prático**
```
Função: Guitarrista - Culto 28/01/2025
Disponíveis:

1. 🥇 João Silva - Nunca escalado (ESCOLHIDO)
2. 🥈 Pedro Costa - 58 dias sem escalar  
3. 🥉 Gabriel Santos - 13 dias sem escalar
4. 🏅 Carlos Lima - 7 dias sem escalar
```

## 📊 **APIs Disponíveis**

### **🎯 Swagger Documentation - Documentação Interativa Completa**

**🔗 Acesse:** `http://localhost:4000/api/swagger` (desenvolvimento)

**✨ Features do Swagger:**
- 📋 **Documentação completa** de todos os endpoints
- 🧪 **Teste as APIs diretamente** no navegador
- 📝 **Schemas detalhados** de request/response
- 🔍 **Validação em tempo real** dos parâmetros
- 📊 **Exemplos práticos** para cada endpoint

![Swagger UI](https://img.shields.io/badge/Swagger-API%20Documentation-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

---

### **Membros**
- `GET /api/members` - Listar membros
- `GET /api/members/stats` - Membros com estatísticas
- `POST /api/members` - Cadastrar/atualizar membro
- `DELETE /api/members/:id` - Remover membro

### **Ausências**  
- `GET /api/absences` - Listar ausências ativas
- `POST /api/absences` - Marcar ausência
- `DELETE /api/absences/:id` - Remover ausência

### **Escalas**
- `POST /api/schedule/generate` - Gerar escala
- `POST /api/schedule/confirm` - Confirmar e salvar
- `GET /api/schedule/history` - Histórico de escalações
- `GET /api/schedule/stats` - Estatísticas gerais

## 🔧 **Comandos Essenciais**

### **🚀 Desenvolvimento**
```bash
# Subir aplicação completa
docker-compose up --build

# Executar em background
docker-compose up -d --build

# Ver logs específicos
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f database

# Rebuild específico
docker-compose build frontend && docker-compose up -d frontend

# Parar e limpar tudo
docker-compose down -v
docker system prune -f
```

### **🌐 Cloudflare Tunnel Setup**
```bash
# Criar arquivo de configuração
sudo nano /etc/cloudflared/config.yml

# Testar tunnel manualmente
cloudflared tunnel --config /etc/cloudflared/config.yml run meu-tunnel

# Instalar como serviço systemd
sudo cloudflared service install --config /etc/cloudflared/config.yml
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Verificar status
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

### **🗄️ Backup & Restore**
```bash
# Backup automático com data
DATE=$(date +"%Y%m%d_%H%M%S")
docker-compose exec database pg_dump -U worship_user worship_db > "backup_${DATE}.sql"

# Restore
docker-compose exec -T database psql -U worship_user worship_db < backup_20250108_143000.sql

# Backup via cron (diário às 2h)
echo "0 2 * * * /path/to/backup-script.sh" | crontab -
```

### **📊 Monitoramento**
```bash
# Status geral
docker-compose ps
docker stats

# Health checks
curl http://localhost:4000/api/health
curl -I http://localhost:80

# Verificar conectividade do tunnel
cloudflared tunnel list
curl -I https://seudominio.com.br
```

### **Manutenção**
```bash
# Limpar dados antigos (>1 ano)
curl -X DELETE "http://localhost:4000/api/schedule/history/cleanup?older_than_days=365"

# Ver estatísticas
curl http://localhost:4000/api/schedule/stats

# Health check
curl http://localhost:4000/api/health
```

## 🌐 Ambientes

### **Desenvolvimento**
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000  
- **Database:** localhost:5432

### **Produção**
- Configure as variáveis de ambiente
- Use HTTPS com certificado SSL
- Configure backup automático do banco
- Monitore logs e performance

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```bash
# Database
DATABASE_URL=postgresql://worship_user:worship_pass@database:5432/worship_db

# Node
NODE_ENV=production
PORT=4000

# Frontend  
REACT_APP_API_URL=http://localhost:4000/api
```

## 🐛 Solução de Problemas

### **Problema: Container não sobe**
```bash
# Verificar logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs database

# Rebuild limpo
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### **Problema: Banco não conecta**
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Recrear volumes
docker-compose down -v
docker volume prune
docker-compose up --build
```

### **Problema: Socket.IO não conecta**
- Verificar se backend está rodando na porta 4000
- Verificar CORS no backend
- Verificar firewall/proxy


## 👨‍💻 **Autor & Repositório**

**Gabriel Santos**
- 🐙 **GitHub:** [gbsilvasantos/worship-schedule](https://github.com/gbsilvasantos/worship-schedule)
- 🌐 **Demo Live:** [hml.portadagraca.com.br](https://hml.portadagraca.com.br)
- 💼 **LinkedIn:** Compartilhe este projeto!

---

<div align="center">

### 🚀 **"De Localhost para o Mundo - Um Projeto DevOps Completo"**

*Demonstrando como transformar uma aplicação local em um serviço público usando tecnologias modernas*

[![⭐ Star no GitHub](https://img.shields.io/github/stars/gbsilvasantos/worship-schedule?style=social)](https://github.com/gbsilvasantos/worship-schedule)

</div>
