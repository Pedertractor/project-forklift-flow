import type { MultipartFile } from '@fastify/multipart'
import { randomUUID } from 'crypto'
import { createWriteStream } from 'fs'
import { mkdir, unlink } from 'fs/promises'
import path from 'path'
import { pipeline } from 'stream/promises'
import { InvalidTypeMachineImageError } from '../errors/domain-errors.js'

const TYPE_MACHINE_SUBDIR = 'type-machines'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
}

export function publicPathForTypeMachineFile(filename: string): string {
  return `/uploads/${TYPE_MACHINE_SUBDIR}/${filename}`
}

export async function saveTypeMachineImageFile(
  uploadRootAbsolute: string,
  file: MultipartFile,
): Promise<string> {
  const ext = MIME_TO_EXT[file.mimetype.toLowerCase()]
  if (!ext) {
    throw new InvalidTypeMachineImageError()
  }

  const dir = path.join(uploadRootAbsolute, TYPE_MACHINE_SUBDIR)
  await mkdir(dir, { recursive: true })

  const filename = `${randomUUID()}${ext}`
  const filepath = path.join(dir, filename)

  await pipeline(file.file, createWriteStream(filepath))

  return publicPathForTypeMachineFile(filename)
}

export async function removeStoredTypeMachineImageIfLocal(
  uploadRootAbsolute: string,
  urlImage: string,
): Promise<void> {
  const prefix = `/uploads/${TYPE_MACHINE_SUBDIR}/`
  if (!urlImage.startsWith(prefix)) {
    return
  }
  const filename = urlImage.slice(prefix.length)
  if (filename.length === 0 || /[/\\]/.test(filename) || filename.includes('..')) {
    return
  }
  const filepath = path.join(uploadRootAbsolute, TYPE_MACHINE_SUBDIR, filename)
  await unlink(filepath).catch(() => {})
}
