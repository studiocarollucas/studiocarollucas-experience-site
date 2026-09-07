import { MAX_STYLING_REFERENCES, STYLING_BUCKET, validateStylingFile } from "./schema";

type MutationResult<T> = PromiseLike<{ data: T | null; error: unknown }>;

type StylingReferenceRow = {
  id: string;
  shoot_id: string;
  storage_path: string;
  caption: string | null;
  origin: "client" | "studio";
  uploaded_by_auth_user_id: string | null;
  created_at: string;
};

type StorageBucketClient = {
  upload(
    path: string,
    file: File,
    options: { contentType: string; upsert: false }
  ): MutationResult<{ path: string }>;
  remove(paths: string[]): MutationResult<unknown>;
};

type StylingReferenceTableClient = {
  insert(values: {
    shoot_id: string;
    storage_path: string;
    caption: string | null;
    origin: "client" | "studio";
    uploaded_by_auth_user_id: string;
  }): {
    select(columns: string): {
      single(): MutationResult<StylingReferenceRow>;
    };
  };
  delete(): {
    eq(
      column: "id",
      value: string
    ): {
      select(columns: "storage_path"): {
        single(): MutationResult<{ storage_path: string }>;
      };
    };
  };
};

export type StylingMutationClient = {
  storage: { from(bucket: string): StorageBucketClient };
  from(table: "styling_references"): StylingReferenceTableClient;
};

type UploadStylingReferenceInput = {
  file: File;
  shootId: string;
  authUserId: string;
  caption: string;
  origin: "client" | "studio";
  currentCount: number;
};

const EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const REFERENCE_COLUMNS =
  "id,shoot_id,storage_path,caption,origin,uploaded_by_auth_user_id,created_at";

export async function uploadStylingReference(
  supabase: StylingMutationClient,
  input: UploadStylingReferenceInput
): Promise<StylingReferenceRow> {
  if (input.currentCount >= MAX_STYLING_REFERENCES) {
    throw new Error("Este ensaio já possui 20 referências.");
  }

  const validation = validateStylingFile(input.file);
  if (validation) throw new Error(validation);

  const extension = EXTENSION[input.file.type as keyof typeof EXTENSION];
  const path = `${input.authUserId}/${input.shootId}/${crypto.randomUUID()}.${extension}`;
  const bucket = supabase.storage.from(STYLING_BUCKET);
  const upload = await bucket.upload(path, input.file, {
    contentType: input.file.type,
    upsert: false,
  });
  if (upload.error) {
    throw new Error("Não foi possível enviar esta referência.", { cause: upload.error });
  }

  const inserted = await supabase
    .from("styling_references")
    .insert({
      shoot_id: input.shootId,
      storage_path: path,
      caption: input.caption.trim() || null,
      origin: input.origin,
      uploaded_by_auth_user_id: input.authUserId,
    })
    .select(REFERENCE_COLUMNS)
    .single();

  if (inserted.error || !inserted.data) {
    await bucket.remove([path]);
    throw new Error("Não foi possível salvar esta referência.");
  }

  return inserted.data;
}

export async function deleteStylingReference(
  supabase: StylingMutationClient,
  referenceId: string
): Promise<void> {
  const deleted = await supabase
    .from("styling_references")
    .delete()
    .eq("id", referenceId)
    .select("storage_path")
    .single();
  if (deleted.error || !deleted.data) {
    throw new Error("Não foi possível remover esta referência.");
  }

  const removed = await supabase.storage.from(STYLING_BUCKET).remove([deleted.data.storage_path]);
  if (removed.error) {
    throw new Error("Não foi possível concluir a remoção desta referência.");
  }
}
