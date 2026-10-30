//! El error interno del backend: un mensaje para la persona, en español y ya redactado, más la clase
//! de fallo. `Display` devuelve el mensaje tal cual, así que convertirlo a `String` (lo que cruza el
//! IPC) da exactamente el texto de antes. La clase sirve dentro de Rust para distinguir lo que se
//! puede volver a intentar (la red) de lo definitivo; ningún camino reintenta por su cuenta.

use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum AppErrorKind {
    /// E/S local: leer, escribir, crear o reemplazar archivos y carpetas propios.
    LocalIo,
    /// Un archivo propio (p. ej. el registro de instancias) existe, pero no se puede interpretar.
    DamagedData,
    /// Procesos e identidad: señales, comandos del sistema, una identidad que no coincide.
    Process,
    /// La red no dio una respuesta (sin conexión, plazo, lectura cortada, 5xx o 429): reintentable.
    Network,
    /// La fuente respondió, pero con algo que no se acepta (otro estado, tamaño, formato): definitivo.
    Remote,
    /// Lo que llega no es válido: identificadores, nombres, rutas.
    InvalidInput,
    /// La operación no existe en esta plataforma.
    Unsupported,
    /// Un fallo propio: el coordinador quedó bloqueado o no se pudo serializar.
    Internal,
    /// Sin clasificar todavía: viene de un `String` de un módulo que aún no usa `AppError`.
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct AppError {
    kind: AppErrorKind,
    message: String,
}

impl AppError {
    pub(crate) fn new(kind: AppErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }

    pub(crate) fn local_io(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::LocalIo, message)
    }

    pub(crate) fn damaged_data(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::DamagedData, message)
    }

    pub(crate) fn process(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Process, message)
    }

    pub(crate) fn network(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Network, message)
    }

    pub(crate) fn remote(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Remote, message)
    }

    pub(crate) fn invalid_input(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::InvalidInput, message)
    }

    pub(crate) fn unsupported(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Unsupported, message)
    }

    pub(crate) fn internal(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Internal, message)
    }

    /// Hoy solo lo leen las pruebas: ningún camino decide nada por la clase (ni reintenta).
    #[cfg_attr(not(test), allow(dead_code))]
    pub(crate) fn kind(&self) -> AppErrorKind {
        self.kind
    }

    /// Solo la red se puede volver a intentar más tarde. Lo decide la persona o el siguiente sondeo
    /// (el arranque o las 6 h), nunca este tipo: no hay reintentos automáticos.
    #[cfg_attr(not(test), allow(dead_code))]
    pub(crate) fn is_retryable(&self) -> bool {
        self.kind == AppErrorKind::Network
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl std::error::Error for AppError {}

impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.message
    }
}

impl From<String> for AppError {
    fn from(message: String) -> Self {
        Self::new(AppErrorKind::Other, message)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_and_string_are_the_message_unchanged() {
        let error = AppError::local_io("No se pudo leer el registro de instancias: denegado");
        assert_eq!(
            error.to_string(),
            "No se pudo leer el registro de instancias: denegado"
        );
        assert_eq!(
            String::from(error.clone()),
            "No se pudo leer el registro de instancias: denegado"
        );
        assert_eq!(error.kind(), AppErrorKind::LocalIo);
    }

    #[test]
    fn only_network_errors_are_retryable() {
        assert!(AppError::network("x").is_retryable());
        for error in [
            AppError::local_io("x"),
            AppError::damaged_data("x"),
            AppError::process("x"),
            AppError::remote("x"),
            AppError::invalid_input("x"),
            AppError::unsupported("x"),
            AppError::internal("x"),
            AppError::from("x".to_string()),
        ] {
            assert!(!error.is_retryable(), "{:?}", error.kind());
        }
    }

    #[test]
    fn question_mark_converts_both_ways() {
        fn typed() -> Result<(), AppError> {
            Err(AppError::invalid_input(
                "El identificador de instancia no es válido.",
            ))
        }
        fn legacy() -> Result<(), String> {
            typed()?;
            Ok(())
        }
        fn back() -> Result<(), AppError> {
            legacy()?;
            Ok(())
        }
        assert_eq!(
            legacy(),
            Err("El identificador de instancia no es válido.".to_string())
        );
        let error = back().unwrap_err();
        assert_eq!(error.kind(), AppErrorKind::Other);
        assert_eq!(
            error.to_string(),
            "El identificador de instancia no es válido."
        );
    }
}
