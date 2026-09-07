import { describe, expect, it, vi } from "vitest";
import {
  deleteStylingReference,
  uploadStylingReference,
  type StylingMutationClient,
} from "@/domain/styling/client";
import { STYLING_BUCKET } from "@/domain/styling/schema";

const SHOOT_ID = "00000000-0000-4000-8000-000000000011";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const REFERENCE_ID = "00000000-0000-4000-8000-000000000021";

type FakeOptions = {
  uploadError?: unknown;
  insertError?: unknown;
  insertedData?: Record<string, unknown> | null;
  deleteError?: unknown;
  deletedData?: { storage_path: string } | null;
  removeError?: unknown;
};

function createMutationFixture(options: FakeOptions = {}) {
  const upload = vi
    .fn<
      (
        path: string,
        file: File,
        uploadOptions: object
      ) => Promise<{ data: { path: string } | null; error: unknown }>
    >()
    .mockImplementation(async () => ({
      data: options.uploadError ? null : { path: "uploaded" },
      error: options.uploadError ?? null,
    }));
  const remove = vi
    .fn<(paths: string[]) => Promise<{ data: never[] | null; error: unknown }>>()
    .mockImplementation(async () => ({
      data: options.removeError ? null : [],
      error: options.removeError ?? null,
    }));
  const insertSingle = vi.fn(async () => ({
    data:
      options.insertedData === undefined
        ? {
            id: REFERENCE_ID,
            shoot_id: SHOOT_ID,
            storage_path: `${USER_ID}/${SHOOT_ID}/generated.webp`,
            caption: "Retrato leve",
            origin: "client",
            uploaded_by_auth_user_id: USER_ID,
            created_at: "2026-09-07T12:00:00Z",
          }
        : options.insertedData,
    error: options.insertError ?? null,
  }));
  const insertSelect = vi.fn(() => ({ single: insertSingle }));
  const insert = vi
    .fn<(values: Record<string, unknown>) => { select: typeof insertSelect }>()
    .mockImplementation(() => ({ select: insertSelect }));
  const deleteSingle = vi.fn(async () => ({
    data:
      options.deletedData === undefined
        ? { storage_path: `${USER_ID}/${SHOOT_ID}/generated.webp` }
        : options.deletedData,
    error: options.deleteError ?? null,
  }));
  const deleteSelect = vi.fn(() => ({ single: deleteSingle }));
  const eq = vi
    .fn<
      (
        column: string,
        value: string
      ) => {
        select: typeof deleteSelect;
      }
    >()
    .mockImplementation(() => ({ select: deleteSelect }));
  const deleteRow = vi.fn(() => ({ eq }));
  const fromTable = vi.fn(() => ({ insert, delete: deleteRow }));
  const fromBucket = vi.fn(() => ({ upload, remove }));
  const client = {
    from: fromTable,
    storage: { from: fromBucket },
  } as unknown as StylingMutationClient;

  return {
    client,
    upload,
    remove,
    insert,
    insertSelect,
    deleteRow,
    eq,
    deleteSelect,
    fromBucket,
  };
}

function validFile() {
  return new File([new Uint8Array([0x52, 0x49, 0x46, 0x46])], "nome-original.png", {
    type: "image/webp",
  });
}

