# ========================================================
# Stage 1: Build da aplicação React
# ========================================================
FROM node:24-alpine AS builder

WORKDIR /app

# Argumento de build para a URL da API
ARG REACT_APP_API_URL

# Definir variável de ambiente para uso no build
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Copiar package files primeiro
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências
RUN npm ci --silent --only=production=false

# Copiar restante do código
COPY public/ ./public/
COPY src/ ./src/

# Rodar build de produção
RUN npm run build

# ========================================================
# Stage 2: NGINX para servir a aplicação
# ========================================================
FROM nginx:alpine

# Remover configuração padrão
RUN rm /etc/nginx/nginx.conf

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar build gerado do Stage 1
COPY --from=builder /app/build /usr/share/nginx/html

# Verificar se o usuário nginx existe e garantir permissões corretas
RUN if ! grep -q "^nginx:" /etc/group; then addgroup -g 1001 -S nginx; fi && \
    if ! grep -q "^nginx:" /etc/passwd; then adduser -S nginx -u 1001 -G nginx; fi && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Mudar para usuário não-root
USER nginx

# Expor porta
EXPOSE 80

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]