export function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-lg font-semibold text-brand-700 mb-2">{title}</h1>
      <p className="text-sm text-gray-500">Coming soon.</p>
    </div>
  );
}
