import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

// Função para obter configuração dinâmica baseada no host da requisição
export const getSwaggerConfig = (req?: any): swaggerJsdoc.Options => {
  // Determinar URL base dinamicamente
  let apiBaseUrl = process.env.API_BASE_URL;
  
  if (req && req.get) {
    const host = req.get('host');
    const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    apiBaseUrl = `${protocol}://${host}/api`;
  }

  return {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'API de Escala de Ministério de Louvor',
        version: '1.0.0',
        description: 'Documentação da API do sistema de geração e gerenciamento de escalas para ministério de louvor',
        contact: {
          name: 'Suporte',
          email: 'suporte@exemplo.com'
        },
      },
      servers: [
        {
          url: apiBaseUrl,
          description: 'Servidor da API'
        }
      ],
    tags: [
      {
        name: 'Membros',
        description: 'Operações relacionadas aos membros do ministério'
      },
      {
        name: 'Ausências',
        description: 'Operações relacionadas às ausências dos membros'
      },
      {
        name: 'Escalas',
        description: 'Operações relacionadas à geração e gerenciamento de escalas'
      },
      {
        name: 'Sistema',
        description: 'Operações relacionadas à saúde e status do sistema'
      }
    ],
    components: {
      schemas: {
        MembroBasico: {
          type: 'object',
          required: ['nome', 'sobrenome', 'funcoes'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único do membro'
            },
            nome: {
              type: 'string',
              description: 'Nome do membro'
            },
            sobrenome: {
              type: 'string',
              description: 'Sobrenome do membro'
            },
            funcoes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Vocalista', 'Guitarrista', 'Violão', 'Baixista', 'Baterista', 'Tecladista']
              },
              description: 'Funções do membro no ministério'
            }
          },
          example: {
            id: 1,
            nome: "Robson",
            sobrenome: "Arcanjo",
            funcoes: ["Vocalista", "Guitarrista"]
          }
        },
        Membro: {
          allOf: [
            { '$ref': '#/components/schemas/MembroBasico' },
            {
              type: 'object',
              properties: {
                ultima_escalacao: {
                  type: 'string',
                  nullable: true,
                  description: 'Data da última escalação em formato brasileiro (DD/MM/YYYY HH24:MI:SS)'
                },
                proxima_escalacao: {
                  type: 'string',
                  nullable: true,
                  description: 'Data da próxima escalação em formato brasileiro (DD/MM/YYYY HH24:MI:SS)'
                },
                dias_desde_ultima: {
                  type: 'integer',
                  nullable: true,
                  description: 'Dias desde a última escalação'
                },
                total_escalacoes_90_dias: {
                  type: 'integer',
                  description: 'Total de escalações nos últimos 90 dias'
                },
                total_ausencias_90_dias: {
                  type: 'integer',
                  description: 'Total de ausências nos últimos 90 dias'
                }
              }
            }
          ],
          example: {
            id: 1,
            nome: "Robson",
            sobrenome: "Arcanjo",
            funcoes: ["Vocalista", "Guitarrista"],
            ultima_escalacao: "27/07/2025 19:00:00",
            proxima_escalacao: null,
            dias_desde_ultima: 2,
            total_escalacoes_90_dias: 5,
            total_ausencias_90_dias: 0
          }
        },
        Ausencia: {
          type: 'object',
          required: ['membro_id', 'data_inicio', 'data_fim'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único da ausência'
            },
            membro_id: {
              type: 'integer',
              description: 'ID do membro que estará ausente'
            },
            data_inicio: {
              type: 'string',
              format: 'date',
              description: 'Data de início da ausência'
            },
            data_fim: {
              type: 'string',
              format: 'date',
              description: 'Data final da ausência'
            },
            motivo: {
              type: 'string',
              description: 'Motivo da ausência (opcional)'
            },
            nome_membro: {
              type: 'string',
              description: 'Nome do membro (preenchido pelo servidor)'
            },
            funcoes_membro: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Vocalista', 'Guitarrista', 'Violão', 'Baixista', 'Baterista', 'Tecladista']
              },
              description: 'Funções do membro (preenchido pelo servidor)'
            }
          },
          example: {
            id: 1,
            membro_id: 2,
            data_inicio: "29/07/2025",
            data_fim: "29/07/2025",
            motivo: "Viagem",
            nome_membro: "Robson Arcanjo",
            funcoes_membro: ["Vocalista", "Guitarrista"]
          }
        },
        AusenciaCompleta: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único da ausência'
            },
            membro_id: {
              type: 'integer',
              description: 'ID do membro'
            },
            nome_membro: {
              type: 'string',
              description: 'Nome completo do membro'
            },
            funcoes_membro: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Vocalista', 'Guitarrista', 'Violão', 'Baixista', 'Baterista', 'Tecladista']
              },
              description: 'Funções do membro na banda'
            },
            data_inicio: {
              type: 'string',
              description: 'Data de início da ausência em formato brasileiro'
            },
            data_fim: {
              type: 'string',
              description: 'Data de fim da ausência em formato brasileiro'
            },
            motivo: {
              type: 'string',
              description: 'Motivo da ausência'
            }
          },
          example: {
            id: 1,
            membro_id: 2,
            nome_membro: "Robson Arcanjo",
            funcoes_membro: ["Vocalista", "Guitarrista"],
            data_inicio: "29/07/2025",
            data_fim: "29/07/2025",
            motivo: "Viagem"
          }
        },
        EscalaHistorico: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único da escalação'
            },
            membro_id: {
              type: 'integer',
              description: 'ID do membro escalado'
            },
            nome_membro: {
              type: 'string',
              description: 'Nome completo do membro'
            },
            funcao_membro: {
              type: 'string',
              enum: ['Vocalista', 'Guitarrista', 'Violão', 'Baixista', 'Baterista', 'Tecladista'],
              description: 'Função do membro na banda'
            },
            data_culto: {
              type: 'string',
              description: 'Data e horário do culto em formato brasileiro'
            },
            funcao: {
              type: 'string',
              enum: ['Vocalista', 'Guitarrista', 'Violão', 'Baixista', 'Baterista', 'Tecladista'],
              description: 'Função na escalação'
            },
            escalado_em: {
              type: 'string',
              description: 'Data e hora em que a escalação foi criada em formato brasileiro'
            }
          },
          example: {
            id: 1,
            membro_id: 2,
            nome_membro: "Robson Arcanjo",
            funcao_membro: "Vocalista",
            data_culto: "29/07/2025 19:00:00",
            funcao: "Vocalista",
            escalado_em: "25/07/2025 10:30:00"
          }
        },
        DadosEscala: {
          type: 'object',
          description: 'Estrutura de dados da escala onde as chaves são datas e os valores são objetos com funções',
          additionalProperties: {
            type: 'object',
            description: 'Escala para uma data específica',
            properties: {
              Vocalista: {
                type: 'array',
                items: { '$ref': '#/components/schemas/MembroBasico' },
                description: 'Lista de vocalistas escalados'
              },
              Guitarrista: {
                type: 'array',
                items: { '$ref': '#/components/schemas/MembroBasico' },
                description: 'Lista de guitarristas escalados'
              },
              'Violão': {
                type: 'array',
                items: { '$ref': '#/components/schemas/MembroBasico' },
                description: 'Lista de violonistas escalados'
              },
              Baixista: {
                type: 'array',
                items: { '$ref': '#/components/schemas/MembroBasico' },
                description: 'Lista de baixistas escalados'
              },
              Baterista: {
                type: 'array',
                items: { '$ref': '#/components/schemas/MembroBasico' },
                description: 'Lista de bateristas escalados'
              },
              Tecladista: {
                type: 'array',
                items: { '$ref': '#/components/schemas/MembroBasico' },
                description: 'Lista de tecladistas escalados'
              }
            }
          }
        },
        GenerateScheduleRequest: {
          type: 'object',
          required: ['datas'],
          properties: {
            datas: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Lista de datas para gerar as escalas'
            },
            configuracao: {
              type: 'object',
              description: 'Configurações opcionais'
            }
          }
        },
        EscalaBasica: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único da escalação'
            },
            membro_id: {
              type: 'integer',
              description: 'ID do membro escalado'
            },
            data_culto: {
              type: 'string',
              description: 'Data e horário do culto'
            },
            funcao: {
              type: 'string',
              enum: ['Vocalista', 'Guitarrista', 'Violão', 'Baixista', 'Baterista', 'Tecladista'],
              description: 'Função na escalação'
            },
            escalado_em: {
              type: 'string',
              description: 'Data e hora em que a escalação foi criada'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro'
            }
          },
          example: {
            error: "Erro interno do servidor"
          }
        }
      }
    }
    },
    apis: ['./src/routes/*.ts', './src/server.ts'], // Caminho para os arquivos com anotações JSDoc
  };
};

// Export para compatibilidade (usar a função dinâmica de preferência)
export const specs = swaggerJsdoc(getSwaggerConfig());
