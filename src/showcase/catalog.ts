import type { ComponentType } from "react";

import buttonSection from "./sections/button";
import buttonGroupSection from "./sections/button-group";
import toggleSection from "./sections/toggle";
import toggleGroupSection from "./sections/toggle-group";
import kbdSection from "./sections/kbd";
import fieldSection from "./sections/field";
import labelSection from "./sections/label";
import inputSection from "./sections/input";
import inputGroupSection from "./sections/input-group";
import inputOtpSection from "./sections/input-otp";
import textareaSection from "./sections/textarea";
import checkboxSection from "./sections/checkbox";
import radioGroupSection from "./sections/radio-group";
import switchSection from "./sections/switch";
import sliderSection from "./sections/slider";
import selectSection from "./sections/select";
import nativeSelectSection from "./sections/native-select";
import comboboxSection from "./sections/combobox";
import calendarSection from "./sections/calendar";
import tabsSection from "./sections/tabs";
import breadcrumbSection from "./sections/breadcrumb";
import paginationSection from "./sections/pagination";
import navigationMenuSection from "./sections/navigation-menu";
import menubarSection from "./sections/menubar";
import sidebarSection from "./sections/sidebar";
import dialogSection from "./sections/dialog";
import alertDialogSection from "./sections/alert-dialog";
import sheetSection from "./sections/sheet";
import drawerSection from "./sections/drawer";
import popoverSection from "./sections/popover";
import hoverCardSection from "./sections/hover-card";
import tooltipSection from "./sections/tooltip";
import dropdownMenuSection from "./sections/dropdown-menu";
import contextMenuSection from "./sections/context-menu";
import commandSection from "./sections/command";
import alertSection from "./sections/alert";
import sonnerSection from "./sections/sonner";
import progressSection from "./sections/progress";
import spinnerSection from "./sections/spinner";
import skeletonSection from "./sections/skeleton";
import emptySection from "./sections/empty";
import badgeSection from "./sections/badge";
import cardSection from "./sections/card";
import itemSection from "./sections/item";
import tableSection from "./sections/table";
import chartSection from "./sections/chart";
import avatarSection from "./sections/avatar";
import carouselSection from "./sections/carousel";
import accordionSection from "./sections/accordion";
import collapsibleSection from "./sections/collapsible";
import separatorSection from "./sections/separator";
import scrollAreaSection from "./sections/scroll-area";
import resizableSection from "./sections/resizable";
import aspectRatioSection from "./sections/aspect-ratio";
import directionSection from "./sections/direction";
import messageSection from "./sections/message";
import bubbleSection from "./sections/bubble";
import messageScrollerSection from "./sections/message-scroller";
import attachmentSection from "./sections/attachment";
import questionnaireSection from "./sections/questionnaire";
import markerSection from "./sections/marker";
import traceSection from "./sections/trace";
import codeBlockSection from "./sections/code-block";

export type CatalogEntry = {
  id: string;
  name: string;
  group: string;
  description: string;
  Section: ComponentType;
};

