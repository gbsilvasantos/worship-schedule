# Backend Dockerfile - Node.js 24 Alpine
FROM node:24-alpine

# Instalar dependências básicas para compilação de módulos nativos
RUN apk add --no-cache \
    postgresql-client \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root primeiro
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Definir diretório de trabalho
WORKDIR /app

# Copiar package files primeiro (para melhor cache do Docker)
COPY package*.json ./
COPY tsconfig*.json ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm ci --silent && npm cache clean --force

# Copiar código fonte
COPY src/ ./src/

# Build da aplicação
RUN npm run build

# Remover devDependencies após build para reduzir tamanho
RUN npm ci --only=production --silent && npm cache clean --force

# Alterar ownership dos arquivos para usuário não-root
RUN chown -R backend:nodejs /app

# Mudar para usuário não-root
USER backend

# Expor porta
EXPOSE 4000

# Comando para iniciar
CMD ["npm", "start"]
