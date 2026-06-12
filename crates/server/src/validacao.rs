use crate::errors::AppError;

/// Mantém apenas os dígitos de uma string (remove pontuação, espaços, etc.).
pub fn somente_digitos(s: &str) -> String {
    s.chars().filter(|c| c.is_ascii_digit()).collect()
}

/// Valida e normaliza um CPF, devolvendo os 11 dígitos (sem máscara).
/// Aplica o algoritmo completo dos dois dígitos verificadores e rejeita
/// sequências de dígitos repetidos (ex.: 111.111.111-11).
pub fn validar_cpf(cpf: &str) -> Result<String, AppError> {
    let d = somente_digitos(cpf);

    if d.len() != 11 {
        return Err(AppError::CpfInvalido);
    }

    let digitos: Vec<u32> = d.chars().filter_map(|c| c.to_digit(10)).collect();

    // Rejeita todos os dígitos iguais (CPFs inválidos clássicos).
    if digitos.iter().all(|&x| x == digitos[0]) {
        return Err(AppError::CpfInvalido);
    }

    // Calcula um dígito verificador a partir dos `n` primeiros dígitos.
    let calcular_dv = |n: usize| -> u32 {
        let soma: u32 = (0..n)
            .map(|i| digitos[i] * ((n + 1) - i) as u32)
            .sum();
        let resto = (soma * 10) % 11;
        if resto >= 10 {
            0
        } else {
            resto
        }
    };

    if calcular_dv(9) != digitos[9] || calcular_dv(10) != digitos[10] {
        return Err(AppError::CpfInvalido);
    }

    Ok(d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aceita_cpf_valido() {
        // Com e sem máscara devolvem os 11 dígitos normalizados.
        assert_eq!(validar_cpf("111.444.777-35").unwrap(), "11144477735");
        assert_eq!(validar_cpf("11144477735").unwrap(), "11144477735");
        assert!(validar_cpf("529.982.247-25").is_ok());
    }

    #[test]
    fn rejeita_cpf_com_digito_verificador_errado() {
        assert!(validar_cpf("111.444.777-00").is_err());
        assert!(validar_cpf("12345678900").is_err());
    }

    #[test]
    fn rejeita_cpf_com_tamanho_invalido() {
        assert!(validar_cpf("123").is_err());
        assert!(validar_cpf("111444777355").is_err());
    }

    #[test]
    fn rejeita_cpf_com_digitos_repetidos() {
        assert!(validar_cpf("111.111.111-11").is_err());
        assert!(validar_cpf("00000000000").is_err());
    }
}
