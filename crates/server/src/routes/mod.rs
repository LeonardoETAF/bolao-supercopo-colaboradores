pub mod admin;
pub mod paginas;
pub mod palpites;
pub mod ranking;
pub mod sse;

/// Pontuação de um palpite frente ao resultado real.
/// - Acerto exato (placar idêntico): 10 pontos
/// - Acerto apenas do vencedor (quando o jogo NÃO terminou empatado): 5 pontos
/// - Errou: 0 pontos
///
/// Empate só pontua quando o placar exato é cravado (10). Um palpite de empate
/// que não acerta o placar — ou um empate real que o palpite não cravou — vale 0,
/// pois empate não tem "vencedor" a ser acertado.
pub fn calcular_pontos(p_a: i16, p_b: i16, r_a: i16, r_b: i16) -> i16 {
    if p_a == r_a && p_b == r_b {
        return 10;
    }
    // 5 pontos só quando há um vencedor real e o palpite acertou esse vencedor.
    if r_a != r_b && vencedor(p_a, p_b) == vencedor(r_a, r_b) {
        return 5;
    }
    0
}

/// 1 = time A vence, -1 = time B vence, 0 = empate.
fn vencedor(a: i16, b: i16) -> i8 {
    match a.cmp(&b) {
        std::cmp::Ordering::Greater => 1,
        std::cmp::Ordering::Less => -1,
        std::cmp::Ordering::Equal => 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn acerto_exato_vale_10() {
        assert_eq!(calcular_pontos(2, 1, 2, 1), 10);
    }

    #[test]
    fn acerto_do_vencedor_vale_5() {
        assert_eq!(calcular_pontos(3, 0, 2, 1), 5);
    }

    #[test]
    fn empate_exato_vale_10() {
        assert_eq!(calcular_pontos(2, 2, 2, 2), 10);
    }

    #[test]
    fn empate_sem_cravar_placar_vale_0() {
        // Palpitou empate, deu empate, mas placar diferente: não pontua.
        assert_eq!(calcular_pontos(1, 1, 2, 2), 0);
    }

    #[test]
    fn palpite_de_empate_em_jogo_com_vencedor_vale_0() {
        // Palpitou empate, mas o jogo teve vencedor: não pontua.
        assert_eq!(calcular_pontos(1, 1, 2, 1), 0);
    }

    #[test]
    fn vencedor_certo_quando_resultado_foi_empate_vale_0() {
        // Palpitou vitória, mas o jogo terminou empatado: não pontua.
        assert_eq!(calcular_pontos(2, 1, 1, 1), 0);
    }

    #[test]
    fn erro_vale_0() {
        assert_eq!(calcular_pontos(0, 2, 2, 1), 0);
    }
}
