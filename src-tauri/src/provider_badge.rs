//! El distintivo de la aplicación original (HU-0028): el icono de la instalación original, recortado a su cuerpo y
//! guardado como PNG en `<app_data>/provider-badge/<clave>.png` para la interfaz (asset protocol) y para el Dock de
//! macOS (`macos_icon.rs`).
//!
//! - De dónde sale: `provider_icon_file` de cada plataforma da el archivo (el `.icns` del bundle, el `Claude.exe` o
//!   el PNG del tema hicolor) y `provider_icon_image` lo lee según su firma, en Rust y sin subprocesos: un trozo
//!   PNG del `icns`, el grupo de iconos de los recursos PE o el PNG tal cual. Con topes de tamaño y límites
//!   comprobados: un archivo raro da `None`, nunca un pánico.
//! - Solo se lee el archivo de icono de la original; nunca un perfil. No se registran rutas ni bytes.
//! - La clave es el contenido (ruta canónica, tamaño y fecha del archivo de icono): si la original cambia, cambia la
//!   ruta y el `<img>` se recarga solo. Tras escribir una copia nueva se borran las demás de la carpeta.
//! - En memoria se recuerda un solo resultado por huella de la original (también el fallo, D-7) bajo `BADGE_LOCK`,
//!   que serializa además la extracción y la limpieza. Nunca toma el candado del registro.

use super::*;
use sha2::{Digest, Sha256};

const BADGE_DIRECTORY: &str = "provider-badge";
const BADGE_KEY_DOMAIN: &[u8] = b"provider-badge-v1\0";
const BADGE_TEMPORARY_PREFIX: &str = ".provider-badge";
/// Tope de un `icns` o un PNG leído entero, y de una copia en caché que se da por buena.
const ICON_FILE_MAX_BYTES: u64 = 16 * 1024 * 1024;
/// Tope de la sección de recursos de un PE.
const PE_RESOURCES_MAX_BYTES: u64 = 64 * 1024 * 1024;
const PE_HEADER_MAX_OFFSET: u64 = 1024 * 1024;
const PE_MAX_SECTIONS: usize = 96;
const PE_MAX_DIRECTORY_ENTRIES: usize = 4096;
/// Distinct icons of the group that are tried, from the widest down: a tampered group cannot make the extraction
/// (done with `BADGE_LOCK` held) walk thousands of entries.
const PE_MAX_GROUP_ICONS: usize = 64;
const RT_ICON: u32 = 3;
const RT_GROUP_ICON: u32 = 14;
/// Lado máximo de una imagen que se decodifica.
const DECODE_MAX_SIDE: u32 = 2048;
/// Lado máximo del distintivo guardado.
const BADGE_MAX_SIDE: u32 = 512;
/// Alfa desde el que un píxel es cuerpo y no sombra de la plantilla.
const BADGE_BODY_ALPHA: u8 = 128;
const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";

fn read_u16_le(bytes: &[u8], offset: usize) -> Option<u16> {
    let end = offset.checked_add(2)?;
    bytes
        .get(offset..end)
        .map(|value| u16::from_le_bytes([value[0], value[1]]))
}

fn read_u32_le(bytes: &[u8], offset: usize) -> Option<u32> {
    let end = offset.checked_add(4)?;
    bytes
        .get(offset..end)
        .map(|value| u32::from_le_bytes([value[0], value[1], value[2], value[3]]))
}

fn read_u32_be(bytes: &[u8], offset: usize) -> Option<u32> {
    let end = offset.checked_add(4)?;
    bytes
        .get(offset..end)
        .map(|value| u32::from_be_bytes([value[0], value[1], value[2], value[3]]))
}

/// Ancho y alto que declara la cabecera `IHDR` de un PNG.
fn png_dimensions(bytes: &[u8]) -> Option<(u32, u32)> {
    if bytes.get(..8)? != PNG_SIGNATURE || bytes.get(12..16)? != b"IHDR" {
        return None;
    }
    Some((read_u32_be(bytes, 16)?, read_u32_be(bytes, 20)?))
}

/// El trozo PNG de mayor ancho de un `icns` (`ic07`..`ic14` lo traen así) que se puede decodificar (≤ 2048 por
/// lado). Ignora los trozos que no son PNG y los que pasan del tope; una longitud rota da `None`.
pub(crate) fn icns_largest_png(bytes: &[u8]) -> Option<Vec<u8>> {
    if bytes.get(..4)? != b"icns" {
        return None;
    }
    let total = usize::try_from(read_u32_be(bytes, 4)?).ok()?;
    if total < 8 || total > bytes.len() {
        return None;
    }
    let mut offset = 8_usize;
    let mut best: Option<(u32, &[u8])> = None;
    while offset < total {
        let length = usize::try_from(read_u32_be(bytes, offset.checked_add(4)?)?).ok()?;
        let end = offset.checked_add(length)?;
        if length < 8 || end > total {
            return None;
        }
        let data = bytes.get(offset.checked_add(8)?..end)?;
        if let Some((width, height)) = png_dimensions(data) {
            let decodable =
                (1..=DECODE_MAX_SIDE).contains(&width) && (1..=DECODE_MAX_SIDE).contains(&height);
            if decodable && best.is_none_or(|(best_width, _)| width > best_width) {
                best = Some((width, data));
            }
        }
        offset = end;
    }
    best.map(|(_, data)| data.to_vec())
}

fn read_exact_at(file: &mut (impl Read + Seek), offset: u64, length: usize) -> Option<Vec<u8>> {
    file.seek(SeekFrom::Start(offset)).ok()?;
    let mut buffer = vec![0_u8; length];
    file.read_exact(&mut buffer).ok()?;
    Some(buffer)
}

/// The resource section of a PE: its bytes, its RVA and the RVA of the resource directory.
struct ResourceSection {
    bytes: Vec<u8>,
    virtual_address: u32,
    directory_rva: u32,
}

impl ResourceSection {
    /// Offset inside the section of an RVA.
    fn offset_of(&self, rva: u32) -> Option<usize> {
        usize::try_from(rva.checked_sub(self.virtual_address)?).ok()
    }

