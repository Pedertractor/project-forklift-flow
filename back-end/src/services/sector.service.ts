import { sectorRepository } from '../repositories/sector.repository.js'

export async function listSectors() {
  return sectorRepository.findManyForList()
}
