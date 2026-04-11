# Protocolo: SKILL_AUTO_GITHUB

Este documento define el protocolo de automatización para la sincronización del proyecto **EEF 2026** con GitHub.

## 🤖 Capacidades del Agente
- El agente **Antigravity** tiene autorización para ejecutar comandos de Git en el terminal local.
- El agente utiliza un Token de Acceso Personal para autenticarse sin solicitar contraseñas.
- El agente debe respetar estrictamente el archivo `.gitignore` para no subir archivos pesados.

## 🔄 Flujo de Automatización
Cada vez que se complete una tarea importante (ej. generación de una sesión, actualización de estilos globales o mejora de la biblioteca de recursos), el agente seguirá estos pasos:

1.  **Preparación (Staging):** Seleccionar todos los cambios ligeros.
    ```bash
    git add .
    ```
2.  **Registro (Commit):** Crear un punto de restauración con un mensaje claro.
    - Formato: `[AI-SYNC] Sesión X: Descripción del cambio`
3.  **Despliegue (Push):** Enviar los cambios a la rama principal.
    ```bash
    git push origin main
    ```

## 🛠️ Reglas de Seguridad
- **NUNCA** subir archivos de video (MP4), audios (M4A) o presentaciones pesadas (PPTX). Estos se manejan mediante enlaces externos (YouTube/OneDrive).
- Si el repositorio remoto tiene cambios nuevos, el agente debe realizar un `git pull` antes de subir para evitar conflictos.
