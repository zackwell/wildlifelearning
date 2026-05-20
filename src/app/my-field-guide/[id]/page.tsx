import { FieldGuideDetailClient } from "@/components/field-guide/FieldGuideDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function FieldGuideEntryPage(props: Props) {
  const { id } = await props.params;
  return <FieldGuideDetailClient id={id} />;
}
