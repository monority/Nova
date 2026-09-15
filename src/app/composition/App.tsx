import './app.css'

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <span className="brand-mark">N</span>
        <div>
          <strong>NOVA</strong>
          <small>EMERGENCE PROTOCOL</small>
        </div>
      </header>
      <section className="app-empty-state" aria-labelledby="app-title">
        <p className="eyebrow">FOUNDATION / READY</p>
        <h1 id="app-title">The city begins here.</h1>
        <p>The application shell is ready. Domain, application, engine, rendering and UI boundaries are in place.</p>
      </section>
    </main>
  )
}
