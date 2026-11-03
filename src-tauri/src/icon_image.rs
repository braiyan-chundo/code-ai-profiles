//! Normalización de un icono elegido por la persona: valida PNG o JPEG (1 B a 5 MiB, hasta
//! 4096×4096) y lo devuelve como PNG de 512×512. La comparten las instancias (`instances/icons.rs`)
//! y los proyectos anclados (HU-0027), así que ninguno de los dos depende del otro.

use super::*;

pub(crate) const ICON_MAX_BYTES: usize = 5 * 1024 * 1024;

pub(crate) const ICON_MAX_DIMENSION: u32 = 4096;

pub(crate) fn normalized_icon_png(bytes: &[u8]) -> Result<Vec<u8>, String> {
    if bytes.is_empty() || bytes.len() > ICON_MAX_BYTES {
        return Err("El icono debe pesar entre 1 byte y 5 MiB.".to_string());
    }
    let format = image::guess_format(bytes)
        .map_err(|_| "El archivo no es una imagen PNG o JPEG válida.".to_string())?;
    if !matches!(format, image::ImageFormat::Png | image::ImageFormat::Jpeg) {
        return Err("El icono debe ser PNG o JPEG.".to_string());
    }
    let dimensions = image::ImageReader::with_format(Cursor::new(bytes), format)
        .into_dimensions()
        .map_err(|_| "No se pudo leer la cabecera del icono.".to_string())?;
    if dimensions.0 == 0
        || dimensions.1 == 0
        || dimensions.0 > ICON_MAX_DIMENSION
        || dimensions.1 > ICON_MAX_DIMENSION
    {
        return Err("Las dimensiones del icono no son válidas (máximo 4096×4096).".to_string());
    }
    let image = image::load_from_memory_with_format(bytes, format)
        .map_err(|_| "No se pudo decodificar el icono.".to_string())?;
    let normalized = image.resize_to_fill(512, 512, image::imageops::FilterType::Lanczos3);
    let mut encoded = Cursor::new(Vec::new());
    normalized
        .write_to(&mut encoded, image::ImageFormat::Png)
        .map_err(|error| format!("No se pudo normalizar el icono: {error}"))?;
    Ok(encoded.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_small_png_icons_and_rejects_invalid_input() {
        let icon = image::DynamicImage::new_rgba8(4, 8);
        let mut encoded = Cursor::new(Vec::new());
        icon.write_to(&mut encoded, image::ImageFormat::Png)
            .unwrap();
        let normalized = normalized_icon_png(&encoded.into_inner()).unwrap();
        let decoded = image::load_from_memory(&normalized).unwrap();
        assert_eq!((decoded.width(), decoded.height()), (512, 512));
        assert!(normalized_icon_png(b"not-an-image").is_err());
        assert!(normalized_icon_png(&vec![0; ICON_MAX_BYTES + 1]).is_err());
    }
}
