# Iso

**Ilustraciones, dioramas y diagramas isométricos, dibujados con líneas finas.**
Un motor SVG con ordenación de profundidad, animación y exportación, y una skill para agentes que enseña
a Claude (o a cualquier agente que lea `SKILL.md`) a planificar, construir, revisar y entregar estas
figuras.

**[Galería y playground](https://vstrofago.github.io/isometric-illustrations/)** · [English](README.md) · Licencia [Apache 2.0](LICENSE)

![Línea de empaquetado: cajas sobre una cinta en L, desde la formadora hasta el camión](docs/img/packing-line.gif)

| | |
|---|---|
| ![Ordenador de escritorio encendiéndose](docs/img/desk-computer.gif) | ![Diagrama de arquitectura con paquetes en tránsito](docs/img/architecture.gif) |
| **Ordenador**: clic para encender (una línea CRT se abre en la imagen) y escribe. | **Arquitectura**: un diagrama a partir de datos: las aristas se dibujan y luego fluyen los paquetes. |

## Empezar

```html
<div id="app"></div>
<script src="https://cdn.jsdelivr.net/gh/vstrofago/isometric-illustrations@v0.1.0/dist/iso.min.js"></script>
<script>
  const s = Iso.scene('#app', { figure: { index: 'Fig. 1', title: 'Hola' } });
  s.platform({ size: [160, 120] });          // la superficie superior es z = 0
  s.laptop({ at: [-10, 0, 0] });             // prefabs: `at` es el centro de la huella
  s.card({ id: 'card', at: [44, 24, 0] });   // el único elemento iluminado
  s.float('card', { amp: 4 });
  s.assemble();                              // entrada escalonada, de atrás hacia delante
</script>
```

También como datos con `Iso.render(spec)`, o como módulo ES: `import Iso from './dist/iso.esm.js'`.

## La skill

`skills/isometric-illustrations/` es una [Agent Skill](https://agentskills.io) autocontenida: `SKILL.md`,
referencias, el motor, plantillas y scripts para crear, renderizar y empaquetar figuras.

**Claude Code**, como marketplace de plugins:

```
/plugin marketplace add vstrofago/isometric-illustrations
/plugin install isometric-illustrations@vstrofago
```

**Copiando la carpeta**: `tools/install-skill.sh` (usuario), `--project <dir>` (proyecto) o
`--dest <dir>` (cualquier agente que cargue carpetas de skills).

**claude.ai**: descarga `isometric-illustrations.zip` de la
[última release](https://github.com/vstrofago/isometric-illustrations/releases) (o `npm run skill:zip`)
y súbelo en la sección de Skills de los ajustes.

Después basta con pedirlo:

> Haz un diagrama isométrico animado de nuestro checkout: web, API, pedidos, Postgres y una cola.

El agente planifica en unidades de mundo, construye con prefabs, renderiza un PNG para comprobar
oclusión y encuadre, y te entrega un único HTML autocontenido (y PNG, GIF o MP4 si lo pides).

## Qué incluye

- **Primitivas**: cajas redondeadas con chaflán, prismas, cilindros, conos, anillos segmentados,
  esferas, paneles, poliedros, texto sobre planos, conectores, cintas, contenido 2D en cualquier cara.
- **Profundidad**: ordenación topológica por ejes separadores; los objetos en movimiento se reordenan en
  cada fotograma.
- **Movimiento**: líneas de tiempo deterministas y presets (`assemble`, `float`, `travel`, `orbit`,
  `pulse`, `blink`, `spin`, `drawOn`, `typewriter`, `hoverLift`); respeta `prefers-reduced-motion`.
- **35 prefabs**: dispositivos, logística (cajas, palés, estanterías, carretilla, camión, cinta,
  escáner), arquitectura, escenario. 34 iconos de línea.
- **Diagramas**: `s.diagram({ nodes, edges, zones })`.
- **Temas**: oscuro, claro, papel, blueprint, terminal o tu paleta con `colors`.
- **Exportación**: SVG y PNG en el navegador; PNG, GIF, MP4 y WebM fotograma a fotograma desde la CLI.

## Ejemplos

```bash
npm install
npm run serve        # http://localhost:8080 → galería, ejemplos y playground
npm test             # tests unitarios y visuales
```

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) (en inglés), sigue el [Código de conducta](CODE_OF_CONDUCT.md) y
reporta vulnerabilidades en privado según [SECURITY.md](SECURITY.md).

## Licencia

[Apache License 2.0](LICENSE). Ver [NOTICE](NOTICE). La licencia no concede derechos sobre la marca de la
estrella pixelada ni sobre los nombres Stoico y vstrofago; usa tu propia marca en tus productos.

El lenguaje visual procede del sistema de diseño Stoico: líneas de 1px, rellenos a un pelo del fondo y
un único elemento iluminado.
