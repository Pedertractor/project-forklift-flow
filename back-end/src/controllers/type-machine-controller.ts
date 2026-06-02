import type { MultipartFile } from "@fastify/multipart";
import type { FastifyRequest, RouteHandlerMethod } from "fastify";
import { UPLOAD_ROOT_ABSOLUTE } from "../constants/upload-paths.js";
import {
  InvalidTypeMachineImageError,
  TypeMachineInUseError,
  TypeMachineNotFoundError,
} from "../errors/domain-errors.js";
import {
  createTypeMachine,
  deleteTypeMachine,
  getTypeMachineById,
  listTypeMachines,
  updateTypeMachine,
} from "../services/type-machine-service.js";
import { saveTypeMachineImageFile } from "../utils/type-machine-image-upload.js";

/**
 * Descarta o stream de um arquivo multipart desconhecido.
 * Com busboy, o corpo só avança depois que cada stream de arquivo é consumido.
 */
async function drainMultipartFileStream(
  stream: MultipartFile["file"],
): Promise<void> {
  for await (const _chunk of stream) {
    /* descartar */
  }
}

async function readMultipartTypeMachineFields(
  request: FastifyRequest,
): Promise<{
  name?: string;
  urlImage?: string;
  /** Preenchido quando o campo `image` foi salvo ainda dentro do loop `parts()`. */
  savedImagePath?: string;
}> {
  const out: {
    name?: string;
    urlImage?: string;
    savedImagePath?: string;
  } = {};
  for await (const part of request.parts()) {
    if (part.type === "field") {
      if (part.fieldname === "name") {
        out.name = String(part.value ?? "");
      } else if (part.fieldname === "urlImage") {
        out.urlImage = String(part.value ?? "");
      }
    } else if (part.type === "file" && part.fieldname === "image") {
      out.savedImagePath = await saveTypeMachineImageFile(
        UPLOAD_ROOT_ABSOLUTE,
        part,
      );
    } else if (part.type === "file") {
      await drainMultipartFileStream(part.file).catch(() => {});
    }
  }
  return out;
}

export const postCreateTypeMachine: RouteHandlerMethod = async (
  request,
  reply,
) => {
  if (request.isMultipart()) {
    let savedImagePath: string | undefined;
    let rawName: string | undefined;
    let rawUrl: string | undefined;
    try {
      const parsed = await readMultipartTypeMachineFields(request);
      rawName = parsed.name;
      rawUrl = parsed.urlImage;
      savedImagePath = parsed.savedImagePath;
    } catch (error) {
      if (error instanceof InvalidTypeMachineImageError) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }

    const name = rawName?.trim() ?? "";
    if (name === "") {
      return reply
        .status(400)
        .send({ error: "Informe name (texto nao vazio)." });
    }

    let urlImage: string;
    if (savedImagePath) {
      urlImage = savedImagePath;
    } else {
      const u = rawUrl?.trim() ?? "";
      if (u === "") {
        return reply
          .status(400)
          .send({
            error: "Envie o arquivo image (campo image) ou urlImage (texto).",
          });
      }
      urlImage = u;
    }

    const row = await createTypeMachine({ name, urlImage });
    return reply.status(201).send({
      id: row.id,
      name: row.name,
      urlImage: row.urlImage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  const { name, urlImage } = (request.body ?? {}) as {
    name?: string;
    urlImage?: string;
  };
  if (typeof name !== "string" || name.trim() === "") {
    return reply.status(400).send({ error: "Informe name (texto nao vazio)." });
  }
  if (typeof urlImage !== "string" || urlImage.trim() === "") {
    return reply
      .status(400)
      .send({ error: "Informe urlImage (texto nao vazio)." });
  }

  const row = await createTypeMachine({ name, urlImage });
  return reply.status(201).send({
    id: row.id,
    name: row.name,
    urlImage: row.urlImage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
};

export const getListTypeMachines: RouteHandlerMethod = async (
  _request,
  reply,
) => {
  const types = await listTypeMachines();
  return reply.send({ typeMachines: types });
};

export const getTypeMachineByIdHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { typeMachineId } = request.params as { typeMachineId?: string };
  if (!typeMachineId) {
    return reply.status(400).send({ error: "typeMachineId invalido." });
  }
  try {
    const row = await getTypeMachineById(typeMachineId);
    return reply.send({
      id: row.id,
      name: row.name,
      urlImage: row.urlImage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    if (error instanceof TypeMachineNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    throw error;
  }
};

export const patchUpdateTypeMachine: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { typeMachineId } = request.params as { typeMachineId?: string };
  if (!typeMachineId) {
    return reply.status(400).send({ error: "typeMachineId invalido." });
  }

  if (request.isMultipart()) {
    let savedImagePath: string | undefined;
    let rawName: string | undefined;
    let rawUrl: string | undefined;
    try {
      const parsed = await readMultipartTypeMachineFields(request);
      rawName = parsed.name;
      rawUrl = parsed.urlImage;
      savedImagePath = parsed.savedImagePath;
    } catch (error) {
      if (error instanceof InvalidTypeMachineImageError) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }

    let name: string | undefined;
    if (rawName !== undefined) {
      const t = String(rawName).trim();
      if (t === "") {
        return reply.status(400).send({ error: "name nao pode ser vazio." });
      }
      name = t;
    }

    let urlImage: string | undefined;
    if (savedImagePath) {
      urlImage = savedImagePath;
    } else if (rawUrl !== undefined) {
      const t = String(rawUrl).trim();
      if (t === "") {
        return reply
          .status(400)
          .send({ error: "urlImage nao pode ser vazio." });
      }
      urlImage = t;
    }

    if (name === undefined && urlImage === undefined) {
      return reply
        .status(400)
        .send({ error: "Envie ao menos um campo: name, urlImage ou image." });
    }

    try {
      const row = await updateTypeMachine(typeMachineId, {
        ...(name !== undefined ? { name } : {}),
        ...(urlImage !== undefined ? { urlImage } : {}),
      });
      return reply.send({
        id: row.id,
        name: row.name,
        urlImage: row.urlImage,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    } catch (error) {
      if (error instanceof TypeMachineNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  }

  const body = (request.body ?? {}) as { name?: string; urlImage?: string };
  const hasName = typeof body.name === "string";
  const hasUrl = typeof body.urlImage === "string";
  if (!hasName && !hasUrl) {
    return reply
      .status(400)
      .send({ error: "Envie ao menos um campo: name ou urlImage." });
  }
  if (hasName && body.name!.trim() === "") {
    return reply.status(400).send({ error: "name nao pode ser vazio." });
  }
  if (hasUrl && body.urlImage!.trim() === "") {
    return reply.status(400).send({ error: "urlImage nao pode ser vazio." });
  }

  try {
    const row = await updateTypeMachine(typeMachineId, {
      ...(hasName ? { name: body.name } : {}),
      ...(hasUrl ? { urlImage: body.urlImage } : {}),
    });
    return reply.send({
      id: row.id,
      name: row.name,
      urlImage: row.urlImage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    if (error instanceof TypeMachineNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    throw error;
  }
};

export const deleteTypeMachineHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { typeMachineId } = request.params as { typeMachineId?: string };
  if (!typeMachineId) {
    return reply.status(400).send({ error: "typeMachineId invalido." });
  }
  try {
    await deleteTypeMachine(typeMachineId);
    return reply.status(204).send();
  } catch (error) {
    if (error instanceof TypeMachineNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof TypeMachineInUseError) {
      return reply.status(409).send({ error: error.message });
    }
    throw error;
  }
};
