-- Inclui a colaboradora Giselly Gerotto Kistenmacher na whitelist.
INSERT INTO colaboradores (cpf, nome) VALUES ('08304935902', 'GISELLY GEROTTO KISTENMACHER')
ON CONFLICT (cpf) DO NOTHING;
