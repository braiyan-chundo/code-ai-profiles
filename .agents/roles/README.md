# Agentes de desarrollo

Estas definiciones son neutrales respecto a la herramienta de IA. `AGENTS.md` establece el flujo obligatorio y cada archivo de esta carpeta define un rol especializado.

| Rol | Perfil de modelo | Responsabilidad |
| --- | --- | --- |
| `architect` | Mayor capacidad disponible, razonamiento máximo | Analizar, diseñar la HU y orquestar |
| `backend` | Modelo de código avanzado, razonamiento medio | Implementar Rust, Tauri e integraciones |
| `frontend` | Modelo de código avanzado, razonamiento medio | Implementar React/Vite y UX/UI |
| `document` | Modelo eficiente de alta calidad, razonamiento alto | Mantener HU, índices y documentación |

Una IA sin soporte nativo para agentes debe cargar primero `AGENTS.md` y después el archivo del rol que vaya a ejecutar. Los adaptadores de Codex fijan modelos concretos en `.codex/agents/`.
