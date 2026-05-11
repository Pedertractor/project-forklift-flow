import type { TypeMachineModel } from '../generated/prisma/models/TypeMachine.js'
import { UPLOAD_ROOT_ABSOLUTE } from '../constants/upload-paths.js'
import {
  TypeMachineInUseError,
  TypeMachineNotFoundError,
} from '../errors/domain-errors.js'
import { typeMachineRepository } from '../repositories/type-machine.repository.js'
import { removeStoredTypeMachineImageIfLocal } from '../utils/type-machine-image-upload.js'

export type CreateTypeMachineInput = {
  name: string
  urlImage: string
}

export type UpdateTypeMachineInput = {
  name?: string
  urlImage?: string
}

async function requireTypeMachineById(id: string): Promise<TypeMachineModel> {
  const row = await typeMachineRepository.findUniqueById(id)
  if (!row) {
    throw new TypeMachineNotFoundError()
  }
  return row
}

export async function createTypeMachine(input: CreateTypeMachineInput) {
  return typeMachineRepository.create({
    name: input.name.trim(),
    urlImage: input.urlImage.trim(),
  })
}

export async function listTypeMachines() {
  return typeMachineRepository.findManyForList()
}

export async function getTypeMachineById(id: string) {
  return requireTypeMachineById(id)
}

export async function updateTypeMachine(id: string, input: UpdateTypeMachineInput) {
  const previous = await requireTypeMachineById(id)
  const data: {
    name?: string
    urlImage?: string
  } = {}
  if (input.name !== undefined) {
    data.name = input.name.trim()
  }
  if (input.urlImage !== undefined) {
    data.urlImage = input.urlImage.trim()
  }
  const updated = await typeMachineRepository.update(id, data)
  if (input.urlImage !== undefined && input.urlImage !== previous.urlImage) {
    await removeStoredTypeMachineImageIfLocal(UPLOAD_ROOT_ABSOLUTE, previous.urlImage)
  }
  return updated
}

export async function deleteTypeMachine(id: string) {
  const row = await requireTypeMachineById(id)
  const linked = await typeMachineRepository.countMachinesByTypeId(id)
  if (linked > 0) {
    throw new TypeMachineInUseError()
  }
  await typeMachineRepository.delete(id)
  await removeStoredTypeMachineImageIfLocal(UPLOAD_ROOT_ABSOLUTE, row.urlImage)
}