/** La única lista del showcase: de ella salen el índice y las secciones. El orden es el del índice. */
export const catalog: CatalogEntry[] = [
  { id: "button", name: "Botón", group: "Acciones", description: "Dispara una acción: seis variantes y ocho tamaños.", Section: buttonSection },
  { id: "button-group", name: "Grupo de botones", group: "Acciones", description: "Une botones, texto y menús en una sola pieza.", Section: buttonGroupSection },
  { id: "toggle", name: "Interruptor de pulsación", group: "Acciones", description: "Botón con estado pulsado o no pulsado.", Section: toggleSection },
  { id: "toggle-group", name: "Grupo de interruptores", group: "Acciones", description: "Conjunto de toggles de selección única o múltiple.", Section: toggleGroupSection },
  { id: "kbd", name: "Tecla", group: "Acciones", description: "Muestra una tecla o un atajo de teclado.", Section: kbdSection },
  { id: "field", name: "Campo", group: "Formularios", description: "Etiqueta, control, descripción y error de un campo de formulario.", Section: fieldSection },
  { id: "label", name: "Etiqueta", group: "Formularios", description: "Texto asociado a un control, con su estado deshabilitado.", Section: labelSection },
  { id: "input", name: "Campo de texto", group: "Formularios", description: "Entrada de una línea con sus tipos nativos.", Section: inputSection },
  { id: "input-group", name: "Grupo de entrada", group: "Formularios", description: "Campo con complementos al inicio, al final o en bloque.", Section: inputGroupSection },
  { id: "input-otp", name: "Código de un solo uso", group: "Formularios", description: "Entrada de código en casillas separadas.", Section: inputOtpSection },
  { id: "textarea", name: "Área de texto", group: "Formularios", description: "Entrada de varias líneas.", Section: textareaSection },
  { id: "checkbox", name: "Casilla", group: "Formularios", description: "Marca o desmarca una opción, con estado indeterminado.", Section: checkboxSection },
  { id: "radio-group", name: "Grupo de opciones", group: "Formularios", description: "Elige una opción entre varias.", Section: radioGroupSection },
  { id: "switch", name: "Interruptor", group: "Formularios", description: "Activa o desactiva un ajuste al instante.", Section: switchSection },
  { id: "slider", name: "Deslizador", group: "Formularios", description: "Elige un valor o un rango arrastrando.", Section: sliderSection },
  { id: "select", name: "Selector", group: "Formularios", description: "Lista desplegable personalizada de opciones.", Section: selectSection },
  { id: "native-select", name: "Selector nativo", group: "Formularios", description: "El select del navegador con el aspecto de la app.", Section: nativeSelectSection },
  { id: "combobox", name: "Combobox", group: "Formularios", description: "Campo con búsqueda y lista de opciones, simple o múltiple.", Section: comboboxSection },
  { id: "calendar", name: "Calendario", group: "Formularios", description: "Elige un día o un rango de fechas.", Section: calendarSection },
  { id: "tabs", name: "Pestañas", group: "Navegación", description: "Cambia entre vistas de un mismo contenido.", Section: tabsSection },
  { id: "breadcrumb", name: "Migas de pan", group: "Navegación", description: "Muestra la ruta hasta la página actual.", Section: breadcrumbSection },
  { id: "pagination", name: "Paginación", group: "Navegación", description: "Navega entre páginas de resultados.", Section: paginationSection },
  { id: "navigation-menu", name: "Menú de navegación", group: "Navegación", description: "Enlaces de primer nivel con contenido desplegable.", Section: navigationMenuSection },
  { id: "menubar", name: "Barra de menús", group: "Navegación", description: "Menús de aplicación en una barra horizontal.", Section: menubarSection },
  { id: "sidebar", name: "Barra lateral", group: "Navegación", description: "Navegación lateral que se contrae a iconos.", Section: sidebarSection },
  { id: "dialog", name: "Diálogo", group: "Superposiciones y menús", description: "Ventana modal para una tarea corta.", Section: dialogSection },
  { id: "alert-dialog", name: "Diálogo de confirmación", group: "Superposiciones y menús", description: "Modal que exige confirmar o cancelar una acción.", Section: alertDialogSection },
  { id: "sheet", name: "Panel lateral", group: "Superposiciones y menús", description: "Panel que entra desde un borde de la ventana.", Section: sheetSection },
  { id: "drawer", name: "Cajón", group: "Superposiciones y menús", description: "Panel que se arrastra para cerrarlo.", Section: drawerSection },
  { id: "popover", name: "Popover", group: "Superposiciones y menús", description: "Contenido flotante anclado a un botón.", Section: popoverSection },
  { id: "hover-card", name: "Tarjeta al pasar el ratón", group: "Superposiciones y menús", description: "Vista previa que aparece al apuntar o enfocar.", Section: hoverCardSection },
  { id: "tooltip", name: "Pista", group: "Superposiciones y menús", description: "Texto breve que explica un control.", Section: tooltipSection },
  { id: "dropdown-menu", name: "Menú desplegable", group: "Superposiciones y menús", description: "Lista de acciones que se abre desde un botón.", Section: dropdownMenuSection },
  { id: "context-menu", name: "Menú contextual", group: "Superposiciones y menús", description: "Lista de acciones que se abre con el clic derecho.", Section: contextMenuSection },
  { id: "command", name: "Paleta de comandos", group: "Superposiciones y menús", description: "Búsqueda de órdenes con lista filtrable.", Section: commandSection },
  { id: "alert", name: "Alerta", group: "Estado y avisos", description: "Mensaje destacado dentro de la página.", Section: alertSection },
  { id: "sonner", name: "Avisos emergentes", group: "Estado y avisos", description: "Notificaciones temporales (toast).", Section: sonnerSection },
  { id: "progress", name: "Progreso", group: "Estado y avisos", description: "Barra de avance de una tarea.", Section: progressSection },
  { id: "spinner", name: "Indicador de carga", group: "Estado y avisos", description: "Rueda que indica que algo está en curso.", Section: spinnerSection },
  { id: "skeleton", name: "Esqueleto", group: "Estado y avisos", description: "Marcador de posición mientras carga el contenido.", Section: skeletonSection },
  { id: "empty", name: "Estado vacío", group: "Estado y avisos", description: "Mensaje cuando no hay nada que mostrar.", Section: emptySection },
  { id: "badge", name: "Etiqueta", group: "Estado y avisos", description: "Marca corta de estado o categoría.", Section: badgeSection },
  { id: "card", name: "Tarjeta", group: "Datos y contenido", description: "Contenedor con cabecera, contenido y pie.", Section: cardSection },
  { id: "item", name: "Elemento de lista", group: "Datos y contenido", description: "Fila con icono, título, descripción y acciones.", Section: itemSection },
  { id: "table", name: "Tabla", group: "Datos y contenido", description: "Datos en filas y columnas.", Section: tableSection },
  { id: "chart", name: "Gráfico", group: "Datos y contenido", description: "Gráficos de barras y líneas con el tema de la app.", Section: chartSection },
  { id: "avatar", name: "Avatar", group: "Datos y contenido", description: "Imagen o iniciales de una persona o perfil.", Section: avatarSection },
  { id: "carousel", name: "Carrusel", group: "Datos y contenido", description: "Desplaza varios bloques en horizontal o vertical.", Section: carouselSection },
  { id: "accordion", name: "Acordeón", group: "Datos y contenido", description: "Secciones que se despliegan una a una o varias.", Section: accordionSection },
  { id: "collapsible", name: "Plegable", group: "Datos y contenido", description: "Muestra u oculta un bloque de contenido.", Section: collapsibleSection },
  { id: "separator", name: "Separador", group: "Disposición", description: "Línea que divide contenido.", Section: separatorSection },
  { id: "scroll-area", name: "Área con scroll", group: "Disposición", description: "Zona desplazable con barras propias.", Section: scrollAreaSection },
  { id: "resizable", name: "Paneles redimensionables", group: "Disposición", description: "Paneles cuyo tamaño se ajusta arrastrando.", Section: resizableSection },
  { id: "aspect-ratio", name: "Relación de aspecto", group: "Disposición", description: "Mantiene una proporción fija.", Section: aspectRatioSection },
  { id: "direction", name: "Dirección", group: "Disposición", description: "Proveedor de dirección de lectura (izquierda a derecha o al revés).", Section: directionSection },
  { id: "message", name: "Mensaje", group: "Conversación", description: "Una intervención de una conversación, con avatar y pie.", Section: messageSection },
  { id: "bubble", name: "Burbuja", group: "Conversación", description: "Globo de texto con siete variantes.", Section: bubbleSection },
  { id: "message-scroller", name: "Desplazador de mensajes", group: "Conversación", description: "Lista de mensajes que se ancla al final.", Section: messageScrollerSection },
  { id: "attachment", name: "Adjunto", group: "Conversación", description: "Archivo adjunto con su estado de carga.", Section: attachmentSection },
  { id: "questionnaire", name: "Cuestionario", group: "Conversación", description: "Preguntas paso a paso con opciones o texto.", Section: questionnaireSection },
  { id: "marker", name: "Marcador", group: "Conversación", description: "Divisor con texto dentro de una conversación.", Section: markerSection },
  { id: "trace", name: "Traza", group: "Conversación", description: "Pasos de una tarea con su estado.", Section: traceSection },
  { id: "code-block", name: "Bloque de código", group: "Conversación", description: "Código con cabecera, numeración y botón de copiar.", Section: codeBlockSection },
];

export const groups: string[] = [...new Set(catalog.map((entry) => entry.group))];
