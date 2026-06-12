-- Reverte a 006: o participante volta a ser identificado por CPF (não e-mail).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Linhas legadas (criadas na fase de e-mail) não têm CPF correspondente:
-- preenche com um placeholder único derivado do id para satisfazer NOT NULL/UNIQUE.
UPDATE usuarios
   SET cpf = SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 11)
 WHERE cpf IS NULL;

ALTER TABLE usuarios ALTER COLUMN cpf SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_cpf_key'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_cpf_key UNIQUE (cpf);
    END IF;
END $$;

DROP INDEX IF EXISTS idx_usuarios_email;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;
ALTER TABLE usuarios DROP COLUMN IF EXISTS email;
CREATE INDEX IF NOT EXISTS idx_usuarios_cpf ON usuarios(cpf);
