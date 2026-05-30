-- Seed employees
INSERT INTO funcionarios (id, nome, funcao, ativo) VALUES
(1,  'Alex Santos',                          'Garçom',       true),
(2,  'Alexsandro Antunes da Silva Oliveira', 'Garçom',       true),
(3,  'Ana Laura dos Anjos Silva',            'Aux. Limpeza', true),
(4,  'Cristiane Martins Barbosa',            'Compras',      true),
(5,  'Evandro Cardoso de Oliveira',          'Caixa',        true),
(6,  'Flavio Francisco Lima',                'Vigia',        true),
(7,  'Gabriel Kiill',                        'Garçom',       true),
(8,  'Gustavo Rodrigues',                    'Cumim',        true),
(9,  'Kailaine Roberta',                     'Aux. Cozinha', true),
(10, 'Kaio Rodrigo Arevalo',                 'Garçom',       true),
(11, 'Leonardo Santana',                     'Garçom',       true),
(12, 'Lucas Leandro Costa',                  'Garçom',       true),
(13, 'Maria Marta Ferreira Barbosa',         'Aux. Cozinha', true),
(14, 'Nadjack dos Santos Silva',             'Garçom',       true),
(15, 'Priscila Cunha Silva',                 'Aux. Cozinha', true),
(16, 'Renato Neri de Almeida',               'Bar',          true),
(17, 'Rosemeire Gonçalves',                  'Estoque',      true),
(18, 'Victor Gabriel Dias da Silva',         'Churrasqueiro',true),
(19, 'Wesley Sousa',                         'Garçom',       true),
(20, 'Willer José da Costa',                 'Churrasqueiro',true)
ON CONFLICT (id) DO NOTHING;

-- Seed correlations (all normalized: uppercase, no accents, no non-alpha-space, collapsed spaces)
INSERT INTO correlacoes (alias, funcionario_id) VALUES
('NADJACK',                              14),
('NADJACKSON',                           14),
('EVANDRO CARDOSO',                       5),
('EVANDRO CARDOSO FUNCIONARIO',           5),
('GABRIEL KILL',                          7),
('GABRIEL KIILL',                         7),
('LUCAS COSTA',                          12),
('LUCAS COSTA GARCON FUNCIONARIO',       12),
('MARTA FERREIRA',                       13),
('MARTHA COZINHA',                       13),
('MARTHA COZINHA FUNCIONARIO',           13),
('ALEXANDRO ANTUNES',                     2),
('ALEX ANTUNES',                          2),
('ALEXSANDRO ANTUNES',                    2),
('ALEXSANDRO ANTUNES GARCOM',             2),
('FLAVIO SEGURANCA',                      6),
('FLAVIO SEGURANCA FUNCIONARIO',          6),
('GUSTAVO COPA',                          8),
('GUSTAVO COPA FUNCIONARIO',              8),
('GUSTAVO RODRIGUES',                     8),
('VICTOR GABRIEL CHURRASQUEIRO',         18),
('WILLER CHURRASQUEIRO',                 20),
('ALEX SANTOS',                           1),
('ALEXS SANTOS',                          1),
('WESLEY GARCOM',                        19),
('WESLEY SOUSA',                         19),
('LEONARDO SANTANA',                     11),
('KAIO AREVALO',                         10),
('KAIO RODRIGO AREVALO',                 10),
('RENATO COPA',                          16),
('CRISTIANE COMPRAS',                     4),
('ANA LAURA',                             3),
('ANA LAURA AUX LIMPEZA',                 3),
('KAILAINE ROBERTA',                      9),
('ROSEMEIRE GONCALVES',                  17),
('PRISCILA CUNHA SILVA',                 15),
('LUCAS LEANDRO COSTA',                  12)
ON CONFLICT (alias) DO NOTHING;

-- Seed blocked names
INSERT INTO proibidos (nome_normalizado, nome_original) VALUES
('PRISCILA WHISKY', 'Priscila Whisky'),
('LUCAS SOUZA',     'Lucas Souza'),
('VICTOR BIFF',     'Victor Biff'),
('VICTOR BIFFE',    'Victor Biffe'),
('ALEXSA SILVA',    'Alexsa Silva')
ON CONFLICT (nome_normalizado) DO NOTHING;

-- Resync SERIAL sequences after inserting rows with explicit IDs, otherwise the
-- next auto-generated id collides with a seeded row (duplicate key on _pkey).
SELECT setval(pg_get_serial_sequence('funcionarios', 'id'), (SELECT MAX(id) FROM funcionarios));
SELECT setval(pg_get_serial_sequence('correlacoes', 'id'),  (SELECT MAX(id) FROM correlacoes));
SELECT setval(pg_get_serial_sequence('proibidos', 'id'),    (SELECT MAX(id) FROM proibidos));

-- Resync SERIAL sequences after inserting rows with explicit IDs, otherwise the
-- next auto-generated id collides with a seeded row (duplicate key on _pkey).
SELECT setval(pg_get_serial_sequence('funcionarios', 'id'), (SELECT MAX(id) FROM funcionarios));
SELECT setval(pg_get_serial_sequence('correlacoes', 'id'),  (SELECT MAX(id) FROM correlacoes));
SELECT setval(pg_get_serial_sequence('proibidos', 'id'),    (SELECT MAX(id) FROM proibidos));
