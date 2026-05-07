export default function Loading() {
  return <PageSkeleton />;
}

function PageSkeleton() {
  return (
    <div className="page-skeleton">
      <div className="page-skeleton-spinner" />
    </div>
  );
}
