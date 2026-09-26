import { notFound } from "next/navigation";
import { getUpsellProductById } from "@/domain/upsell/catalog";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { UpsellProductForm } from "@/components/admin/upsell/product-form";
import { DeleteUpsellProductButton } from "@/components/admin/upsell/delete-product-button";

type Params = Promise<{ id: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditUpsellProductPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const product = await getUpsellProductById(id);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Editar — ${product.name}`}
        description="As alterações são registradas. Para tirar o produto das galerias sem apagar histórico, desative-o."
      />
      <Card>
        <UpsellProductForm
          initialValues={{
            id: product.id,
            kind: product.kind,
            name: product.name,
            description: product.description,
            internalNotes: product.internalNotes,
            price: product.price,
            active: product.active,
            sortOrder: product.sortOrder,
          }}
        />
      </Card>
      <DeleteUpsellProductButton productId={product.id} />
    </div>
  );
}
