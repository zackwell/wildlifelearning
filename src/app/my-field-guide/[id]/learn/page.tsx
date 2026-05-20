import { FieldGuideLearnClient } from "@/components/field-guide/FieldGuideLearnClient";

type Props = { params: Promise<{ id: string }> };

export default async function FieldGuideLearnPage(props: Props) {
  const { id } = await props.params;
  return <FieldGuideLearnClient id={id} />;
}