    /// Entries of the resource directory at `directory_offset` (relative to the resource root):
    /// `(name or id, is_named, offset_to_data, is_subdirectory)`.
    fn entries(&self, directory_offset: u32) -> Option<Vec<(u32, bool, u32, bool)>> {
        self.entries_up_to(directory_offset, PE_MAX_DIRECTORY_ENTRIES)
    }

    /// Like `entries`, reading at most `limit` of them (a directory over 4096 entries is still refused).
    fn entries_up_to(
        &self,
        directory_offset: u32,
        limit: usize,
    ) -> Option<Vec<(u32, bool, u32, bool)>> {
        let root = self.offset_of(self.directory_rva)?;
        let start = root.checked_add(usize::try_from(directory_offset).ok()?)?;
        let named = usize::from(read_u16_le(&self.bytes, start.checked_add(12)?)?);
        let ids = usize::from(read_u16_le(&self.bytes, start.checked_add(14)?)?);
        let count = named.checked_add(ids)?;
        if count > PE_MAX_DIRECTORY_ENTRIES {
            return None;
        }
        let count = count.min(limit);
        let mut entries = Vec::with_capacity(count);
        for index in 0..count {
            let entry = start.checked_add(16)?.checked_add(index.checked_mul(8)?)?;
            let name = read_u32_le(&self.bytes, entry)?;
            let data = read_u32_le(&self.bytes, entry.checked_add(4)?)?;
            entries.push((
                name & 0x7fff_ffff,
                name & 0x8000_0000 != 0,
                data & 0x7fff_ffff,
                data & 0x8000_0000 != 0,
            ));
        }
        Some(entries)
    }

    /// Level 2 (names/ids) of the resource type `kind`.
    fn type_directory(&self, kind: u32) -> Option<u32> {
        let (_, _, names, is_directory) = self
            .entries(0)?
            .into_iter()
            .find(|(name, named, _, _)| !named && *name == kind)?;
        is_directory.then_some(names)
    }

    /// The data of the first language of a level-3 directory (only that entry is read).
    fn language_data(&self, languages: u32) -> Option<&[u8]> {
        let (_, _, data_entry, is_directory) =
            self.entries_up_to(languages, 1)?.into_iter().next()?;
        if is_directory {
            return None;
        }
        let entry = self
            .offset_of(self.directory_rva)?
            .checked_add(usize::try_from(data_entry).ok()?)?;
        let data_rva = read_u32_le(&self.bytes, entry)?;
        let size = usize::try_from(read_u32_le(&self.bytes, entry.checked_add(4)?)?).ok()?;
        let start = self.offset_of(data_rva)?;
        self.bytes.get(start..start.checked_add(size)?)
    }
}

/// Reads only the headers and the resource section of a PE (`seek`, never the whole executable).
fn pe_resource_section(file: &mut (impl Read + Seek)) -> Option<ResourceSection> {
    let dos = read_exact_at(file, 0, 64)?;
    if dos.get(..2)? != b"MZ" {
        return None;
    }
    let pe_offset = u64::from(read_u32_le(&dos, 0x3c)?);
    if pe_offset > PE_HEADER_MAX_OFFSET {
        return None;
    }
    let header = read_exact_at(file, pe_offset, 24)?;
    if header.get(..4)? != b"PE\0\0" {
        return None;
    }
    let sections = usize::from(read_u16_le(&header, 6)?);
    let optional_size = usize::from(read_u16_le(&header, 20)?);
    if sections == 0 || sections > PE_MAX_SECTIONS {
        return None;
    }
    let optional = read_exact_at(file, pe_offset.checked_add(24)?, optional_size)?;
    let (count_offset, directories_offset) = match read_u16_le(&optional, 0)? {
        0x10b => (92, 96),
        0x20b => (108, 112),
        _ => return None,
    };
    if read_u32_le(&optional, count_offset)? < 3 {
        return None;
    }
    let resource_rva = read_u32_le(&optional, directories_offset + 2 * 8)?;
    if resource_rva == 0 {
        return None;
    }
    let table_offset = pe_offset
        .checked_add(24)?
        .checked_add(u64::try_from(optional_size).ok()?)?;
    let table = read_exact_at(file, table_offset, sections.checked_mul(40)?)?;
    (0..sections).find_map(|index| {
        let section = index * 40;
        let virtual_size = read_u32_le(&table, section + 8)?;
        let virtual_address = read_u32_le(&table, section + 12)?;
        let raw_size = read_u32_le(&table, section + 16)?;
        let raw_pointer = read_u32_le(&table, section + 20)?;
        let span = virtual_size.max(raw_size);
        if resource_rva < virtual_address || resource_rva >= virtual_address.checked_add(span)? {
            return None;
        }
        if u64::from(raw_size) > PE_RESOURCES_MAX_BYTES {
            return None;
        }
        let bytes = read_exact_at(
            file,
            u64::from(raw_pointer),
            usize::try_from(raw_size).ok()?,
        )?;
        Some(ResourceSection {
            bytes,
            virtual_address,
            directory_rva: resource_rva,
        })
    })
}

