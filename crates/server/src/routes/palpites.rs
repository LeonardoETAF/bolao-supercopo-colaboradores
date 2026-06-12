use crate::errors::AppError;
use crate::models::{CriarPalpiteRequest, Jogo, PalpiteResponse, Usuario};
use crate::ratelimit;
use crate::state::AppState;
use crate::validacao::somente_digitos;
use axum::extract::{ConnectInfo, State};
use axum::Json;
use std::net::SocketAddr;

/// POST /api/palpite — registra um palpite do colaborador.
pub async fn enviar_palpite(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(req): Json<CriarPalpiteRequest>,
) -> Result<Json<PalpiteResponse>, AppError> {
    // 0. Anti-spam por IP.
    ratelimit::checar(&state.palpite_limiter, addr.ip())?;

    // 0b. Bolão encerrado não aceita novos palpites.
    if crate::bolao::esta_encerrado(&state.db).await? {
        return Err(AppError::BolaoEncerrado);
    }

    // 1. Validações de campos.
    let nome = req.nome.trim().to_string();
    if nome.chars().count() < 3 {
        return Err(AppError::Validacao(
            "Nome deve ter no mínimo 3 caracteres".to_string(),
        ));
    }

    let telefone = somente_digitos(&req.telefone);
    if telefone.len() < 10 || telefone.len() > 11 {
        return Err(AppError::Validacao("Telefone inválido".to_string()));
    }

    if !(0..=20).contains(&req.gols_time_a) || !(0..=20).contains(&req.gols_time_b) {
        return Err(AppError::Validacao(
            "Placar deve estar entre 0 e 20".to_string(),
        ));
    }

    // 2. CPF: precisa ter 11 dígitos e constar na lista interna de colaboradores
    // (whitelist). CPF fora da lista não pode palpitar.
    let cpf = somente_digitos(&req.cpf);
    if cpf.len() != 11 {
        return Err(AppError::CpfInvalido);
    }
    if crate::colaboradores::buscar_nome(&state.db, &cpf)
        .await?
        .is_none()
    {
        return Err(AppError::CpfNaoAutorizado);
    }

    // 3. Verificar se há um jogo ativo correspondente.
    let jogo = sqlx::query_as::<_, Jogo>(
        "SELECT * FROM jogos WHERE id = $1 AND ativo = TRUE AND status = 'ativo'",
    )
    .bind(req.jogo_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::JogoNaoAtivo)?;

    // 3b. Não aceitar palpites após o horário de início do jogo.
    if jogo.data_jogo <= chrono::Utc::now() {
        return Err(AppError::JogoEncerrado);
    }

    // 3c. CPF e telefone só podem ser usados uma vez por jogo.
    let ja_usado: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM palpites p
         JOIN usuarios u ON u.id = p.usuario_id
         WHERE p.jogo_id = $1 AND (u.cpf = $2 OR u.telefone = $3)",
    )
    .bind(jogo.id)
    .bind(&cpf)
    .bind(&telefone)
    .fetch_one(&state.db)
    .await?;

    if ja_usado > 0 {
        return Err(AppError::PalpiteDuplicado);
    }

    // 4. Buscar ou criar o usuário pelo CPF (chave única).
    let usuario = sqlx::query_as::<_, Usuario>(
        "INSERT INTO usuarios (nome, telefone, cpf) VALUES ($1, $2, $3)
         ON CONFLICT (cpf) DO UPDATE SET nome = EXCLUDED.nome, telefone = EXCLUDED.telefone
         RETURNING *",
    )
    .bind(&nome)
    .bind(&telefone)
    .bind(&cpf)
    .fetch_one(&state.db)
    .await?;

    // 5. Inserir o palpite.
    sqlx::query(
        "INSERT INTO palpites (usuario_id, jogo_id, gols_time_a, gols_time_b)
         VALUES ($1, $2, $3, $4)",
    )
    .bind(usuario.id)
    .bind(jogo.id)
    .bind(req.gols_time_a)
    .bind(req.gols_time_b)
    .execute(&state.db)
    .await?;

    // 7. Notificar o ranking ao vivo (SSE).
    let _ = state.ranking_tx.send("atualizar".to_string());

    tracing::info!(usuario = %usuario.id, jogo = %jogo.id, "palpite registrado");

    Ok(Json(PalpiteResponse {
        sucesso: true,
        mensagem: "Palpite registrado com sucesso! 🎉".to_string(),
    }))
}

/// GET /api/jogo-ativo — retorna o jogo atualmente aberto para palpites (ou null).
/// Só considera jogos ativos cujo horário ainda não chegou (consistente com a
/// home e com a validação de envio de palpite).
pub async fn jogo_ativo(
    State(state): State<AppState>,
) -> Result<Json<Option<Jogo>>, AppError> {
    let jogo = sqlx::query_as::<_, Jogo>(
        "SELECT * FROM jogos
         WHERE ativo = TRUE AND status = 'ativo' AND data_jogo > NOW()
         ORDER BY data_jogo ASC LIMIT 1",
    )
    .fetch_optional(&state.db)
    .await?;

    Ok(Json(jogo))
}
