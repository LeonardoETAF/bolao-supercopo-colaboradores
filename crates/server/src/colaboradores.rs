use sqlx::PgPool;

/// Lista interna de colaboradores autorizados a palpitar (whitelist).
///
/// Devolve o nome cadastrado do colaborador cujo CPF (11 dígitos, sem máscara)
/// consta na tabela `colaboradores`, ou `None` se o CPF não estiver autorizado.
pub async fn buscar_nome(db: &PgPool, cpf: &str) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar("SELECT nome FROM colaboradores WHERE cpf = $1")
        .bind(cpf)
        .fetch_optional(db)
        .await
}
