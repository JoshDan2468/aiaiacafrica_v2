export function BrandingSection() {
  return (
    <aside className="admin-auth__brand" aria-labelledby="admin-brand-heading">
      <div className="admin-auth__brand-copy">
        <p className="admin-auth__eyebrow">
          <span aria-hidden="true" />
          AIAIAC Africa 2027
        </p>
        <h2 id="admin-brand-heading">Conference Administration Platform</h2>
        <p>
          Manage registrations, payments, sponsors, exhibitors, abstracts, communications and event
          operations from one secure workspace.
        </p>
      </div>

      <div className="admin-auth__brand-rule" aria-hidden="true">
        <span />
      </div>
    </aside>
  );
}
