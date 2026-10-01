# ¡ACCIÓN! — Mundo 1 · La Escuela de Interpretación

Un plataformas satírico de un solo botón sobre lo que tiene que atravesar un artista
para llegar a su estreno. Pintado entero a **pinceladas**: no hay ni una imagen, todo
se pinta en tiempo de carga con un motor de pincel propio (`js/brush.js`) y "hierve"
como una animación hecha a mano.

Este repositorio contiene el **primer mundo completo** (tutorial + jefe) como base
para ver cómo queda la estética y la jugabilidad antes de seguir con el resto.

## Jugar

- Es HTML estático: abre `index.html` en un servidor (o súbelo a GitHub Pages / Netlify / tu web).
- En local: `node serve.js` y abre <http://localhost:8080>.
- **Móvil y ordenador**: tocar la pantalla o barra espaciadora = saltar. Mantener = salto más alto.
  En vertical el juego se muestra en una banda apaisada; en horizontal ocupa toda la pantalla.

## Qué hay en el Mundo 1

Todo lo que define el documento de diseño para la Escuela:

| Sección | Mecánica |
| --- | --- |
| Aprender a saltar | Carteles pintados: *toca para saltar*, *mantén para saltar más alto*. Dos huecos crecientes. |
| Ejercicio de confianza | Compañeros que se dejan caer de espaldas sin avisar: el cuerpo que cae hace daño; tumbado, se salta o se pisa. |
| Calentamiento de voz | La profe grita *¡mi-me-ma-mo-mu!* y las sílabas flotan como plataformas sobre el vacío. |
| El de la Silla | Caballero con coraza sentado en una silla. Tiembla (aviso), grita y lanza una onda que hay que saltar. Si te alcanza te empuja atrás. |
| El Actor de Método | Napoleón, inmóvil: *«Mi personaje no se movería.»* |
| Llorar a la de tres | El profe grita *¡EMOCIÓN!*, la clase llora y las lágrimas inundan el suelo. Se cruza por colchonetas que flotan. |
| Jefe · La Calavera de Hamlet | Lanza su monólogo palabra a palabra: las bajas se saltan, las altas se pasan por debajo. Cuando se queda sin texto, cae. |
| Ascenso | «¡CONTRATADO!» Estudiante → **Actor en formación**, confeti y tarjeta de artista. |

- **Ilusión**: 3 corazones (máximo 5). El café da +1. Game over: *«Has perdido la ilusión. ¿Lo intentas otra vez? (Como siempre.)»*
- **3 claquetas doradas** escondidas (escalera de colchonetas, sobre la sílaba MA, sobre las lágrimas). Se guardan en el navegador.
- Puntos de control: al caer al vacío se vuelve al inicio de la sección perdiendo un corazón.

## El personaje

Enrike, fiel a las fotos de referencia: pelo rizado y revuelto, cejas marcadas, barba de tres
días, camisa blanca de lino remangada con el cuello abierto, cinturón con hebilla, vaqueros
de campana y botas. Lleva la maleta llena de sueños. Se pinta en `js/characters.js`
(`drawEnrike`) con 8 fotogramas de carrera, salto, caída, golpe, reposo y celebración.

## Estructura

```
index.html        página (móvil-ready)
css/style.css
js/brush.js       motor de pinceladas: trazos con cerdas, manchas, hachurado, texto entintado, sprites con "boil"
js/characters.js  reparto y objetos (todo procedural)
js/level1.js      datos del Mundo 1: suelos, plataformas, entidades, carteles, monólogo del jefe
js/game.js        bucle, físicas, entidades, jefe, HUD, pantallas, audio sintetizado
serve.js          servidor estático mínimo para probar en local
```

## Para seguir desarrollando

- Los **mundos** se definen como datos (ver `level1.js`): suelos, plataformas, entidades con coordenadas en píxeles.
- Para un **personaje nuevo**, añade una función de dibujo en `characters.js` y regístrala en `build()`.
- Paleta de cine en `Chars.C` (rojo telón, dorado, negro, papel).
- Consola del navegador (pruebas): `ACCION.teleport(x)`, `ACCION.ghost = true` (sin daño),
  `ACCION.autoplay(90)` (un bot juega el nivel a velocidad de simulación).

El audio es sintetizado (sin archivos). Las tipografías (Caveat y Permanent Marker) se cargan
de Google Fonts; sin conexión el juego usa una cursiva del sistema.
