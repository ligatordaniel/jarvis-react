# jarvis-vite

Frontend Vite/React para conectar varios backends.

Primera sección creada: **Ocarina · YouTube**, conectada a `ocarina-sprintboot`.

Segunda sección: **Kafra · Archivos**, conectada a `kafra-elysia` por proxy interno `/kafra-api` para login, subida, listado, descarga y borrado de archivos.

## Desarrollo

```bash
npm install
npm run dev
```

Config:

```bash
VITE_OCARINA_API_URL=http://localhost:8081
```

## Stack completo con Kafka

Desde este directorio:

```bash
docker compose up --build
```

Abre:

- Front: http://localhost:5173
- Backend Ocarina: http://localhost:8081

## Cookies YouTube opcionales

Si YouTube responde “Sign in to confirm you’re not a bot”, exporta cookies en formato Netscape como:

`/root/jarvis-vite/cookies/youtube.txt`

El compose ya monta esa carpeta como solo lectura en Ocarina.

## Cómo agregar más backs

1. Crear nueva sección en `src/main.tsx`.
2. Agregar variable `VITE_NOMBRE_API_URL`.
3. Conectar al backend nuevo.
4. Si usa Kafka, agregar servicio/topic en `docker-compose.yml`.
