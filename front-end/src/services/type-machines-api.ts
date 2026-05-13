import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type { TypeMachine } from '@/types/machine.types';

export async function fetchTypeMachines(): Promise<TypeMachine[]> {
  const res = await apiAuthFetch<{ typeMachines: TypeMachine[] }>(API_ENDPOINTS.TYPE_MACHINES.LIST, {
    method: 'GET',
  });
  return res?.typeMachines ?? [];
}

export async function fetchTypeMachineById(id: string): Promise<TypeMachine> {
  const res = await apiAuthFetch<TypeMachine>(API_ENDPOINTS.TYPE_MACHINES.BY_ID(id), {
    method: 'GET',
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function createTypeMachineJson(input: { name: string; urlImage: string }): Promise<TypeMachine> {
  const res = await apiAuthFetch<TypeMachine>(API_ENDPOINTS.TYPE_MACHINES.LIST, {
    method: 'POST',
    body: JSON.stringify({ name: input.name.trim(), urlImage: input.urlImage.trim() }),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function createTypeMachineMultipart(form: FormData): Promise<TypeMachine> {
  const res = await apiAuthFetch<TypeMachine>(API_ENDPOINTS.TYPE_MACHINES.LIST, {
    method: 'POST',
    body: form,
    skipJsonContentType: true,
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function updateTypeMachineJson(
  id: string,
  patch: { name?: string; urlImage?: string },
): Promise<TypeMachine> {
  const res = await apiAuthFetch<TypeMachine>(API_ENDPOINTS.TYPE_MACHINES.BY_ID(id), {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function updateTypeMachineMultipart(id: string, form: FormData): Promise<TypeMachine> {
  const res = await apiAuthFetch<TypeMachine>(API_ENDPOINTS.TYPE_MACHINES.BY_ID(id), {
    method: 'PATCH',
    body: form,
    skipJsonContentType: true,
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function deleteTypeMachine(id: string): Promise<void> {
  await apiAuthFetch(API_ENDPOINTS.TYPE_MACHINES.BY_ID(id), { method: 'DELETE' });
}
