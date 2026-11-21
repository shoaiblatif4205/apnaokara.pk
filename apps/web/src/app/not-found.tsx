// Fallback for URLs outside /en and /ur (the middleware normally redirects them).
export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '80px 16px' }}>
        <h1>404</h1>
        <a href="/en">Apna Okara</a>
      </body>
    </html>
  );
}
