import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let configured = false

export function configureMaps() {
  if (configured) return
  configured = true
  setOptions({ key: import.meta.env.VITE_MAPS_KEY, version: 'weekly' })
}

export { importLibrary }
