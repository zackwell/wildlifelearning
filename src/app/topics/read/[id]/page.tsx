import { LiteratureReadClient } from "@/components/topics/LiteratureReadClient";

type Props = { params: Promise<{ id: string }> };

export default async function LiteratureReadPage(props: Props) {
  const { id } = await props.params;
  return <LiteratureReadClient id={id} />;
}