/// A 32-bit `BITMAPINFOHEADER` without compression (BGRA, bottom-up, height doubled by the AND mask) as RGBA.
/// When every alpha is zero (an old icon) the AND mask decides what is transparent.
fn dib_32_to_rgba(bytes: &[u8]) -> Option<image::RgbaImage> {
    let header_size = usize::try_from(read_u32_le(bytes, 0)?).ok()?;
    let width = i32::from_le_bytes(bytes.get(4..8)?.try_into().ok()?);
    let height = i32::from_le_bytes(bytes.get(8..12)?.try_into().ok()?);
    let bit_count = read_u16_le(bytes, 14)?;
    let compression = read_u32_le(bytes, 16)?;
    if header_size < 40 || bit_count != 32 || compression != 0 || width <= 0 || height <= 0 {
        return None;
    }
    let width = u32::try_from(width).ok()?;
    let height = u32::try_from(height / 2).ok()?;
    if width == 0 || height == 0 || width > DECODE_MAX_SIDE || height > DECODE_MAX_SIDE {
        return None;
    }
    let row = usize::try_from(width).ok()?.checked_mul(4)?;
    let rows = usize::try_from(height).ok()?;
    let pixels_end = header_size.checked_add(row.checked_mul(rows)?)?;
    let pixels = bytes.get(header_size..pixels_end)?;
    let mut image = image::RgbaImage::new(width, height);
    for (y, source_row) in pixels.chunks_exact(row).enumerate() {
        let target_y = height - 1 - u32::try_from(y).ok()?;
        for (x, pixel) in source_row.chunks_exact(4).enumerate() {
            image.put_pixel(
                u32::try_from(x).ok()?,
                target_y,
                image::Rgba([pixel[2], pixel[1], pixel[0], pixel[3]]),
            );
        }
    }
    if image.pixels().all(|pixel| pixel[3] == 0) {
        let mask_row = usize::try_from(width.div_ceil(32)).ok()?.checked_mul(4)?;
        let mask = bytes.get(pixels_end..pixels_end.checked_add(mask_row.checked_mul(rows)?)?);
        for (x, y, pixel) in image.enumerate_pixels_mut() {
            let source_y = usize::try_from(height - 1 - y).ok()?;
            let x = usize::try_from(x).ok()?;
            let transparent = mask
                .and_then(|mask| mask.get(source_y * mask_row + x / 8))
                .is_some_and(|byte| byte & (0x80 >> (x % 8)) != 0);
            pixel[3] = if transparent { 0 } else { 255 };
        }
    }
    Some(image)
}

fn encode_png(image: &image::RgbaImage) -> Option<Vec<u8>> {
    let mut encoded = Cursor::new(Vec::new());
    image.write_to(&mut encoded, image::ImageFormat::Png).ok()?;
    Some(encoded.into_inner())
}

/// HU-0028 · A-3: the application icon of a PE (`Claude.exe`). The first `RT_GROUP_ICON`, its entries from the
/// widest down (`0` = 256), the `RT_ICON` with that id: PNG as is, or a 32-bit DIB turned into PNG.
pub(crate) fn pe_icon_image(file: &mut (impl Read + Seek)) -> Option<Vec<u8>> {
    let section = pe_resource_section(file)?;
    let group_names = section.type_directory(RT_GROUP_ICON)?;
    let (_, _, group_languages, is_directory) =
        section.entries_up_to(group_names, 1)?.into_iter().next()?;
    if !is_directory {
        return None;
    }
    let group = section.language_data(group_languages)?;
    // The `RT_ICON` ids are read once; each icon then costs one language lookup.
    let mut icon_languages = HashMap::new();
    for (id, named, languages, is_directory) in section.entries(section.type_directory(RT_ICON)?)? {
        if !named && is_directory {
            icon_languages.entry(id).or_insert(languages);
        }
    }
    if read_u16_le(group, 2)? != 1 {
        return None;
    }
    let count = usize::from(read_u16_le(group, 4)?);
    let mut entries = (0..count)
        .map(|index| {
            let entry = 6_usize.checked_add(index.checked_mul(14)?)?;
            let width = *group.get(entry)?;
            let id = read_u16_le(group, entry.checked_add(12)?)?;
            Some((if width == 0 { 256 } else { u32::from(width) }, id))
        })
        .collect::<Option<Vec<_>>>()?;
    entries.sort_by(|left, right| right.0.cmp(&left.0));
    let mut seen = HashSet::new();
    entries.retain(|(_, id)| seen.insert(*id));
    entries.truncate(PE_MAX_GROUP_ICONS);
    entries.into_iter().find_map(|(_, id)| {
        let icon = section.language_data(*icon_languages.get(&u32::from(id))?)?;
        if icon.starts_with(PNG_SIGNATURE) {
            Some(icon.to_vec())
        } else {
            dib_32_to_rgba(icon).and_then(|image| encode_png(&image))
        }
    })
}

/// Reads a whole file only when it is at most `limit` bytes.
fn read_bounded(file: &mut File, limit: u64) -> Option<Vec<u8>> {
    let length = file.metadata().ok()?.len();
    if length == 0 || length > limit {
        return None;
    }
    let mut bytes = Vec::with_capacity(usize::try_from(length).ok()?);
    file.seek(SeekFrom::Start(0)).ok()?;
    file.take(limit).read_to_end(&mut bytes).ok()?;
    Some(bytes)
}

/// The icon image of the original, by the signature of the file: `icns` → its largest PNG, `MZ` → PE resources,
/// PNG → as is. Anything else, or a file over the limits, gives `None`.
pub(crate) fn provider_icon_image(file: &Path) -> Option<Vec<u8>> {
    let mut opened = File::open(file).ok()?;
    let mut signature = [0_u8; 8];
    opened.read_exact(&mut signature).ok()?;
    if signature.starts_with(b"icns") {
        icns_largest_png(&read_bounded(&mut opened, ICON_FILE_MAX_BYTES)?)
    } else if signature.starts_with(b"MZ") {
        pe_icon_image(&mut opened)
    } else if &signature == PNG_SIGNATURE {
        read_bounded(&mut opened, ICON_FILE_MAX_BYTES)
    } else {
        None
    }
}

