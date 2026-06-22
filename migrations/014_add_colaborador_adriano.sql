-- Inclui o colaborador Adriano Kistenmacher na whitelist.
INSERT INTO colaboradores (cpf, nome) VALUES ('00975114980', 'ADRIANO KISTENMACHER')
ON CONFLICT (cpf) DO NOTHING;
