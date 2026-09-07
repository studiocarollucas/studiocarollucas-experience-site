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

type StorageFileObject = { name: string };

type StorageBucketClient = {
  upload(
    path: string,
    file: File,
    options: { contentType: string; upsert: false }
  ): MutationResult<{ path: string }>;
  remove(paths: string[]): MutationResult<StorageFileObject[]>;
  exists(path: string): MutationResult<boolean>;
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

function missingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error ? error.status : "statusCode" in error ? error.statusCode : null;
  return status === 400 || status === 404 || status === "400" || status === "404";
}

async function removeObjectAndConfirmAbsent(
  bucket: StorageBucketClient,
  path: string
): Promise<void> {
  const issues: unknown[] = [];
  try {
    const removed = await bucket.remove([path]);
    if (removed.error) issues.push(removed.error);
    if (!removed.data?.some((item) => item.name === path)) {
      issues.push(new Error("storage remove result did not include the requested path"));
    }
  } catch (error) {
    issues.push(error);
  }

  try {
    const existence = await bucket.exists(path);
    if (existence.data === false && (!existence.error || missingObjectError(existence.error)))
      return;
    if (existence.error) issues.push(existence.error);
    issues.push(
      new Error(
        existence.data === true ? "storage object still exists" : "storage absence inconclusive"
      )
    );
  } catch (error) {
    issues.push(error);
  }

  throw new AggregateError(issues, "styling object cleanup could not confirm absence");
}

async function compensateInsertFailure(
  bucket: StorageBucketClient,
  path: string,
  originalCause: unknown
): Promise<never> {
  try {
    await removeObjectAndConfirmAbsent(bucket, path);
  } catch (cleanupCause) {
    throw new Error("Não foi possível salvar esta referência.", {
      cause: new AggregateError(
        [originalCause, cleanupCause],
        "styling metadata insert and object compensation failed"
      ),
    });
  }
  throw new Error("Não foi possível salvar esta referência.", { cause: originalCause });
}

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

  let inserted: { data: StylingReferenceRow | null; error: unknown };
  try {
    inserted = await supabase
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
  } catch (error) {
    return compensateInsertFailure(bucket, path, error);
  }

  if (inserted.error || !inserted.data) {
    return compensateInsertFailure(
      bucket,
      path,
      inserted.error ?? new Error("styling reference insert returned no data")
    );
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

  try {
    await removeObjectAndConfirmAbsent(
      supabase.storage.from(STYLING_BUCKET),
      deleted.data.storage_path
    );
  } catch (error) {
    throw new Error("Não foi possível concluir a remoção desta referência.", { cause: error });
  }
}