/// HU-0028 · normalizes the original's icon: RGBA, cropped to its body (alpha ≥ 128, so the template margin and its
/// shadow go away), centered on a transparent square and scaled to `min(512, side)` with Lanczos3. PNG only.
pub(crate) fn badge_png(raw: &[u8]) -> Result<Vec<u8>, ()> {
    if !raw.starts_with(PNG_SIGNATURE) {
        return Err(());
    }
    let (width, height) =
        image::ImageReader::with_format(Cursor::new(raw), image::ImageFormat::Png)
            .into_dimensions()
            .map_err(|_| ())?;
    if width == 0 || height == 0 || width > DECODE_MAX_SIDE || height > DECODE_MAX_SIDE {
        return Err(());
    }
    let image = image::load_from_memory_with_format(raw, image::ImageFormat::Png)
        .map_err(|_| ())?
        .to_rgba8();
    let mut bounds: Option<(u32, u32, u32, u32)> = None;
    for (x, y, pixel) in image.enumerate_pixels() {
        if pixel[3] >= BADGE_BODY_ALPHA {
            bounds = Some(match bounds {
                None => (x, y, x, y),
                Some((left, top, right, bottom)) => {
                    (left.min(x), top.min(y), right.max(x), bottom.max(y))
                }
            });
        }
    }
    let (left, top, right, bottom) = bounds.ok_or(())?;
    let (crop_width, crop_height) = (right - left + 1, bottom - top + 1);
    let body = image::imageops::crop_imm(&image, left, top, crop_width, crop_height).to_image();
    let side = crop_width.max(crop_height);
    let mut square = image::RgbaImage::new(side, side);
    image::imageops::overlay(
        &mut square,
        &body,
        i64::from((side - crop_width) / 2),
        i64::from((side - crop_height) / 2),
    );
    let target = side.min(BADGE_MAX_SIDE);
    let badge = if target == side {
        square
    } else {
        image::imageops::resize(
            &square,
            target,
            target,
            image::imageops::FilterType::Lanczos3,
        )
    };
    encode_png(&badge).ok_or(())
}

/// 16 hex of SHA-256 over the canonical path, size and modification time of the icon file.
fn badge_key(icon_file: &Path) -> Option<String> {
    let canonical = fs::canonicalize(icon_file).ok()?;
    let metadata = fs::metadata(&canonical).ok()?;
    let modified_ns = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|value| value.as_nanos())
        .unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(BADGE_KEY_DOMAIN);
    hasher.update(canonical.to_string_lossy().as_bytes());
    hasher.update(b"\0");
    hasher.update(metadata.len().to_string().as_bytes());
    hasher.update(b"\0");
    hasher.update(modified_ns.to_string().as_bytes());
    let digest = hasher.finalize();
    Some(
        digest
            .iter()
            .take(8)
            .map(|byte| format!("{byte:02x}"))
            .collect(),
    )
}

/// A cached badge is trusted only as a regular file (not a link) of 1 B to 16 MiB.
fn cached_badge_is_valid(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|metadata| {
        metadata.file_type().is_file()
            && metadata.len() > 0
            && metadata.len() <= ICON_FILE_MAX_BYTES
    })
}

/// Removes every other regular file of the badge folder (old copies, temporaries). No recursion, no links followed.
fn remove_other_badges(directory: &Path, keep: &Path) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path != keep && entry.file_type().is_ok_and(|kind| kind.is_file()) {
            let _ = fs::remove_file(path);
        }
    }
}

/// The cached badge for `icon_file`, extracting it with `read` only when there is no valid copy. The caller holds
/// `BADGE_LOCK`. `None` when the icon cannot be read or normalized, or the copy cannot be written.
pub(crate) fn resolve_badge(
    app_data: &Path,
    icon_file: &Path,
    read: impl Fn(&Path) -> Option<Vec<u8>>,
) -> Option<ProviderBadge> {
    let key = badge_key(icon_file)?;
    let directory = app_data.join(BADGE_DIRECTORY);
    let target = directory.join(format!("{key}.png"));
    if !cached_badge_is_valid(&target) {
        let png = badge_png(&read(icon_file)?).ok()?;
        fs::create_dir_all(&directory).ok()?;
        // A link (or anything else) where the copy goes is not trusted: the link itself is removed, never followed.
        if fs::symlink_metadata(&target).is_ok_and(|metadata| metadata.file_type().is_symlink()) {
            fs::remove_file(&target).ok()?;
        }
        write_file_atomic(&target, &png, BADGE_TEMPORARY_PREFIX).ok()?;
        remove_other_badges(&directory, &target);
    }
    Some(ProviderBadge {
        path: target.to_string_lossy().to_string(),
    })
}

/// What was resolved for one original, remembered until its fingerprint changes or the app restarts (D-7: a
/// failure is not retried on every refresh).
struct BadgeMemo {
    app_data: PathBuf,
    fingerprint: ApplicationFingerprint,
    badge: Option<ProviderBadge>,
}

static BADGE_LOCK: Mutex<Option<BadgeMemo>> = Mutex::new(None);

/// HU-0028 · the badge of the original at `source`, or `None` (no icon, unreadable, or not normalizable). With the
/// same fingerprint the remembered result is returned (a `Some` only while its file is still there).
pub(crate) fn provider_badge(app_data: &Path, source: &Path) -> Option<ProviderBadge> {
    remembered_badge(&BADGE_LOCK, app_data, source, || {
        provider_icon_file(source)
            .and_then(|icon_file| resolve_badge(app_data, &icon_file, provider_icon_image))
    })
}

