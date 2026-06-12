# Bolão da Copa Super Copo — Rust Full-Stack

Bolão da Copa do Mundo para premiação dos colaboradores: eles fazem palpites de
placar, acumulam pontos e sobem no ranking ao vivo. A premiação dos melhores é
definida fora do sistema.

**100% Rust.**

| Camada    | Tecnologia                                            |
| --------- | ----------------------------------------------------- |
| Backend   | Axum 0.7 + Tokio + SQLx 0.8                            |
| Templates | Askama 0.12 (renderização server-side)                |
| Frontend  | HTML + CSS puro (tema Copa) + JS vanilla (sem build)  |
| Banco     | PostgreSQL (migrations via SQLx)                      |
| Auth admin| JWT (`jsonwebtoken`)                                   |
| Tempo real| SSE (Server-Sent Events) para ranking ao vivo         |

## Estrutura

```
.
├── Cargo.toml                 # workspace
├── migrations/                # 001..010 (SQLx)
├── crates/
│   ├── server/                # app Axum (rotas, models, auth, SSE)
│   └── frontend/              # structs + templates Askama
├── static/                    # css/, js/, img/
├── docker-compose.yml
└── Dockerfile
```

## Pré-requisitos

- **Rust** (estável) — já instalado.
- **PostgreSQL** acessível via `DATABASE_URL`.
- Para a opção Docker: **Docker + Docker Compose**.

## Rodar localmente

As migrations são aplicadas automaticamente no startup do servidor.

```bash
cp .env.example .env        # ajuste DATABASE_URL / credenciais admin
cargo run --bin server      # sobe em http://localhost:3000
```

> Neste ambiente o `.env` já aponta para o Postgres local existente
> (`postgres://copa:copa_secret@localhost:5432/copa`).

- Landing / palpite: <http://localhost:3000/>
- Ranking completo: <http://localhost:3000/ranking>
- Painel admin: <http://localhost:3000/admin> (usuário/senha do `.env`)

## Rodar com Docker

Sobe um Postgres dedicado + o app, tudo isolado:

```bash
docker compose up --build
```

App em <http://localhost:3000> · Postgres exposto em `localhost:5433`.

## Fluxo de uso

1. **Admin** (`/admin`) faz login, cadastra um jogo e o deixa **ativo**.
2. **Colaboradores** (`/`) enviam o palpite (nome, telefone, CPF, placar).
3. Admin informa o **resultado** do jogo → a pontuação de todos é recalculada.
4. O **ranking** (`/ranking` e seção da home) atualiza ao vivo via SSE; a premiação
   dos melhores colocados é definida fora do sistema.

## Regras de pontuação

| Situação                                          | Pontos |
| ------------------------------------------------- | ------ |
| Acerto exato do placar (inclui empate exato)      | 10     |
| Acertou apenas o vencedor (jogo não empatado)     | 5      |
| Errou o resultado                                 | 0      |

> Empate só pontua se o **placar exato** for cravado (10). Empate fora do placar
> exato vale 0 — não há "vencedor" a ser acertado.

## Endpoints

### Públicos
| Método | Rota                   | Descrição                                  |
| ------ | ---------------------- | ------------------------------------------ |
| GET    | `/`                    | Landing + formulário de palpite            |
| GET    | `/ranking`             | Página de ranking completo                 |
| POST   | `/api/palpite`         | Registra um palpite                        |
| GET    | `/api/jogo-ativo`      | Jogo atualmente aberto para palpites (JSON)|
| GET    | `/api/ranking?page=N`  | Ranking paginado (20/página)               |
| GET    | `/api/ranking/stream`  | SSE — avisa quando o ranking muda          |

> `POST /api/palpite` aplica **rate-limit por IP** (máx. 5/min) e recusa palpites
> após o horário de início do jogo (`400`).

### Admin (exigem `Authorization: Bearer <jwt>`)
O login aceita dois papéis: **admin** (acesso total) e **viewer** (somente
leitura de Métricas e Participantes). As rotas de escrita exigem o papel admin.

| Método | Rota                            | Descrição                          |
| ------ | ------------------------------- | ---------------------------------- |
| POST   | `/admin/login`                  | Autentica e devolve o JWT (24h) + papel |
| POST   | `/admin/jogos`                  | Cadastra jogo                      |
| GET    | `/admin/jogos`                  | Lista jogos                        |
| PUT    | `/admin/jogos/:id`              | Edita jogo (times e data)          |
| DELETE | `/admin/jogos/:id`              | Exclui jogo (e palpites em cascata)|
| PUT    | `/admin/jogos/:id/ativar`       | Abre o jogo para palpites          |
| PUT    | `/admin/jogos/:id/desativar`    | Tira o jogo do ar (não aceita mais palpites) |
| PUT    | `/admin/jogos/:id/resultado`    | Informa placar e pontua os palpites|
| GET    | `/admin/bandeiras`              | Lista as bandeiras disponíveis (`static/img`) |
| GET    | `/admin/metricas`               | Métricas gerais (admin e viewer)   |
| GET    | `/admin/participantes`          | Lista participantes com pontos (admin e viewer) |
| GET    | `/admin/landing`                | Configuração atual da landing      |
| PUT    | `/admin/landing`                | Salva a landing e define o jogo atual |

> **Vários jogos abertos:** quando há mais de um jogo ativo, a home mostra 1 em
> destaque (com o formulário completo) e os demais em cards de "Outros jogos
> abertos" — o usuário preenche os dados uma vez e palpita em quantos quiser.
>
> **Encerramento automático:** o bolão é considerado **encerrado** quando não há
> mais nenhum jogo ativo com horário no futuro (todos os jogos abertos já
> começaram ou foram encerrados). Nesse estado a home exibe o **pódio (top 3)** e
> `POST /api/palpite` passa a recusar palpites (`400`). Cadastrar/ativar um novo
> jogo futuro reabre o bolão automaticamente — não há rota manual de encerrar/reabrir.

## Variáveis de ambiente

| Variável       | Descrição                            |
| -------------- | ------------------------------------ |
| `DATABASE_URL` | URL de conexão do Postgres           |
| `JWT_SECRET`   | Segredo para assinar os tokens admin |
| `ADMIN_USER`   | Usuário do painel admin              |
| `ADMIN_PASS`   | Senha do painel admin                |
| `PORT`         | Porta HTTP (padrão 3000)             |
| `RUST_LOG`     | Nível de log (ex.: `info`)           |

## Testes

```bash
cargo test --workspace   # inclui validação de CPF e cálculo de pontos
```

## Notas de implementação

- Erros retornam JSON padronizado `{ "erro": "mensagem" }`.
- CPF validado com algoritmo completo dos dois dígitos verificadores.
- `UNIQUE(usuario_id, jogo_id)` impede palpite duplicado.
- `gen_random_uuid()` (nativo do PostgreSQL 13+) gera os IDs — sem extensão/superuser.
- Pool de conexões com 20 conexões; índices nas colunas de busca/junção.
