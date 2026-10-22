import { DemandesProvider } from "@/components/demandes/demandes-provider";

export default function DemandesLayout({ children }: LayoutProps<"/demandes">) {
  return (
    <DemandesProvider>
      <div className="mx-auto flex min-h-screen max-w-[1320px] flex-col gap-[clamp(12px,2vw,20px)] p-[clamp(10px,2.4vw,24px)]">
        {children}
      </div>
    </DemandesProvider>
  );
}
