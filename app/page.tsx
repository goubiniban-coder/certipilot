import { Vitrine } from "@/components/vitrine/vitrine";
import { APP_NAME } from "@/lib/constants";

export default function HomePage() {
  return <Vitrine name={APP_NAME} />;
}