/// `provider_badge` over a given memo (tests use their own): `extract` runs only when the fingerprint of `source`
/// (or `app_data`) differs from the remembered one, or when the remembered copy is gone.
fn remembered_badge(
    lock: &Mutex<Option<BadgeMemo>>,
    app_data: &Path,
    source: &Path,
    extract: impl FnOnce() -> Option<ProviderBadge>,
) -> Option<ProviderBadge> {
    let fingerprint = application_fingerprint(source)?;
    let mut memo = lock.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    if let Some(remembered) = memo
        .as_ref()
        .filter(|memo| memo.app_data == app_data && memo.fingerprint == fingerprint)
    {
        match &remembered.badge {
            None => return None,
            Some(badge) if cached_badge_is_valid(Path::new(&badge.path)) => {
                return Some(badge.clone())
            }
            Some(_) => {}
        }
    }
    let badge = extract();
    *memo = Some(BadgeMemo {
        app_data: app_data.to_path_buf(),
        fingerprint,
        badge: badge.clone(),
    });
    badge
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

    fn png_of(image: &image::RgbaImage) -> Vec<u8> {
        encode_png(image).unwrap()
    }

    fn solid_png(side: u32, color: [u8; 4]) -> Vec<u8> {
        png_of(&image::RgbaImage::from_pixel(
            side,
            side,
            image::Rgba(color),
        ))
    }

    /// A macOS-like template at 256 px: an opaque body from 25 to 230 and a faint shadow down to 237.
    fn template_256() -> Vec<u8> {
        png_of(&image::RgbaImage::from_fn(256, 256, |x, y| {
            if (25..=230).contains(&x) && (25..=230).contains(&y) {
                image::Rgba([200, 100, 50, 255])
            } else if (25..=230).contains(&x) && (231..=237).contains(&y) {
                image::Rgba([0, 0, 0, 60])
            } else {
                image::Rgba([0, 0, 0, 0])
            }
        }))
    }

    fn icns(chunks: &[(&[u8; 4], &[u8])]) -> Vec<u8> {
        let mut body = Vec::new();
        for (kind, data) in chunks {
            body.extend_from_slice(*kind);
            body.extend_from_slice(&u32::try_from(data.len() + 8).unwrap().to_be_bytes());
            body.extend_from_slice(data);
        }
        let mut file = b"icns".to_vec();
        file.extend_from_slice(&u32::try_from(body.len() + 8).unwrap().to_be_bytes());
        file.extend(body);
        file
    }

    #[test]
    fn badge_png_crops_the_template_margin_and_its_shadow() {
        let badge = image::load_from_memory(&badge_png(&template_256()).unwrap())
            .unwrap()
            .to_rgba8();
        assert_eq!(badge.dimensions(), (206, 206), "only the 25..=230 body");
        for (x, y) in [(0, 0), (205, 0), (0, 205), (205, 205), (103, 103)] {
            assert_eq!(badge.get_pixel(x, y)[3], 255, "body ({x}, {y})");
        }
        assert_eq!(badge.get_pixel(103, 103).0, [200, 100, 50, 255]);
        // A wide body is centered on a transparent square.
        let wide = png_of(&image::RgbaImage::from_fn(40, 20, |x, _| {
            image::Rgba([10, 20, 30, if x < 30 { 255 } else { 0 }])
        }));
        let wide = image::load_from_memory(&badge_png(&wide).unwrap())
            .unwrap()
            .to_rgba8();
        assert_eq!(wide.dimensions(), (30, 30));
        assert_eq!(wide.get_pixel(15, 0)[3], 0, "padding above");
        assert_eq!(wide.get_pixel(15, 15)[3], 255);
        // Big icons are scaled down to 512.
        let big = badge_png(&solid_png(1024, [1, 2, 3, 255])).unwrap();
        assert_eq!(
            image::load_from_memory(&big)
                .unwrap()
                .to_rgba8()
                .dimensions(),
            (512, 512)
        );
    }

    #[test]
    fn badge_png_refuses_empty_and_non_images() {
        assert_eq!(badge_png(&solid_png(32, [0, 0, 0, 100])), Err(()));
        assert_eq!(badge_png(b"not an image"), Err(()));
        assert_eq!(badge_png(&[]), Err(()));
        assert_eq!(badge_png(&solid_png(2049, [0, 0, 0, 255])), Err(()));
    }

    #[test]
    fn icns_gives_its_widest_png_and_ignores_other_chunks() {
        let small = solid_png(16, [255, 0, 0, 255]);
        let large = solid_png(64, [0, 255, 0, 255]);
        let medium = solid_png(32, [0, 0, 255, 255]);
        let file = icns(&[
            (b"ic07", &small),
            (b"is32", b"legacy rle data"),
            (b"ic10", &large),
            (b"TOC ", b"table"),
            (b"ic08", &medium),
        ]);
        assert_eq!(icns_largest_png(&file), Some(large.clone()));
        assert_eq!(icns_largest_png(&icns(&[(b"is32", b"legacy")])), None);
        // A PNG chunk that declares more than 2048 px a side (it would not be decoded) is passed over.
        let oversized = |width: u32, height: u32| {
            let mut header = PNG_SIGNATURE.to_vec();
            header.extend_from_slice(&13_u32.to_be_bytes());
            header.extend_from_slice(b"IHDR");
            header.extend_from_slice(&width.to_be_bytes());
            header.extend_from_slice(&height.to_be_bytes());
            header.extend_from_slice(&[8, 6, 0, 0, 0, 0, 0, 0, 0]);
            header
        };
        let (wide, tall) = (oversized(4096, 4096), oversized(1024, 4096));
        let with_oversized = icns(&[(b"ic07", &small), (b"ic14", &wide), (b"ic13", &tall)]);
        assert_eq!(icns_largest_png(&with_oversized), Some(small.clone()));
        assert_eq!(icns_largest_png(&icns(&[(b"ic14", &wide)])), None);
        // Broken lengths: total larger than the file, a chunk past the end, a chunk shorter than its header.
        let mut too_long = file.clone();
        too_long[4..8].copy_from_slice(&u32::MAX.to_be_bytes());
        assert_eq!(icns_largest_png(&too_long), None);
        let mut past_end = file.clone();
        past_end[12..16].copy_from_slice(&0x7fff_0000_u32.to_be_bytes());
        assert_eq!(icns_largest_png(&past_end), None);
        let mut short = file.clone();
        short[12..16].copy_from_slice(&4_u32.to_be_bytes());
        assert_eq!(icns_largest_png(&short), None);
        assert_eq!(icns_largest_png(b"icns"), None);
        assert_eq!(icns_largest_png(b"MZ\0\0"), None);
    }

    /// A 32-bit DIB icon entry (`BITMAPINFOHEADER`, BGRA bottom-up, then the AND mask).
    fn dib_32(side: u32, bgra: [u8; 4]) -> Vec<u8> {
        let mut data = Vec::new();
        data.extend_from_slice(&40_u32.to_le_bytes());
        data.extend_from_slice(&i32::try_from(side).unwrap().to_le_bytes());
        data.extend_from_slice(&i32::try_from(side * 2).unwrap().to_le_bytes());
        data.extend_from_slice(&1_u16.to_le_bytes());
        data.extend_from_slice(&32_u16.to_le_bytes());
        data.extend_from_slice(&[0; 24]);
        for _ in 0..side * side {
            data.extend_from_slice(&bgra);
        }
        let mask_row = usize::try_from(side.div_ceil(32) * 4).unwrap();
        data.extend(vec![0_u8; mask_row * usize::try_from(side).unwrap()]);
        data
    }

    /// A PE32+ with one section (`.rsrc`) holding a resource tree: one `RT_GROUP_ICON` and its `RT_ICON`s.
    fn pe_with_icons(icons: &[(u8, u16, Vec<u8>)]) -> Vec<u8> {
        let group: Vec<(u8, u16)> = icons.iter().map(|(width, id, _)| (*width, *id)).collect();
        pe_with_group(icons, &group)
    }

    /// Like `pe_with_icons`, with the `RT_GROUP_ICON` entries (`width`, `id`) given apart from the `RT_ICON`s.
    fn pe_with_group(icons: &[(u8, u16, Vec<u8>)], group_entries: &[(u8, u16)]) -> Vec<u8> {
        const SECTION_RVA: u32 = 0x1000;
        const RAW_POINTER: u32 = 0x200;
        let directory = |entries: &[(u32, u32)]| {
            let mut bytes = vec![0_u8; 12];
            bytes.extend_from_slice(&0_u16.to_le_bytes());
            bytes.extend_from_slice(&u16::try_from(entries.len()).unwrap().to_le_bytes());
            for (id, offset) in entries {
                bytes.extend_from_slice(&id.to_le_bytes());
                bytes.extend_from_slice(&offset.to_le_bytes());
            }
            bytes
        };
        let mut group = Vec::new();
        group.extend_from_slice(&0_u16.to_le_bytes());
        group.extend_from_slice(&1_u16.to_le_bytes());
        group.extend_from_slice(&u16::try_from(group_entries.len()).unwrap().to_le_bytes());
        for (width, id) in group_entries {
            group.extend_from_slice(&[*width, *width, 0, 0]);
            group.extend_from_slice(&1_u16.to_le_bytes());
            group.extend_from_slice(&32_u16.to_le_bytes());
            group.extend_from_slice(&0_u32.to_le_bytes());
            group.extend_from_slice(&id.to_le_bytes());
        }
        // Layout: root, type dirs, name dirs, language dirs, data entries, then the data blobs.
        let icon_count = icons.len();
        let directory_size = |entries: usize| 16 + 8 * entries;
        let root_size = directory_size(2);
        let icon_type_offset = root_size;
        let group_type_offset = icon_type_offset + directory_size(icon_count);
        let mut cursor = group_type_offset + directory_size(1);
        let icon_language_offsets: Vec<usize> = (0..icon_count)
            .map(|_| {
                let offset = cursor;
                cursor += directory_size(1);
                offset
            })
            .collect();
        let group_language_offset = cursor;
        cursor += directory_size(1);
        let icon_data_entries: Vec<usize> = (0..icon_count)
            .map(|_| {
                let offset = cursor;
                cursor += 16;
                offset
            })
            .collect();
        let group_data_entry = cursor;
        cursor += 16;
        let mut blobs = Vec::new();
        let mut blob_offsets = Vec::new();
        for blob in icons
            .iter()
            .map(|(_, _, data)| data)
            .chain(std::iter::once(&group))
        {
            blob_offsets.push(cursor + blobs.len());
            blobs.extend_from_slice(blob);
        }
        let subdirectory = |offset: usize| u32::try_from(offset).unwrap() | 0x8000_0000;
        let mut tree = Vec::new();
        tree.extend(directory(&[
            (RT_ICON, subdirectory(icon_type_offset)),
            (RT_GROUP_ICON, subdirectory(group_type_offset)),
        ]));
        tree.extend(directory(
            &icons
                .iter()
                .zip(&icon_language_offsets)
                .map(|((_, id, _), offset)| (u32::from(*id), subdirectory(*offset)))
                .collect::<Vec<_>>(),
        ));
        tree.extend(directory(&[(1, subdirectory(group_language_offset))]));
        for data_entry in &icon_data_entries {
            tree.extend(directory(&[(1033, u32::try_from(*data_entry).unwrap())]));
        }
        tree.extend(directory(&[(
            1033,
            u32::try_from(group_data_entry).unwrap(),
        )]));
        let sizes = icons
            .iter()
            .map(|(_, _, data)| data.len())
            .chain(std::iter::once(group.len()));
        for (offset, size) in blob_offsets.iter().zip(sizes) {
            tree.extend_from_slice(&(SECTION_RVA + u32::try_from(*offset).unwrap()).to_le_bytes());
            tree.extend_from_slice(&u32::try_from(size).unwrap().to_le_bytes());
            tree.extend_from_slice(&[0; 8]);
        }
        assert_eq!(tree.len(), cursor);
        tree.extend(blobs);

        let mut file = vec![0_u8; usize::try_from(RAW_POINTER).unwrap()];
        file[..2].copy_from_slice(b"MZ");
        file[0x3c..0x40].copy_from_slice(&0x40_u32.to_le_bytes());
        let mut header = b"PE\0\0".to_vec();
        header.extend_from_slice(&0x8664_u16.to_le_bytes());
        header.extend_from_slice(&1_u16.to_le_bytes());
        header.extend_from_slice(&[0; 12]);
        let optional_size = 112 + 16 * 8;
        header.extend_from_slice(&u16::try_from(optional_size).unwrap().to_le_bytes());
        header.extend_from_slice(&0_u16.to_le_bytes());
        let mut optional = vec![0_u8; optional_size];
        optional[..2].copy_from_slice(&0x20b_u16.to_le_bytes());
        optional[108..112].copy_from_slice(&16_u32.to_le_bytes());
        optional[112 + 16..112 + 20].copy_from_slice(&SECTION_RVA.to_le_bytes());
        optional[112 + 20..112 + 24]
            .copy_from_slice(&u32::try_from(tree.len()).unwrap().to_le_bytes());
        header.extend(optional);
        let mut section = b".rsrc\0\0\0".to_vec();
        let size = u32::try_from(tree.len()).unwrap();
        section.extend_from_slice(&size.to_le_bytes());
        section.extend_from_slice(&SECTION_RVA.to_le_bytes());
        section.extend_from_slice(&size.to_le_bytes());
        section.extend_from_slice(&RAW_POINTER.to_le_bytes());
        section.extend_from_slice(&[0; 16]);
        header.extend(section);
        file[0x40..0x40 + header.len()].copy_from_slice(&header);
        file.extend(tree);
        file
    }

    #[test]
    fn pe_gives_the_widest_icon_of_the_first_group() {
        let png_256 = solid_png(256, [0, 200, 0, 255]);
        let file = pe_with_icons(&[
            (32, 1, dib_32(32, [255, 0, 0, 255])),
            (0, 2, png_256.clone()),
            (48, 3, solid_png(48, [9, 9, 9, 255])),
        ]);
        assert_eq!(pe_icon_image(&mut Cursor::new(file)), Some(png_256));
    }

    #[test]
    fn pe_decodes_a_32_bit_dib_when_there_is_no_png() {
        // BGRA blue, fully opaque; the 16 px entry is skipped for the 48 px one.
        let file = pe_with_icons(&[
            (16, 7, dib_32(16, [0, 0, 0, 255])),
            (48, 8, dib_32(48, [255, 0, 0, 255])),
        ]);
        let png = pe_icon_image(&mut Cursor::new(file)).unwrap();
        let image = image::load_from_memory(&png).unwrap().to_rgba8();
        assert_eq!(image.dimensions(), (48, 48));
        assert_eq!(image.get_pixel(0, 0).0, [0, 0, 255, 255]);
        // An old icon with no alpha takes its transparency from the AND mask (here: all opaque).
        let old = pe_with_icons(&[(16, 1, dib_32(16, [10, 20, 30, 0]))]);
        let image = image::load_from_memory(&pe_icon_image(&mut Cursor::new(old)).unwrap())
            .unwrap()
            .to_rgba8();
        assert_eq!(image.get_pixel(3, 3).0, [30, 20, 10, 255]);
        // Neither PNG nor a 32-bit DIB: nothing.
        let unknown = pe_with_icons(&[(
            32,
            1,
            b"not a bitmap at all, just bytes...........".to_vec(),
        )]);
        assert_eq!(pe_icon_image(&mut Cursor::new(unknown)), None);
    }

    #[test]
    fn pe_with_offsets_out_of_bounds_or_without_mz_gives_nothing() {
        let file = pe_with_icons(&[(32, 1, solid_png(32, [1, 1, 1, 255]))]);
        assert!(pe_icon_image(&mut Cursor::new(file.clone())).is_some());
        // `e_lfanew` beyond the file and beyond 1 MiB.
        let mut far = file.clone();
        far[0x3c..0x40].copy_from_slice(&0x00f0_0000_u32.to_le_bytes());
        assert_eq!(pe_icon_image(&mut Cursor::new(far)), None);
        // The resource section points past the end of the file.
        let mut raw_past_end = file.clone();
        let section = 0x40 + 24 + 112 + 16 * 8;
        raw_past_end[section + 20..section + 24].copy_from_slice(&0x0100_0000_u32.to_le_bytes());
        assert_eq!(pe_icon_image(&mut Cursor::new(raw_past_end)), None);
        // An entry offset that leaves the section.
        let mut entry_outside = file.clone();
        let root_first_entry = 0x200 + 16 + 4;
        entry_outside[root_first_entry..root_first_entry + 4]
            .copy_from_slice(&0x8fff_fff0_u32.to_le_bytes());
        entry_outside[root_first_entry + 8..root_first_entry + 12]
            .copy_from_slice(&0x8fff_fff0_u32.to_le_bytes());
        assert_eq!(pe_icon_image(&mut Cursor::new(entry_outside)), None);
        // Too many sections.
        let mut sections = file.clone();
        sections[0x40 + 6..0x40 + 8].copy_from_slice(&200_u16.to_le_bytes());
        assert_eq!(pe_icon_image(&mut Cursor::new(sections)), None);
        let mut no_mz = file;
        no_mz[..2].copy_from_slice(b"ZM");
        assert_eq!(pe_icon_image(&mut Cursor::new(no_mz)), None);
        assert_eq!(pe_icon_image(&mut Cursor::new(Vec::new())), None);
    }

    #[test]
    fn provider_icon_image_reads_by_file_signature() {
        let root = env::temp_dir().join(format!("code-ai-badge-image-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let png = solid_png(24, [1, 2, 3, 255]);
        let cases = [
            ("icon.icns", icns(&[(b"ic07", &png)]), Some(png.clone())),
            (
                "Claude.exe",
                pe_with_icons(&[(24, 1, png.clone())]),
                Some(png.clone()),
            ),
            ("icon.png", png.clone(), Some(png.clone())),
            ("icon.svg", b"<svg xmlns='x'></svg>".to_vec(), None),
            ("short", b"MZ".to_vec(), None),
        ];
        for (name, bytes, expected) in cases {
            let file = root.join(name);
            fs::write(&file, bytes).unwrap();
            assert_eq!(provider_icon_image(&file), expected, "{name}");
        }
        assert_eq!(provider_icon_image(&root.join("missing")), None);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn pe_tries_each_icon_once_and_at_most_64_of_them() {
        let png = solid_png(16, [0, 9, 0, 255]);
        let garbage = || b"not a bitmap at all, just bytes...........".to_vec();
        // 60 000 group entries naming the same undecodable icon, then a decodable one: the repeated id is tried
        // once, so the cap is not used up and the decodable icon is found.
        let mut group = vec![(32_u8, 1_u16); 60_000];
        group.push((16, 2));
        let repeated = pe_with_group(&[(32, 1, garbage()), (16, 2, png.clone())], &group);
        assert_eq!(pe_icon_image(&mut Cursor::new(repeated)), Some(png.clone()));
        // 64 distinct undecodable icons wider than the decodable one: the cap stops before it.
        let mut icons: Vec<(u8, u16, Vec<u8>)> =
            (1..=64).map(|id| (200 - id as u8, id, garbage())).collect();
        icons.push((16, 65, png.clone()));
        assert_eq!(pe_icon_image(&mut Cursor::new(pe_with_icons(&icons))), None);
        icons.remove(0);
        assert_eq!(
            pe_icon_image(&mut Cursor::new(pe_with_icons(&icons))),
            Some(png),
            "63 failures leave room for the 64th"
        );
    }

    #[test]
    fn the_badge_memo_remembers_a_failure_until_the_fingerprint_changes() {
        let root = env::temp_dir().join(format!("code-ai-badge-memo-{}", Uuid::new_v4()));
        let app_data = root.join("data");
        let source = root.join("Original.app");
        let executable = provider_executable(&source);
        fs::create_dir_all(executable.parent().unwrap()).unwrap();
        fs::write(&executable, b"v1").unwrap();
        let memo = Mutex::new(None);
        let extractions = Cell::new(0);
        let fail = || {
            extractions.set(extractions.get() + 1);
            None
        };
        assert_eq!(remembered_badge(&memo, &app_data, &source, fail), None);
        assert_eq!(remembered_badge(&memo, &app_data, &source, fail), None);
        assert_eq!(extractions.get(), 1, "a remembered failure is not retried");
        // Another version of the original (another fingerprint) is extracted again.
        fs::write(&executable, b"version 2").unwrap();
        assert_eq!(remembered_badge(&memo, &app_data, &source, fail), None);
        assert_eq!(extractions.get(), 2);
        // A success is remembered while its copy is there, and extracted again when it is gone.
        let copy = app_data.join("provider-badge/0123456789abcdef.png");
        fs::create_dir_all(copy.parent().unwrap()).unwrap();
        fs::write(&copy, solid_png(8, [1, 1, 1, 255])).unwrap();
        let badge = ProviderBadge {
            path: copy.to_string_lossy().to_string(),
        };
        let succeed = || {
            extractions.set(extractions.get() + 1);
            Some(badge.clone())
        };
        fs::write(&executable, b"version three").unwrap();
        assert_eq!(
            remembered_badge(&memo, &app_data, &source, succeed),
            Some(badge.clone())
        );
        assert_eq!(
            remembered_badge(&memo, &app_data, &source, succeed),
            Some(badge.clone())
        );
        assert_eq!(extractions.get(), 3);
        fs::remove_file(&copy).unwrap();
        assert_eq!(
            remembered_badge(&memo, &app_data, &source, succeed),
            Some(badge.clone())
        );
        assert_eq!(extractions.get(), 4, "a vanished copy is extracted again");
        // Without an original there is nothing to remember.
        assert_eq!(
            remembered_badge(&memo, &app_data, &root.join("missing"), succeed),
            None
        );
        assert_eq!(extractions.get(), 4);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn resolve_badge_writes_once_and_follows_the_icon_file() {
        let root = env::temp_dir().join(format!("code-ai-badge-resolve-{}", Uuid::new_v4()));
        let app_data = root.join("data");
        let icon_file = root.join("original/icon.png");
        fs::create_dir_all(icon_file.parent().unwrap()).unwrap();
        fs::write(&icon_file, template_256()).unwrap();
        let reads = Cell::new(0);
        let read = |path: &Path| {
            reads.set(reads.get() + 1);
            fs::read(path).ok()
        };

        let first = resolve_badge(&app_data, &icon_file, read).unwrap();
        let first_path = PathBuf::from(&first.path);
        assert_eq!(
            first_path.parent(),
            Some(app_data.join("provider-badge").as_path())
        );
        let stem = first_path.file_stem().unwrap().to_str().unwrap();
        assert!(
            stem.len() == 16 && stem.chars().all(|c| c.is_ascii_hexdigit()),
            "{stem}"
        );
        assert!(image::load_from_memory(&fs::read(&first_path).unwrap()).is_ok());
        assert_eq!(reads.get(), 1);

        let second = resolve_badge(&app_data, &icon_file, read).unwrap();
        assert_eq!(second, first);
        assert_eq!(reads.get(), 1, "a valid copy is not extracted again");

        // The icon file changes (another size): a new key and a single copy left.
        fs::write(&icon_file, solid_png(64, [5, 5, 5, 255])).unwrap();
        let third = resolve_badge(&app_data, &icon_file, read).unwrap();
        assert_ne!(third.path, first.path);
        assert_eq!(reads.get(), 2);
        let left: Vec<_> = fs::read_dir(app_data.join("provider-badge"))
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .collect();
        assert_eq!(left, vec![PathBuf::from(&third.path)]);

        // An extractor that finds nothing leaves no file and no badge.
        let other_data = root.join("other");
        assert_eq!(resolve_badge(&other_data, &icon_file, |_| None), None);
        assert!(!other_data.join("provider-badge").exists());
        // A missing icon file has no key.
        assert_eq!(
            resolve_badge(&app_data, &root.join("missing.png"), |_| Some(
                template_256()
            )),
            None
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn resolve_badge_does_not_trust_a_link_in_place_of_the_copy() {
        use std::os::unix::fs::symlink;

        let root = env::temp_dir().join(format!("code-ai-badge-link-{}", Uuid::new_v4()));
        let app_data = root.join("data");
        let icon_file = root.join("original/icon.png");
        let outside = root.join("outside.png");
        fs::create_dir_all(icon_file.parent().unwrap()).unwrap();
        fs::write(&icon_file, template_256()).unwrap();
        fs::write(&outside, b"someone else's file").unwrap();
        let badge = resolve_badge(&app_data, &icon_file, |path| fs::read(path).ok()).unwrap();
        let copy = PathBuf::from(&badge.path);
        fs::remove_file(&copy).unwrap();
        symlink(&outside, &copy).unwrap();
        let reads = Cell::new(0);
        let again = resolve_badge(&app_data, &icon_file, |path| {
            reads.set(reads.get() + 1);
            fs::read(path).ok()
        })
        .unwrap();
        assert_eq!(again, badge);
        assert_eq!(reads.get(), 1, "the link is replaced by a fresh copy");
        assert!(fs::symlink_metadata(&copy).unwrap().file_type().is_file());
        assert_eq!(
            fs::read(&outside).unwrap(),
            b"someone else's file",
            "the link target is never written"
        );
        fs::remove_dir_all(root).unwrap();
    }
}
