pub mod jogo;
pub mod palpite;
pub mod usuario;

pub use jogo::{CriarJogoRequest, Jogo, ResultadoRequest};
pub use palpite::{Palpite, PalpiteResponse};
pub use usuario::{CriarPalpiteRequest, Usuario};
