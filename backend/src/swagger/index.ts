import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { getSwaggerConfig } from './config';
import dotenv from 'dotenv';
dotenv.config();

export const setupSwagger = (app: Express): void => {
  // Swagger UI com configuração dinâmica
  app.use('/api/swagger', swaggerUi.serve);
  app.get('/api/swagger', (req, res, next) => {
    // Gerar specs dinamicamente baseado na requisição
    const dynamicSpecs = swaggerJsdoc(getSwaggerConfig(req));
    const swaggerUIHandler = swaggerUi.setup(dynamicSpecs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: "API Escala Ministério"
    });
    swaggerUIHandler(req, res, next);
  });

  // Swagger JSON cru com configuração dinâmica
  app.get('/api/swagger.json', (req, res) => {
    const dynamicSpecs = swaggerJsdoc(getSwaggerConfig(req));
    res.setHeader('Content-Type', 'application/json');
    res.send(dynamicSpecs);
  });

  // Determinar a URL base dinamicamente
  const apiBase = process.env.API_BASE_URL?.replace(/\/api$/, '');

  console.log(`📚 Documentação Swagger disponível em: ${apiBase}/api/swagger`);
};