describe("styling browser mutations", () => {
  it("rejects unsupported files before touching Storage", async () => {
    const fixture = createMutationFixture();

    await expect(
      uploadStylingReference(fixture.client, {
        file: new File(["x"], "ref.gif", { type: "image/gif" }),
        shootId: SHOOT_ID,
        authUserId: USER_ID,
        caption: "Teste",
        origin: "client",
        currentCount: 0,
      })
    ).rejects.toThrow("JPG, PNG ou WebP");

    expect(fixture.upload).not.toHaveBeenCalled();
  });

  it("rejects the local 20-reference limit before touching Storage", async () => {
    const fixture = createMutationFixture();

    await expect(
      uploadStylingReference(fixture.client, {
        file: validFile(),
        shootId: SHOOT_ID,
        authUserId: USER_ID,
        caption: "Teste",
        origin: "client",
        currentCount: 20,
      })
    ).rejects.toThrow("20 referências");

    expect(fixture.upload).not.toHaveBeenCalled();
  });

  it("uses a canonical MIME-derived path and inserts no public URL", async () => {
    const fixture = createMutationFixture();

    await uploadStylingReference(fixture.client, {
      file: validFile(),
      shootId: SHOOT_ID,
      authUserId: USER_ID,
      caption: "  Retrato leve  ",
      origin: "client",
      currentCount: 2,
    });

    expect(fixture.fromBucket).toHaveBeenCalledWith(STYLING_BUCKET);
    const [createdPath, uploadedFile, uploadOptions] = fixture.upload.mock.calls[0];
    expect(createdPath).toMatch(new RegExp(`^${USER_ID}/${SHOOT_ID}/[0-9a-f-]{36}\\.webp$`, "i"));
    expect(createdPath).not.toContain("nome-original");
    expect(uploadedFile).toBeInstanceOf(File);
    expect(uploadOptions).toEqual({ contentType: "image/webp", upsert: false });
    expect(fixture.insert).toHaveBeenCalledWith({
      shoot_id: SHOOT_ID,
      storage_path: createdPath,
      caption: "Retrato leve",
      origin: "client",
      uploaded_by_auth_user_id: USER_ID,
    });
    expect(JSON.stringify(fixture.insert.mock.calls[0]?.[0])).not.toMatch(/public.*url/i);
  });

  it("compensates the object exactly once when the metadata insert fails", async () => {
    const fixture = createMutationFixture({ insertError: new Error("raw row failure") });

    await expect(
      uploadStylingReference(fixture.client, {
        file: validFile(),
        shootId: SHOOT_ID,
        authUserId: USER_ID,
        caption: "Teste",
        origin: "client",
        currentCount: 0,
      })
    ).rejects.toThrow("Não foi possível salvar esta referência.");

    const createdPath = fixture.upload.mock.calls[0]?.[0];
    expect(fixture.remove).toHaveBeenCalledOnce();
    expect(fixture.remove).toHaveBeenCalledWith([createdPath]);
  });

  it("keeps a raw Storage upload error only as an internal cause", async () => {
    const rawError = new Error("raw bucket policy details");
    const fixture = createMutationFixture({ uploadError: rawError });

    await expect(
      uploadStylingReference(fixture.client, {
        file: validFile(),
        shootId: SHOOT_ID,
        authUserId: USER_ID,
        caption: "Teste",
        origin: "client",
        currentCount: 0,
      })
    ).rejects.toMatchObject({
      message: "Não foi possível enviar esta referência.",
      cause: rawError,
    });
  });

  it("does not touch Storage when row deletion is denied", async () => {
    const fixture = createMutationFixture({
      deleteError: new Error("permission denied"),
      deletedData: null,
    });

    await expect(deleteStylingReference(fixture.client, REFERENCE_ID)).rejects.toThrow(
      "Não foi possível remover esta referência."
    );

    expect(fixture.remove).not.toHaveBeenCalled();
  });

  it("removes the returned private object only after deleting its row", async () => {
    const fixture = createMutationFixture();

    await deleteStylingReference(fixture.client, REFERENCE_ID);

    expect(fixture.deleteRow).toHaveBeenCalledOnce();
    expect(fixture.eq).toHaveBeenCalledWith("id", REFERENCE_ID);
    expect(fixture.deleteSelect).toHaveBeenCalledWith("storage_path");
    expect(fixture.remove).toHaveBeenCalledWith([`${USER_ID}/${SHOOT_ID}/generated.webp`]);
    expect(fixture.deleteRow.mock.invocationCallOrder[0]).toBeLessThan(
      fixture.remove.mock.invocationCallOrder[0]
    );
  });

  it("reports a neutral error when object cleanup fails after row deletion", async () => {
    const fixture = createMutationFixture({ removeError: new Error("raw storage failure") });

    await expect(deleteStylingReference(fixture.client, REFERENCE_ID)).rejects.toThrow(
      "Não foi possível concluir a remoção desta referência."
    );
  });
});
