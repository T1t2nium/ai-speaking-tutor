export default function SessionLoading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="animate-pulse space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded" />
        <div className="h-20 bg-slate-100 rounded-lg" />
        <div className="h-64 bg-slate-100 rounded-lg" />
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-slate-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}
