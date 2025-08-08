-- Enum para as funções musicais
CREATE TYPE funcao_enum AS ENUM (
    'Vocalista',
    'Guitarrista', 
    'Violão',
    'Baixista',
    'Baterista',
    'Tecladista'
);

-- Tabela de membros (sem função direta)
CREATE TABLE membros (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    sobrenome VARCHAR(100) NOT NULL
);

-- Tabela para relacionar membros com suas funções (permite múltiplas funções)
CREATE TABLE membro_funcoes (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER NOT NULL,
    funcao funcao_enum NOT NULL,
    UNIQUE(membro_id, funcao), -- Evita duplicação da mesma função para o mesmo membro
    CONSTRAINT fk_membro_funcoes_membro
        FOREIGN KEY (membro_id) 
        REFERENCES membros(id) 
        ON DELETE CASCADE
);

-- Tabela de ausências
CREATE TABLE ausencias (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    motivo TEXT,
    CONSTRAINT fk_ausencias_membro
        FOREIGN KEY (membro_id) 
        REFERENCES membros(id) 
        ON DELETE CASCADE
);

-- Tabela de histórico de escalas
CREATE TABLE historico_escalas (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER NOT NULL,
    data_culto TIMESTAMP NOT NULL,
    funcao funcao_enum NOT NULL,
    escalado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historico_escalas_membro
        FOREIGN KEY (membro_id) 
        REFERENCES membros(id) 
        ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_membro_funcoes_membro ON membro_funcoes(membro_id);
CREATE INDEX idx_membro_funcoes_funcao ON membro_funcoes(funcao);
CREATE INDEX idx_ausencias_membro_data ON ausencias(membro_id, data_inicio, data_fim);
CREATE INDEX idx_historico_escalas_membro_data ON historico_escalas(membro_id, data_culto);
CREATE INDEX idx_historico_escalas_data ON historico_escalas(data_culto);
