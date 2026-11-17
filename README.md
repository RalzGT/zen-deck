# Zen Deck - By Ralz

Panel personal unificado, sincronizado en la nube e instalable como **Progressive Web App (PWA)** con interfaz *Liquid Glass* y temas dinámicos por módulo.

## Módulos Principales

1. **Panel Principal (Bento Grid Personalizable)**
   - **Clima Local**: Pronóstico en tiempo real vía Open-Meteo con buscador global de ciudades.
   - **Divisas en Vivo**: Conversor multimoneda con tasas actualizadas (`HNL`, `USD`, `EUR`, `MXN`, entre otras).
   - **Productividad Sincronizada**: Accesos rápidos, lista de tareas pendientes y recordatorios almacenados en Supabase.
   - **Widgets Personalizados & Drag-and-Drop**: Reordena, redimensiona (`1x1`, `2x1`, `1x2`, `2x2`) o crea notas, listas de chequeo, contadores de meta y temporizadores.

2. **Panel de Vida (Bandeja y Agenda Unificadas)**
   - **Gmail & Google Calendar**: Conexión directa mediante Google Identity Services (OAuth 2.0).
   - **Microsoft Outlook**: Lectura de correos y eventos próximos vía Microsoft Graph API.
   - **Apple Calendar (`.ics`)**: Vinculación mediante enlaces públicos (`webcal://` / `https://`) o importación directa de archivos `.ics` locales.

3. **Asesor Financiero Personal**
   - Consolidación de **Patrimonio Neto** en múltiples monedas con conversión automática.
   - Gráfico de tendencia SVG, flujo de efectivo (ingresos vs. gastos) y distribución por categorías o gastos recurrentes.
   - Gestión de cuentas, categorías personalizadas y pagos planificados con aplicación automática de saldo.

4. **Parleys & Probabilidades**
   - Actualización automática dos veces al día mediante **GitHub Actions** (`scripts/fetch_parleys.py` → `data/parleys.json`).
   - Cobertura de Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, **Champions League**, **Fecha FIFA**, Brasileirão, Liga Argentina y MLS.
   - Filtros por competencia y fecha (**Hoy**, **Mañana**, **Esta semana** o fecha exacta) con calculadora interactiva de momios y probabilidad combinada.

## Configuración Rápida

1. **Base de datos (Supabase)**: Ejecuta el esquema SQL en el *SQL Editor* de tu proyecto y añade la URL de despliegue en *Authentication → URL Configuration*.
2. **Pronósticos Automáticos (GitHub Actions)**:
   - Opcional: Agrega el secreto `ODDS_API_KEY` en *Settings → Secrets and variables → Actions* para usar cuotas de casas de apuestas. Si no se define, el script utiliza automáticamente el respaldo público de ESPN.
   - Asegúrate de tener habilitados los permisos de lectura y escritura para workflows en *Settings → Actions → General → Workflow permissions*.
3. **Instalación como PWA**: Abre la aplicación en Safari (iOS), Brave, Firefox o Chrome y selecciona **Agregar a pantalla de inicio / Instalar aplicación**.
