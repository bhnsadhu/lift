import Nav from "@/components/Nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </>
  );
}
