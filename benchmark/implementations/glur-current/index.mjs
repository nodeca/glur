import { blurRGBA } from 'glur'

export function run (data) {
  return blurRGBA(data.buffer, data.width, data.height, data.radius)
}
