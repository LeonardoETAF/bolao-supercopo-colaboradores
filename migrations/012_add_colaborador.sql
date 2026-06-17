-- Inclui um colaborador autorizado a palpitar (CPF informado avulso).
-- Nome provisório; atualizar quando o nome real for informado.
INSERT INTO colaboradores (cpf, nome) VALUES ('07446968958', 'COLABORADOR ADICIONAL')
ON CONFLICT (cpf) DO NOTHING;
